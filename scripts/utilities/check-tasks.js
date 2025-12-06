#!/usr/bin/env node
/**
 * Task Queue Management Script
 *
 * Usage:
 *   node check-tasks.js              - Show status
 *   node check-tasks.js --fix        - Mark stale in_progress as failed
 *   node check-tasks.js --retry      - Reset failed tasks to pending
 *   node check-tasks.js --clean      - Delete old completed tasks (30+ days)
 *   node check-tasks.js --process    - Manually process one pending task
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://qcvfxxsnqvdfmpbcgdni.supabase.co',
  process.env.SUPABASE_SERVICE_KEY
);

const args = process.argv.slice(2);

async function showStatus() {
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('id, title, status, execution_type, priority, business, created_at')
    .eq('execution_type', 'auto')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  console.log('\n=== AUTO TASK QUEUE STATUS ===\n');

  const byStatus = {};
  tasks.forEach(t => {
    byStatus[t.status] = byStatus[t.status] || [];
    byStatus[t.status].push(t);
  });

  const statusOrder = ['pending', 'in_progress', 'failed', 'needs_manual', 'completed'];

  for (const status of statusOrder) {
    const list = byStatus[status] || [];
    if (list.length === 0) continue;

    const icon = {
      pending: '⏳',
      in_progress: '🔄',
      failed: '❌',
      needs_manual: '👤',
      completed: '✅'
    }[status] || '•';

    console.log(icon + ' ' + status.toUpperCase() + ': ' + list.length);

    if (status !== 'completed') {
      list.slice(0, 5).forEach(t => {
        const title = (t.title || 'No title').substring(0, 50);
        console.log('   └─ [P' + t.priority + '] ' + title);
      });
      if (list.length > 5) console.log('   └─ ... and ' + (list.length - 5) + ' more');
    }
  }

  console.log('\nTotal: ' + tasks.length + ' auto tasks\n');
}

async function fixStaleTasks() {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { data: staleTasks, error: fetchError } = await supabase
    .from('tasks')
    .select('id, title')
    .eq('status', 'in_progress')
    .eq('execution_type', 'auto')
    .lt('created_at', oneHourAgo);

  if (fetchError) {
    console.error('Error:', fetchError.message);
    return;
  }

  if (staleTasks.length === 0) {
    console.log('✓ No stale in_progress tasks found');
    return;
  }

  const ids = staleTasks.map(t => t.id);
  const { error: updateError } = await supabase
    .from('tasks')
    .update({
      status: 'failed',
      completion_notes: 'Auto-marked as failed: stuck in_progress for >1 hour'
    })
    .in('id', ids);

  if (updateError) {
    console.error('Error updating:', updateError.message);
    return;
  }

  console.log('✓ Marked ' + staleTasks.length + ' stale tasks as FAILED:');
  staleTasks.forEach(t => {
    console.log('  - ' + (t.title || 'No title').substring(0, 50));
  });
}

async function retryFailedTasks() {
  const { data: failedTasks, error: fetchError } = await supabase
    .from('tasks')
    .select('id, title')
    .eq('status', 'failed')
    .eq('execution_type', 'auto');

  if (fetchError) {
    console.error('Error:', fetchError.message);
    return;
  }

  if (failedTasks.length === 0) {
    console.log('✓ No failed tasks to retry');
    return;
  }

  const ids = failedTasks.map(t => t.id);
  const { error: updateError } = await supabase
    .from('tasks')
    .update({
      status: 'pending',
      completion_notes: null,
      model_attempts: '[]'
    })
    .in('id', ids);

  if (updateError) {
    console.error('Error updating:', updateError.message);
    return;
  }

  console.log('✓ Reset ' + failedTasks.length + ' failed tasks to PENDING for retry:');
  failedTasks.forEach(t => {
    console.log('  - ' + (t.title || 'No title').substring(0, 50));
  });
}

async function cleanOldTasks() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: oldTasks, error: fetchError } = await supabase
    .from('tasks')
    .select('id')
    .eq('status', 'completed')
    .lt('created_at', thirtyDaysAgo);

  if (fetchError) {
    console.error('Error:', fetchError.message);
    return;
  }

  if (oldTasks.length === 0) {
    console.log('✓ No old completed tasks to clean');
    return;
  }

  const ids = oldTasks.map(t => t.id);
  const { error: deleteError } = await supabase
    .from('tasks')
    .delete()
    .in('id', ids);

  if (deleteError) {
    console.error('Error deleting:', deleteError.message);
    return;
  }

  console.log('✓ Deleted ' + oldTasks.length + ' completed tasks older than 30 days');
}

async function main() {
  if (args.includes('--fix')) {
    await fixStaleTasks();
  }

  if (args.includes('--retry')) {
    await retryFailedTasks();
  }

  if (args.includes('--clean')) {
    await cleanOldTasks();
  }

  await showStatus();
}

main().catch(console.error);
