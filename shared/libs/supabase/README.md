# Supabase Integration Library

A comprehensive TypeScript library for integrating with Supabase. Provides both database client access and Management API access methods.

## Features

- **Database Client**: Full-featured Supabase client with CRUD operations, queries, RPC calls, and real-time subscriptions
- **Management API**: Access to Supabase Management API for project administration
- **Type-Safe**: Full TypeScript support with comprehensive type definitions for the task tracking schema
- **Environment-Aware**: Automatically loads credentials from environment variables
- **Storage Support**: File upload/download and bucket management
- **Real-time**: Subscribe to database changes
- **RLS Support**: Both standard (RLS-aware) and service role (full access) clients

## Installation

The required package is already installed:
- `@supabase/supabase-js` - Official Supabase JavaScript client

## Configuration

### Environment Variables

Update your `.env` file in the project root:

```env
# Supabase Database Client
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Supabase Management API
SUPABASE_ACCESS_TOKEN=your-access-token-here
```

Get these values from:
- **URL & Keys**: [Supabase Dashboard](https://supabase.com/dashboard) → Project → Settings → API
- **Access Token**: [Supabase Dashboard](https://supabase.com/dashboard) → Account → Access Tokens

## Usage

### Option 1: Database Client (Recommended for CRUD operations)

```typescript
import { SupabaseClientWrapper } from './shared/libs/supabase';

// Create a new client
const client = new SupabaseClientWrapper();

// Get all records from a table
const tasks = await client.getAll<Task>('tasks', 100);

// Get a single record by ID
const task = await client.getById<Task>('tasks', 'task-id');

// Insert a new record
const newTask = await client.insert<Task>('tasks', {
  title: 'New Task',
  description: 'Task description',
  status: 'pending',
  plan_json: null,
  current_step: 0,
  supervisor_summary: null,
  supervisor_recommendation: null,
  repair_instruction: null,
  retry_count: 0,
  next_action_after: null,
});

// Update a record
const updated = await client.update<Task>('tasks', 'task-id', {
  status: 'completed',
  current_step: 5,
});

// Delete a record
await client.delete('tasks', 'task-id');

// Query with filters
const pendingTasks = await client.query<Task>('tasks',
  { status: 'pending' },
  {
    limit: 10,
    orderBy: { column: 'created_at', ascending: false }
  }
);

// Call an RPC function
const result = await client.rpc<CreateTaskWithLogResult[]>('create_task_with_log', {
  p_title: 'Deploy Teelixir',
  p_description: 'Deploy latest changes',
  p_source: 'claude_code',
});

// Full-text search
const searchResults = await client.search<Task>('tasks', 'title', 'deployment', {
  limit: 10
});
```

### Option 2: Management API (For project administration)

```typescript
import { SupabaseManagementAPI } from './shared/libs/supabase';

// Create API instance
const api = new SupabaseManagementAPI();

// Get all projects
const projects = await api.getProjects();

// Get project details
const project = await api.getProject('project-id');

// Get API keys
const keys = await api.getProjectAPIKeys('project-id');

// Get database schema
const schema = await api.getDatabaseSchema('project-id');

// Get database tables
const tables = await api.getDatabaseTables('project-id');

// Execute SQL (use with caution!)
const result = await api.executeSql('project-id', 'SELECT * FROM tasks LIMIT 10');

// Get storage buckets
const buckets = await api.getStorageBuckets('project-id');

// Create storage bucket
await api.createStorageBucket('project-id', 'my-bucket', {
  public: false,
  fileSizeLimit: 52428800, // 50MB
});

// Get auth users
const users = await api.getAuthUsers('project-id', { page: 1, perPage: 50 });

// Get project health
const health = await api.getProjectHealth('project-id');

// Get usage statistics
const usage = await api.getProjectUsage('project-id');
```

### Option 3: Default Instances (Quick access)

```typescript
import { supabaseClient, supabaseAPI } from './shared/libs/supabase';

// Use pre-configured database client
const tasks = await supabaseClient.getAll<Task>('tasks');

// Use pre-configured management API
const projects = await supabaseAPI.getProjects();
```

### Option 4: Direct Supabase Client Access

```typescript
import { SupabaseClientWrapper } from './shared/libs/supabase';

const wrapper = new SupabaseClientWrapper();

// Access the raw Supabase client
const { data, error } = await wrapper.client
  .from('tasks')
  .select('*')
  .eq('status', 'pending')
  .order('created_at', { ascending: false });
```

## Advanced Usage

### Using Service Role Client (Bypasses RLS)

```typescript
const client = new SupabaseClientWrapper();

// Execute operations with service role privileges
await client.withServiceRole(async (serviceClient) => {
  const { data, error } = await serviceClient
    .from('tasks')
    .select('*')
    .limit(100);

  return data;
});
```

### Real-time Subscriptions

```typescript
const client = new SupabaseClientWrapper();

// Subscribe to all changes
const subscription = client.subscribe('tasks', (payload) => {
  console.log('Change detected:', payload);
}, '*');

// Subscribe to INSERT events only
const insertSub = client.subscribe('tasks', (payload) => {
  console.log('New task:', payload.new);
}, 'INSERT');

// Unsubscribe when done
subscription.unsubscribe();
```

### File Storage Operations

```typescript
const client = new SupabaseClientWrapper();

// Upload a file
const { path, url } = await client.uploadFile(
  'my-bucket',
  'folder/file.pdf',
  fileBuffer,
  { contentType: 'application/pdf' }
);

// Download a file
const blob = await client.downloadFile('my-bucket', 'folder/file.pdf');

// List files
const files = await client.listFiles('my-bucket', 'folder/');

// Delete a file
await client.deleteFile('my-bucket', 'folder/file.pdf');
```

### Working with Task Tracking Schema

```typescript
import {
  Task,
  TaskLog,
  TaskWithLatestLog,
  CreateTaskWithLogParams,
  LogTaskActionParams
} from './shared/libs/supabase';

const client = new SupabaseClientWrapper();

// Create task with logging using RPC
const [result] = await client.rpc<CreateTaskWithLogResult[]>('create_task_with_log', {
  p_title: 'Deploy to Production',
  p_description: 'Deploy latest code changes',
  p_plan_json: {
    steps: [
      { step: 1, action: 'Run tests' },
      { step: 2, action: 'Build' },
      { step: 3, action: 'Deploy' }
    ]
  },
  p_source: 'n8n_workflow'
});

console.log('Task created:', result.task_id);

// Log task action
await client.rpc('log_task_action', {
  p_task_id: result.task_id,
  p_source: 'claude_code',
  p_status: 'success',
  p_message: 'Tests passed successfully',
  p_details_json: { duration_ms: 1500, tests_passed: 42 }
});

// Update task status
await client.rpc('update_task_status', {
  p_task_id: result.task_id,
  p_status: 'completed',
  p_source: 'claude_code',
  p_message: 'All steps completed'
});

// Get tasks needing retry
const tasksForRetry = await client.rpc<GetTasksForRetryResult[]>('get_tasks_for_retry', {
  p_max_retries: 3
});

// Mark task as needing fix
await client.rpc('mark_task_needs_fix', {
  p_task_id: result.task_id,
  p_supervisor_summary: 'Deployment failed due to config error',
  p_supervisor_recommendation: 'adjust_code',
  p_repair_instruction: 'Update API endpoint in config/services.ts',
  p_next_action_after: new Date(Date.now() + 300000).toISOString() // 5 min
});
```

### Querying Views

```typescript
// Get tasks with latest log
const tasksWithLogs = await client.getAll<TaskWithLatestLog>('tasks_with_latest_log');

// Get tasks needing attention
const needsAttention = await client.getAll<TaskNeedingAttention>('tasks_needing_attention');
```

### Batch Operations

```typescript
const client = new SupabaseClientWrapper();

// Insert multiple records
const newTasks = await client.insertMany<Task>('tasks', [
  { title: 'Task 1', status: 'pending', /* ... */ },
  { title: 'Task 2', status: 'pending', /* ... */ },
  { title: 'Task 3', status: 'pending', /* ... */ },
]);
```

### Custom Access Tokens

```typescript
// Use custom credentials instead of environment variables
const client = new SupabaseClientWrapper(
  'https://custom-project.supabase.co',
  'custom-anon-key',
  'custom-service-role-key'
);

const api = new SupabaseManagementAPI('custom-access-token');
```

## Integration with Existing Infrastructure

This library complements the existing setup in `infra/supabase/`:

```typescript
// Import from shared libs (new comprehensive client)
import { SupabaseClientWrapper } from './shared/libs/supabase';

// Import from infra (existing basic client)
import { supabase, serviceClient } from './infra/supabase/client';

// Both approaches work - use whichever fits your needs
const client = new SupabaseClientWrapper();
const tasks1 = await client.getAll<Task>('tasks');

const { data: tasks2 } = await supabase.from('tasks').select('*');
```

## API Reference

### SupabaseClientWrapper Methods

**CRUD Operations:**
- `getAll<T>(table, limit?)` - Get all records
- `getById<T>(table, id)` - Get single record by ID
- `insert<T>(table, record)` - Insert new record
- `insertMany<T>(table, records)` - Insert multiple records
- `update<T>(table, id, updates)` - Update record
- `delete(table, id)` - Delete record

**Query Operations:**
- `query<T>(table, filters, options?)` - Query with custom filters
- `search<T>(table, column, query, options?)` - Full-text search
- `rpc<T>(functionName, params?)` - Call RPC function

**Real-time:**
- `subscribe(table, callback, event?)` - Subscribe to changes

**Storage:**
- `uploadFile(bucket, path, file, options?)` - Upload file
- `downloadFile(bucket, path)` - Download file
- `listFiles(bucket, path?)` - List files
- `deleteFile(bucket, path)` - Delete file

**Advanced:**
- `withServiceRole<T>(callback)` - Execute with service role

### SupabaseManagementAPI Methods

**Projects:**
- `getProjects()` - Get all projects
- `getProject(projectId)` - Get project details
- `getProjectAPIKeys(projectId)` - Get API keys
- `getProjectConfig(projectId)` - Get configuration
- `updateProjectConfig(projectId, config)` - Update configuration
- `getProjectHealth(projectId)` - Get health status
- `getProjectUsage(projectId)` - Get usage statistics

**Database:**
- `getDatabaseSchema(projectId)` - Get schema
- `getDatabaseTables(projectId)` - Get tables
- `getTableSchema(projectId, tableName)` - Get table schema
- `executeSql(projectId, sql)` - Execute SQL
- `getDatabaseFunctions(projectId)` - Get functions
- `getDatabaseMigrations(projectId)` - Get migrations
- `getDatabaseExtensions(projectId)` - Get extensions
- `enableDatabaseExtension(projectId, name)` - Enable extension
- `disableDatabaseExtension(projectId, name)` - Disable extension

**Storage:**
- `getStorageBuckets(projectId)` - Get buckets
- `createStorageBucket(projectId, name, options?)` - Create bucket

**Authentication:**
- `getAuthSettings(projectId)` - Get auth settings
- `updateAuthSettings(projectId, settings)` - Update auth settings
- `getAuthUsers(projectId, options?)` - Get users

**Organizations:**
- `getOrganizations()` - Get organizations
- `getOrganization(orgId)` - Get organization details
- `getOrganizationMembers(orgId)` - Get members
- `inviteOrganizationMember(orgId, email, role?)` - Invite member

**Edge Functions:**
- `getEdgeFunctions(projectId)` - Get Edge Functions
- `getEdgeFunction(projectId, functionName)` - Get specific function

## Resources

- [Supabase JavaScript Client Documentation](https://supabase.com/docs/reference/javascript/introduction)
- [Supabase Management API Documentation](https://supabase.com/docs/reference/api/introduction)
- [Task Tracking Schema](../../infra/supabase/schema-tasks.sql)
- [Supabase Setup Guide](../../infra/supabase/SETUP.md)

## Troubleshooting

### Error: "Missing required environment variables"

Ensure your `.env` file has:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-key-here
```

### Error: "permission denied for table"

You're hitting RLS policies. Either:
1. Use the service role client via `withServiceRole()`
2. Configure appropriate RLS policies in your database

### Error: "Service role client is not configured"

Set `SUPABASE_SERVICE_ROLE_KEY` in your `.env` file.

## License

Part of the master-ops project.
