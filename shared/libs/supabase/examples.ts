/**
 * Supabase Integration Examples
 *
 * This file demonstrates common use cases for the Supabase integration library.
 * Run individual functions to test the integration.
 */

import {
  SupabaseClientWrapper,
  SupabaseManagementAPI,
  supabaseClient,
  supabaseAPI,
  Task,
  TaskLog,
  TaskWithLatestLog,
  CreateTaskWithLogResult,
  GetTasksForRetryResult,
} from './index';

/**
 * Example 1: Get all tasks
 */
export async function getAllTasksExample() {
  console.log('Fetching all tasks...');

  const client = new SupabaseClientWrapper();
  const tasks = await client.getAll<Task>('tasks', 10);

  console.log(`Found ${tasks.length} tasks:`);
  tasks.forEach(task => {
    console.log(`- [${task.status}] ${task.title} (Step ${task.current_step})`);
  });

  return tasks;
}

/**
 * Example 2: Get a task by ID
 */
export async function getTaskByIdExample(taskId: string) {
  console.log(`Fetching task ${taskId}...`);

  const client = new SupabaseClientWrapper();
  const task = await client.getById<Task>('tasks', taskId);

  if (task) {
    console.log('Task found:', {
      id: task.id,
      title: task.title,
      status: task.status,
      currentStep: task.current_step,
      retryCount: task.retry_count,
    });
  } else {
    console.log('Task not found');
  }

  return task;
}

/**
 * Example 3: Create a task with logging using RPC
 */
export async function createTaskWithLogExample() {
  console.log('Creating a new task with logging...');

  const client = new SupabaseClientWrapper();
  const [result] = await client.rpc<CreateTaskWithLogResult[]>('create_task_with_log', {
    p_title: `Test Task ${Date.now()}`,
    p_description: 'This is a test task created via RPC',
    p_plan_json: {
      steps: [
        { step: 1, action: 'Initialize' },
        { step: 2, action: 'Process' },
        { step: 3, action: 'Complete' },
      ],
    },
    p_source: 'examples_script',
  });

  console.log('Task created:', {
    taskId: result.task_id,
    logId: result.log_id,
  });

  return result;
}

/**
 * Example 4: Update task status
 */
export async function updateTaskStatusExample(taskId: string, status: string) {
  console.log(`Updating task ${taskId} status to ${status}...`);

  const client = new SupabaseClientWrapper();
  const success = await client.rpc<boolean>('update_task_status', {
    p_task_id: taskId,
    p_status: status,
    p_source: 'examples_script',
    p_message: `Status changed to ${status} via examples`,
  });

  console.log(success ? 'Status updated successfully' : 'Failed to update status');
  return success;
}

/**
 * Example 5: Log task action
 */
export async function logTaskActionExample(taskId: string) {
  console.log(`Logging action for task ${taskId}...`);

  const client = new SupabaseClientWrapper();
  const logId = await client.rpc<string>('log_task_action', {
    p_task_id: taskId,
    p_source: 'examples_script',
    p_status: 'info',
    p_message: 'Processing task step 2',
    p_details_json: {
      step: 2,
      duration_ms: 1234,
      memory_used: '45MB',
    },
  });

  console.log('Log entry created:', logId);
  return logId;
}

/**
 * Example 6: Query tasks with filters
 */
export async function queryTasksExample() {
  console.log('Querying pending tasks...');

  const client = new SupabaseClientWrapper();
  const pendingTasks = await client.query<Task>(
    'tasks',
    { status: 'pending' },
    {
      limit: 10,
      orderBy: { column: 'created_at', ascending: false },
    }
  );

  console.log(`Found ${pendingTasks.length} pending tasks`);
  return pendingTasks;
}

/**
 * Example 7: Get tasks with latest log
 */
export async function getTasksWithLatestLogExample() {
  console.log('Fetching tasks with latest log...');

  const client = new SupabaseClientWrapper();
  const tasksWithLogs = await client.getAll<TaskWithLatestLog>('tasks_with_latest_log', 10);

  console.log(`Found ${tasksWithLogs.length} tasks with logs:`);
  tasksWithLogs.forEach(task => {
    console.log(`- ${task.title}: ${task.latest_log_message || 'No logs yet'}`);
  });

  return tasksWithLogs;
}

