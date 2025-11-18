# Supabase Database Setup Guide

Complete step-by-step guide for setting up the AI task tracking database in your Supabase project.

---

## Prerequisites

- Supabase account at [supabase.com](https://supabase.com)
- Project created in Supabase dashboard
- `.env` file configured with your Supabase credentials

---

## Method 1: Using Supabase SQL Editor (Recommended)

### Step 1: Access SQL Editor

1. Go to your Supabase project dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **New query** button

### Step 2: Run the Schema

1. Open [schema-tasks.sql](schema-tasks.sql) in your code editor
2. Copy the **entire contents** of the file
3. Paste into the SQL Editor
4. Click **Run** (or press `Ctrl/Cmd + Enter`)
5. Wait for execution to complete (~2-3 seconds)

You should see:
```
Success. No rows returned
```

### Step 3: Verify Tables Created

Run this query in SQL Editor:

```sql
-- Check if tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('tasks', 'task_logs');
```

**Expected output**:
```
table_name
----------
tasks
task_logs
```

### Step 4: Verify Views Created

```sql
-- Check if views exist
SELECT table_name
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name IN ('tasks_with_latest_log', 'tasks_needing_attention');
```

**Expected output**:
```
table_name
---------------------
tasks_with_latest_log
tasks_needing_attention
```

### Step 5: Test Insert

```sql
-- Insert a test task
INSERT INTO tasks (title, description, status)
VALUES (
  'Test Task',
  'This is a test to verify the database is working',
  'pending'
)
RETURNING *;
```

If successful, you'll see the inserted task with generated `id`, `created_at`, and `updated_at`.

### Step 6: Clean Up Test Data

```sql
-- Delete test task
DELETE FROM tasks WHERE title = 'Test Task';
```

---

## Method 2: Using Supabase CLI

### Step 1: Install Supabase CLI

**macOS/Linux**:
```bash
brew install supabase/tap/supabase
```

**Windows** (via Scoop):
```bash
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

**NPM** (all platforms):
```bash
npm install -g supabase
```

### Step 2: Login to Supabase

```bash
supabase login
```

This will open a browser window to authenticate.

### Step 3: Link to Your Project

```bash
# Initialize Supabase in your project (if not done already)
supabase init

# Link to your remote project
supabase link --project-ref your-project-id
```

**Finding your project ID**:
- Go to Supabase dashboard → Settings → General
- Copy the "Reference ID"

### Step 4: Run the Schema

**Option A: Push to remote database**
```bash
# From the repo root
supabase db push --db-url "postgresql://postgres:[PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres"
```

**Option B: Execute SQL file directly**
```bash
# Using psql (if installed)
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres" \
  -f infra/supabase/schema-tasks.sql
```

Get your database URL from: Dashboard → Settings → Database → Connection string (URI)

### Step 5: Verify

```bash
# Check tables via CLI
supabase db ls
```

---

## Method 3: Using psql Directly

If you have PostgreSQL client installed:

```bash
# Export connection string
export DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres"

# Run the schema
psql $DATABASE_URL < infra/supabase/schema-tasks.sql

# Verify tables exist
psql $DATABASE_URL -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('tasks', 'task_logs');"
```

---

## Adding Row Level Security (RLS) Policies

### Why RLS?

Row Level Security ensures users can only access data they're authorized to see. Essential for production environments.

### Step 1: Enable RLS

Run in SQL Editor:

```sql
-- Enable RLS on tables
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_logs ENABLE ROW LEVEL SECURITY;
```

### Step 2: Add Policies

**Option A: Allow All (Development/Testing)**

```sql
-- Allow all operations for authenticated users (development only)
CREATE POLICY "Allow all for authenticated users" ON tasks
  FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users" ON task_logs
  FOR ALL
  USING (auth.role() = 'authenticated');
```

**Option B: Service Role Only (Recommended for AI automation)**

```sql
-- Only service role can access (for n8n/automation use cases)
CREATE POLICY "Service role full access" ON tasks
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON task_logs
  FOR ALL
  USING (auth.role() = 'service_role');
```

**Option C: Per-Business Access (Advanced)**

```sql
-- Add business column to tasks table
ALTER TABLE tasks ADD COLUMN business TEXT;

-- Policy: Users can only see tasks for their business
CREATE POLICY "Users see own business tasks" ON tasks
  FOR SELECT
  USING (
    business = current_setting('app.current_business', true)
  );

-- Policy: Service role can see all
CREATE POLICY "Service role sees all tasks" ON tasks
  FOR ALL
  USING (auth.role() = 'service_role');
```

### Step 3: Verify RLS is Active

```sql
-- Check RLS status
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename IN ('tasks', 'task_logs');
```

**Expected output**:
```
schemaname | tablename  | rowsecurity
-----------+------------+-------------
public     | tasks      | t
public     | task_logs  | t
```

### Step 4: Test RLS

```sql
-- Test as anon user (should fail if service_role policy is active)
SET ROLE anon;
SELECT * FROM tasks;
-- Expected: 0 rows (or error if strict)

-- Test as service_role (should succeed)
SET ROLE service_role;
SELECT * FROM tasks;
-- Expected: All rows visible

-- Reset role
RESET ROLE;
```

---

## Adding Helper RPC Functions

Remote Procedure Calls (RPCs) make it easier to perform complex operations.

### Step 1: Create Task with Logging

```sql
-- Function: Create task and log the creation
CREATE OR REPLACE FUNCTION create_task_with_log(
  p_title TEXT,
  p_description TEXT DEFAULT NULL,
  p_plan_json JSONB DEFAULT NULL,
  p_source TEXT DEFAULT 'system'
)
RETURNS TABLE(task_id UUID, log_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_task_id UUID;
  v_log_id UUID;
BEGIN
  -- Insert task
  INSERT INTO tasks (title, description, plan_json, status)
  VALUES (p_title, p_description, p_plan_json, 'pending')
  RETURNING id INTO v_task_id;

  -- Log the creation
  INSERT INTO task_logs (task_id, source, status, message)
  VALUES (v_task_id, p_source, 'info', 'Task created: ' || p_title)
  RETURNING id INTO v_log_id;

  -- Return both IDs
  RETURN QUERY SELECT v_task_id, v_log_id;
END;
$$;
```

**Usage**:
```sql
-- Call the function
SELECT * FROM create_task_with_log(
  'Deploy Teelixir update',
  'Deploy latest changes to production',
  '[{"step": 1, "action": "Run tests"}, {"step": 2, "action": "Deploy"}]'::jsonb,
  'n8n_workflow'
);
```

### Step 2: Log Task Action

```sql
-- Function: Add log entry for a task
CREATE OR REPLACE FUNCTION log_task_action(
  p_task_id UUID,
  p_source TEXT,
  p_status TEXT,
  p_message TEXT,
  p_details_json JSONB DEFAULT NULL,
  p_attempt_number INT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO task_logs (
    task_id,
    source,
    status,
    message,
    details_json,
    attempt_number
  )
  VALUES (
    p_task_id,
    p_source,
    p_status,
    p_message,
    p_details_json,
    p_attempt_number
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;
```

**Usage**:
```sql
-- Log a success
SELECT log_task_action(
  'task-uuid-here',
  'claude_code',
  'success',
  'Task completed successfully',
  '{"duration_ms": 1500, "steps_completed": 5}'::jsonb
);

-- Log an error
SELECT log_task_action(
  'task-uuid-here',
  'claude_code',
  'error',
  'Deployment failed: connection timeout',
  '{"error_code": "ETIMEDOUT", "retry_possible": true}'::jsonb,
  1  -- attempt number
);
```

### Step 3: Update Task Status

```sql
-- Function: Update task status and log it
CREATE OR REPLACE FUNCTION update_task_status(
  p_task_id UUID,
  p_status TEXT,
  p_source TEXT DEFAULT 'system',
  p_message TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update task status
  UPDATE tasks
  SET status = p_status, updated_at = NOW()
  WHERE id = p_task_id;

  -- Log the status change
  INSERT INTO task_logs (task_id, source, status, message)
  VALUES (
    p_task_id,
    p_source,
    'info',
    COALESCE(p_message, 'Status changed to: ' || p_status)
  );

  RETURN FOUND;
END;
$$;
```

**Usage**:
```sql
-- Mark task as completed
SELECT update_task_status(
  'task-uuid-here',
  'completed',
  'claude_code',
  'All deployment steps completed successfully'
);
```

### Step 4: Get Tasks Needing Retry

```sql
-- Function: Get tasks that need retry
CREATE OR REPLACE FUNCTION get_tasks_for_retry(
  p_max_retries INT DEFAULT 3
)
RETURNS TABLE(
  task_id UUID,
  title TEXT,
  retry_count INT,
  last_error TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.title,
    t.retry_count,
    l.message as last_error
  FROM tasks t
  LEFT JOIN LATERAL (
    SELECT message
    FROM task_logs
    WHERE task_id = t.id AND status = 'error'
    ORDER BY created_at DESC
    LIMIT 1
  ) l ON true
  WHERE t.status IN ('failed', 'needs_fix')
    AND t.retry_count < p_max_retries
    AND (t.next_action_after IS NULL OR t.next_action_after <= NOW());
END;
$$;
```

**Usage**:
```sql
-- Get all tasks ready for retry
SELECT * FROM get_tasks_for_retry();

-- Get tasks with max 5 retries
SELECT * FROM get_tasks_for_retry(5);
```

### Step 5: Mark Task for Repair

```sql
-- Function: Mark task as needing fix with supervisor feedback
CREATE OR REPLACE FUNCTION mark_task_needs_fix(
  p_task_id UUID,
  p_supervisor_summary TEXT,
  p_supervisor_recommendation TEXT,
  p_repair_instruction TEXT,
  p_next_action_after TIMESTAMPTZ DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE tasks
  SET
    status = 'needs_fix',
    supervisor_summary = p_supervisor_summary,
    supervisor_recommendation = p_supervisor_recommendation,
    repair_instruction = p_repair_instruction,
    next_action_after = p_next_action_after,
    updated_at = NOW()
  WHERE id = p_task_id;

  -- Log the supervisor analysis
  INSERT INTO task_logs (task_id, source, status, message, details_json)
  VALUES (
    p_task_id,
    'n8n_supervisor',
    'warning',
    'Task marked for repair',
    jsonb_build_object(
      'summary', p_supervisor_summary,
      'recommendation', p_supervisor_recommendation
    )
  );

  RETURN FOUND;
END;
$$;
```

**Usage**:
```sql
-- Mark task for repair with supervisor feedback
SELECT mark_task_needs_fix(
  'task-uuid-here',
  'Deployment failed due to incorrect API endpoint configuration',
  'adjust_code',
  'Update the API endpoint in config/services.ts from /v1/api to /v2/api and retry deployment',
  NOW() + INTERVAL '5 minutes'  -- Retry in 5 minutes
);
```

---

## Verify Everything is Working

### Complete Verification Script

Run this in SQL Editor to verify your setup:

```sql
-- 1. Check tables exist
SELECT 'Tables' as check_type, COUNT(*) as count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('tasks', 'task_logs');

-- 2. Check views exist
SELECT 'Views' as check_type, COUNT(*) as count
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name IN ('tasks_with_latest_log', 'tasks_needing_attention');

-- 3. Check RLS is enabled
SELECT 'RLS Enabled' as check_type, COUNT(*) as count
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('tasks', 'task_logs')
  AND rowsecurity = true;

-- 4. Check functions exist
SELECT 'Functions' as check_type, COUNT(*) as count
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'create_task_with_log',
    'log_task_action',
    'update_task_status',
    'get_tasks_for_retry',
    'mark_task_needs_fix'
  );

-- 5. Test insert and retrieve
WITH new_task AS (
  SELECT * FROM create_task_with_log(
    'Verification Test',
    'Testing database setup',
    NULL::jsonb,
    'setup_script'
  )
)
SELECT
  'Task Creation' as check_type,
  CASE WHEN task_id IS NOT NULL THEN 'PASS' ELSE 'FAIL' END as status
FROM new_task;

-- 6. Clean up test data
DELETE FROM tasks WHERE title = 'Verification Test';

-- Show summary
SELECT '=== Setup Verification Complete ===' as summary;
```

**Expected output** (all counts should match):
```
check_type    | count
--------------+-------
Tables        | 2
Views         | 2
RLS Enabled   | 2
Functions     | 5
Task Creation | PASS
```

---

## Troubleshooting

### Error: "permission denied for table tasks"

**Solution**: You're not using the service role key. Either:
- Use `serviceClient` in your TypeScript code
- Or add RLS policies that allow your current role

### Error: "relation 'tasks' does not exist"

**Solution**: Schema wasn't applied correctly. Re-run `schema-tasks.sql`.

### Functions not found when calling RPCs

**Solution**: Make sure you ran the helper function SQL. Verify with:
```sql
SELECT proname FROM pg_proc WHERE proname LIKE '%task%';
```

### TypeScript client can't connect

**Solution**: Check your `.env` file:
```bash
# Verify env variables are loaded
node -e "require('dotenv').config(); console.log(process.env.SUPABASE_URL)"
```

---

## Next Steps

1. ✅ Schema applied
2. ✅ Tables and views created
3. ✅ RLS policies configured
4. ✅ Helper functions added
5. ✅ Verification complete

**You're ready to**:
- Use the TypeScript client in `infra/supabase/client.ts`
- Create tasks from n8n workflows
- Build AI-managed automation systems
- Track task execution and recovery

See [client.ts](client.ts) for usage examples.

---

**Last Updated**: 2025-11-19
