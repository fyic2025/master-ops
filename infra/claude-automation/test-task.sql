-- ============================================================================
-- TEST TASK FOR CLAUDE CODE AUTOMATION
-- ============================================================================
-- Run this SQL in Supabase to create a test task that will be picked up
-- by the automation workflow.
--
-- The task asks Claude to create a simple test file, which is safe and
-- easily verifiable.
-- ============================================================================

-- Create a simple test task
INSERT INTO tasks (
    title,
    description,
    business,
    category,
    priority,
    instructions,
    status,
    triage_status,
    created_by
) VALUES (
    'Test: Claude Automation Verification',
    'This is an automated test task to verify Claude Code headless mode is working correctly.',
    'overall',
    'automations',
    3,  -- Normal priority
    E'This is a test task to verify automation is working.\n\nPlease do the following:\n1. Create a file at /home/user/master-ops/infra/claude-automation/LAST_TEST_RUN.txt\n2. Write the current timestamp and a success message to the file\n3. Do NOT commit or push anything\n\nWhen complete, respond with: COMPLETED: Test file created successfully',
    'pending',
    'triaged',  -- Mark as triaged so it gets picked up
    'test_automation'
)
RETURNING id, title, status;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check the task was created
-- SELECT * FROM tasks WHERE title LIKE 'Test: Claude Automation%' ORDER BY created_at DESC LIMIT 1;

-- Watch task progress
-- SELECT t.id, t.title, t.status, l.message, l.created_at
-- FROM tasks t
-- LEFT JOIN task_logs l ON l.task_id = t.id
-- WHERE t.title LIKE 'Test: Claude Automation%'
-- ORDER BY l.created_at DESC;

-- Check for the test file on server:
-- ssh root@134.199.175.243 "cat /home/user/master-ops/infra/claude-automation/LAST_TEST_RUN.txt"

-- ============================================================================
-- CLEANUP (run after testing)
-- ============================================================================

-- Delete test tasks
-- DELETE FROM tasks WHERE title LIKE 'Test: Claude Automation%';

-- Delete test file (run on server)
-- ssh root@134.199.175.243 "rm -f /home/user/master-ops/infra/claude-automation/LAST_TEST_RUN.txt"