/**
 * Example 8: Get tasks for retry
 */
export async function getTasksForRetryExample() {
  console.log('Fetching tasks that need retry...');

  const client = new SupabaseClientWrapper();
  const tasksForRetry = await client.rpc<GetTasksForRetryResult[]>('get_tasks_for_retry', {
    p_max_retries: 3,
  });

  console.log(`Found ${tasksForRetry.length} tasks ready for retry:`);
  tasksForRetry.forEach(task => {
    console.log(`- ${task.title} (Retry ${task.retry_count}/3): ${task.last_error}`);
  });

  return tasksForRetry;
}

/**
 * Example 9: Mark task as needing fix
 */
export async function markTaskNeedsFixExample(taskId: string) {
  console.log(`Marking task ${taskId} as needing fix...`);

  const client = new SupabaseClientWrapper();
  const success = await client.rpc<boolean>('mark_task_needs_fix', {
    p_task_id: taskId,
    p_supervisor_summary: 'Task failed due to network timeout',
    p_supervisor_recommendation: 'retry',
    p_repair_instruction: 'Retry with exponential backoff',
    p_next_action_after: new Date(Date.now() + 300000).toISOString(), // 5 minutes
  });

  console.log(success ? 'Task marked for repair' : 'Failed to mark task');
  return success;
}

/**
 * Example 10: Insert multiple tasks
 */
export async function insertMultipleTasksExample() {
  console.log('Inserting multiple tasks...');

  const client = new SupabaseClientWrapper();
  const tasks = await client.insertMany<Task>('tasks', [
    {
      title: 'Batch Task 1',
      description: 'First batch task',
      status: 'pending',
      plan_json: null,
      current_step: 0,
      supervisor_summary: null,
      supervisor_recommendation: null,
      repair_instruction: null,
      retry_count: 0,
      next_action_after: null,
    },
    {
      title: 'Batch Task 2',
      description: 'Second batch task',
      status: 'pending',
      plan_json: null,
      current_step: 0,
      supervisor_summary: null,
      supervisor_recommendation: null,
      repair_instruction: null,
      retry_count: 0,
      next_action_after: null,
    },
  ]);

  console.log(`Inserted ${tasks.length} tasks`);
  return tasks;
}

/**
 * Example 11: Subscribe to task changes (real-time)
 */
export async function subscribeToTaskChangesExample() {
  console.log('Subscribing to task changes...');

  const client = new SupabaseClientWrapper();

  const subscription = client.subscribe('tasks', (payload) => {
    console.log('Task changed:', {
      event: payload.eventType,
      task: payload.new?.title || payload.old?.title,
    });
  }, '*');

  console.log('Subscribed to task changes. Listening...');
  console.log('(Call subscription.unsubscribe() to stop)');

  return subscription;
}

/**
 * Example 12: Using service role client
 */
export async function useServiceRoleExample() {
  console.log('Using service role client to bypass RLS...');

  const client = new SupabaseClientWrapper();

  const tasks = await client.withServiceRole(async (serviceClient) => {
    const { data, error } = await serviceClient
      .from('tasks')
      .select('*')
      .limit(5);

    if (error) throw error;
    return data;
  });

  console.log(`Fetched ${tasks?.length || 0} tasks via service role`);
  return tasks;
}

/**
 * Example 13: Get all task logs for a task
 */
export async function getTaskLogsExample(taskId: string) {
  console.log(`Fetching logs for task ${taskId}...`);

  const client = new SupabaseClientWrapper();
  const logs = await client.query<TaskLog>(
    'task_logs',
    { task_id: taskId },
    {
      orderBy: { column: 'created_at', ascending: true },
    }
  );

  console.log(`Found ${logs.length} log entries:`);
  logs.forEach(log => {
    console.log(`- [${log.status}] ${log.message} (${log.source})`);
  });

  return logs;
}

/**
 * Example 14: Using Management API - Get projects
 */
