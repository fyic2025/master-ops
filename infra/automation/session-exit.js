#!/usr/bin/env node
/**
 * Session Exit Hook for Claude Code
 *
 * Runs automatically when a Claude Code session ends.
 * - Parses transcript for pending TODOs
 * - POSTs remaining tasks to dashboard API
 * - Appends session summary to TASKS.md
 * - Commits and pushes all changes to git
 *
 * Input (via stdin): JSON with session_id, transcript_path, cwd, reason
 */

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

async function main() {
  let sessionData;

  try {
    // Read session data from stdin
    const input = fs.readFileSync(0, 'utf-8');
    sessionData = JSON.parse(input);
  } catch (e) {
    console.error('Failed to parse session data:', e.message);
    process.exit(1);
  }

  const { session_id, transcript_path, cwd, reason } = sessionData;
  const shortId = session_id ? session_id.slice(0, 8) : 'unknown';

  console.log(`[session-exit] Session ${shortId} ending (reason: ${reason})`);

  // Parse transcript for pending TODOs
  let pendingTasks = [];
  if (transcript_path && fs.existsSync(transcript_path)) {
    try {
      const transcript = fs.readFileSync(transcript_path, 'utf-8');
      pendingTasks = extractPendingTodos(transcript);
      console.log(`[session-exit] Found ${pendingTasks.length} pending tasks`);
    } catch (e) {
      console.error('[session-exit] Failed to parse transcript:', e.message);
    }
  }

  // Save pending tasks to dashboard API
  if (pendingTasks.length > 0) {
    console.log('[session-exit] Saving tasks to dashboard...');
    for (const task of pendingTasks) {
      try {
        const response = await fetch('https://ops.growthcohq.com/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: task.title,
            description: `From Claude Code session ${shortId}`,
            created_by: 'claude_code',
            priority: 2,
            status: 'pending'
          })
        });

        if (!response.ok) {
          console.error(`[session-exit] Failed to save task: ${task.title}`);
        }
      } catch (e) {
        console.error(`[session-exit] API error: ${e.message}`);
      }
    }
  }

  // Append session summary to TASKS.md
  const tasksFile = path.join(cwd, '.claude/TASKS.md');
  if (fs.existsSync(path.dirname(tasksFile))) {
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const time = new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });
      const summary = `\n### Session ${shortId} (${timestamp} ${time})\n- Exit reason: ${reason}\n- Pending tasks saved: ${pendingTasks.length}\n`;
      fs.appendFileSync(tasksFile, summary);
      console.log('[session-exit] Updated TASKS.md');
    } catch (e) {
      console.error('[session-exit] Failed to update TASKS.md:', e.message);
    }
  }

  // Git commit and push
  console.log('[session-exit] Committing and pushing to git...');
  try {
    execSync('git add -A', { cwd, stdio: 'pipe' });

    const commitMsg = `Session end: ${reason} [${shortId}]\n\n- Pending tasks: ${pendingTasks.length}\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)`;
    execSync(`git commit -m "${commitMsg.replace(/"/g, '\\"')}"`, { cwd, stdio: 'pipe' });

    execSync('git push', { cwd, stdio: 'pipe' });
    console.log('[session-exit] Pushed to git successfully');
  } catch (e) {
    // Git may fail if nothing to commit - that's OK
    if (e.message.includes('nothing to commit')) {
      console.log('[session-exit] No changes to commit');
    } else {
      console.log('[session-exit] Git operation:', e.message.split('\n')[0]);
    }
  }

  console.log('[session-exit] Done');
}

function extractPendingTodos(transcript) {
  const todos = [];
  const seenTitles = new Set();

  for (const line of transcript.split('\n')) {
    if (!line.trim()) continue;

    try {
      const entry = JSON.parse(line);

      // Look for TodoWrite tool calls in the transcript
      if (entry.type === 'tool_use' && entry.name === 'TodoWrite') {
        const todosData = entry.input?.todos || [];
        for (const todo of todosData) {
          // Only capture pending/in_progress tasks (not completed)
          if ((todo.status === 'pending' || todo.status === 'in_progress') && !seenTitles.has(todo.content)) {
            seenTitles.add(todo.content);
            todos.push({
              title: todo.content,
              status: todo.status,
              activeForm: todo.activeForm
            });
          }
        }
      }

      // Also check for todos in assistant messages
      if (entry.todos && Array.isArray(entry.todos)) {
        for (const todo of entry.todos) {
          if ((todo.status === 'pending' || todo.status === 'in_progress') && !seenTitles.has(todo.content)) {
            seenTitles.add(todo.content);
            todos.push({
              title: todo.content,
              status: todo.status
            });
          }
        }
      }
    } catch {
      // Skip non-JSON lines
    }
  }

  return todos;
}

main().catch(err => {
  console.error('[session-exit] Fatal error:', err.message);
  process.exit(1);
});