export async function getProjectsExample() {
  console.log('Fetching Supabase projects...');

  const api = new SupabaseManagementAPI();
  const projects = await api.getProjects();

  console.log(`Found ${projects.length || 0} projects`);
  return projects;
}

/**
 * Example 15: Using Management API - Get database tables
 */
export async function getDatabaseTablesExample(projectId: string) {
  console.log(`Fetching database tables for project ${projectId}...`);

  const api = new SupabaseManagementAPI();
  const tables = await api.getDatabaseTables(projectId);

  console.log(`Found ${tables.length || 0} tables`);
  return tables;
}

/**
 * Example 16: Using default instances
 */
export async function defaultInstancesExample() {
  console.log('Using default instances...');

  // Database client
  const tasks = await supabaseClient.getAll<Task>('tasks', 5);
  console.log(`Found ${tasks.length} tasks via default client`);

  // Management API
  try {
    const projects = await supabaseAPI.getProjects();
    console.log(`Found ${projects.length || 0} projects via default API`);
  } catch (error) {
    console.log('Management API not configured or error:', error instanceof Error ? error.message : error);
  }

  return { tasks };
}

/**
 * Example 17: Complete workflow - Create, update, and complete a task
 */
export async function completeWorkflowExample() {
  console.log('=== Running complete task workflow ===\n');

  const client = new SupabaseClientWrapper();

  // Step 1: Create task
  console.log('Step 1: Creating task...');
  const [createResult] = await client.rpc<CreateTaskWithLogResult[]>('create_task_with_log', {
    p_title: `Workflow Test ${Date.now()}`,
    p_description: 'Complete workflow example',
    p_plan_json: {
      steps: [
        { step: 1, action: 'Initialize' },
        { step: 2, action: 'Process' },
        { step: 3, action: 'Finalize' },
      ],
    },
    p_source: 'workflow_example',
  });
  console.log(`✅ Task created: ${createResult.task_id}\n`);

  // Step 2: Update to in_progress
  console.log('Step 2: Starting task...');
  await client.rpc('update_task_status', {
    p_task_id: createResult.task_id,
    p_status: 'in_progress',
    p_source: 'workflow_example',
    p_message: 'Task started',
  });
  console.log('✅ Status: in_progress\n');

  // Step 3: Log progress
  console.log('Step 3: Logging progress...');
  await client.rpc('log_task_action', {
    p_task_id: createResult.task_id,
    p_source: 'workflow_example',
    p_status: 'info',
    p_message: 'Processing step 2 of 3',
    p_details_json: { progress: 66 },
  });
  console.log('✅ Progress logged\n');

  // Step 4: Complete task
  console.log('Step 4: Completing task...');
  await client.rpc('update_task_status', {
    p_task_id: createResult.task_id,
    p_status: 'completed',
    p_source: 'workflow_example',
    p_message: 'All steps completed successfully',
  });
  console.log('✅ Status: completed\n');

  // Step 5: Fetch final task state
  console.log('Step 5: Fetching final state...');
  const finalTask = await client.getById<Task>('tasks', createResult.task_id);
  console.log('Final task state:', {
    title: finalTask?.title,
    status: finalTask?.status,
    retryCount: finalTask?.retry_count,
  });

  console.log('\n=== Workflow complete! ===');
  return finalTask;
}

/**
 * Run all examples (non-destructive ones)
 */
export async function runAllExamples() {
  console.log('=== Running Supabase Integration Examples ===\n');

  try {
    // Example 1: Get all tasks
    await getAllTasksExample();
    console.log('\n---\n');

    // Example 6: Query tasks
    await queryTasksExample();
    console.log('\n---\n');

    // Example 7: Get tasks with latest log
    await getTasksWithLatestLogExample();
    console.log('\n---\n');

    // Example 8: Get tasks for retry
    await getTasksForRetryExample();
    console.log('\n---\n');

    // Example 16: Default instances
    await defaultInstancesExample();
    console.log('\n---\n');

    console.log('=== All examples completed successfully! ===');
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Uncomment to run examples
// runAllExamples().catch(console.error);

// Uncomment to run complete workflow
// completeWorkflowExample().catch(console.error);
