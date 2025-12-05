/**
 * Quick test script to verify Supabase integration
 *
 * Run with: npx tsx test-supabase.ts
 */

import { supabaseClient, supabaseAPI, Task } from '../../shared/libs/supabase';

async function testSupabaseIntegration() {
  console.log('🧪 Testing Supabase Integration...\n');

  const results = {
    clientConfig: false,
    databaseConnection: false,
    tablesExist: false,
    rpcFunctions: false,
    managementAPI: false,
    error: null as string | null,
  };

  try {
    // Test 1: Check client configuration
    console.log('1️⃣ Testing client configuration...');
    if (supabaseClient.client) {
      results.clientConfig = true;
      console.log('✅ Client configured successfully');
    }
    console.log();

    // Test 2: Test database connection by fetching tasks
    console.log('2️⃣ Testing database connection...');
    try {
      const tasks = await supabaseClient.getAll<Task>('tasks', 5);
      results.databaseConnection = true;
      results.tablesExist = true;
      console.log(`✅ Connected to database`);
      console.log(`✅ Tasks table exists - found ${tasks.length} tasks`);

      if (tasks.length > 0) {
        console.log('First task:', {
          id: tasks[0].id,
          title: tasks[0].title,
          status: tasks[0].status,
          currentStep: tasks[0].current_step,
        });
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('permission denied')) {
        console.log('⚠️  Database connected but RLS is blocking access');
        console.log('   Configure SUPABASE_SERVICE_ROLE_KEY or adjust RLS policies');
        results.databaseConnection = true;
      } else {
        throw error;
      }
    }
    console.log();

    // Test 3: Test task_logs table
    console.log('3️⃣ Testing task_logs table...');
    try {
      const logs = await supabaseClient.getAll('task_logs', 5);
      console.log(`✅ Task logs table exists - found ${logs.length} log entries`);
    } catch (error) {
      console.log('⚠️  Could not access task_logs table');
    }
    console.log();

    // Test 4: Test RPC functions
    console.log('4️⃣ Testing RPC functions...');
    try {
      // Try to call get_tasks_for_retry RPC
      const tasksForRetry = await supabaseClient.rpc('get_tasks_for_retry', {
        p_max_retries: 3,
      }) as unknown[];
      results.rpcFunctions = true;
      console.log(`✅ RPC functions available - get_tasks_for_retry returned ${tasksForRetry?.length || 0} tasks`);
    } catch (error) {
      if (error instanceof Error && error.message.includes('function') && error.message.includes('does not exist')) {
        console.log('⚠️  RPC functions not found - run the schema setup from infra/supabase/SETUP.md');
      } else {
        console.log('⚠️  Could not test RPC functions:', error instanceof Error ? error.message : String(error));
      }
    }
    console.log();

    // Test 5: Test Management API (optional)
    console.log('5️⃣ Testing Management API...');
    try {
      const projects = await supabaseAPI.getProjects();
      results.managementAPI = true;
      console.log(`✅ Management API connected - found ${projects.length || 0} projects`);

      if (projects && projects.length > 0) {
        console.log('First project:', {
          id: projects[0].id || projects[0].ref,
          name: projects[0].name,
          region: projects[0].region,
        });
      }
    } catch (error) {
      console.log('⚠️  Management API not configured or error');
      console.log('   Set SUPABASE_ACCESS_TOKEN in .env to use Management API');
      console.log('   This is optional - database operations work without it');
    }
    console.log();

    // Summary
    console.log('📊 Test Summary:');
    console.log(`- Client Configuration: ${results.clientConfig ? '✅' : '❌'}`);
    console.log(`- Database Connection: ${results.databaseConnection ? '✅' : '❌'}`);
    console.log(`- Tables Exist: ${results.tablesExist ? '✅' : '❌'}`);
    console.log(`- RPC Functions: ${results.rpcFunctions ? '✅' : '⚠️  (Optional)'}`);
    console.log(`- Management API: ${results.managementAPI ? '✅' : '⚠️  (Optional)'}`);
    console.log();

    if (results.clientConfig && results.databaseConnection && results.tablesExist) {
      console.log('🎉 Core Supabase integration is working!\n');

      if (!results.rpcFunctions) {
        console.log('💡 Tip: To enable RPC functions, run the SQL from infra/supabase/SETUP.md');
      }

      if (!results.managementAPI) {
        console.log('💡 Tip: To enable Management API, set SUPABASE_ACCESS_TOKEN in .env');
      }

      return {
        success: true,
        ...results,
      };
    } else {
      console.log('⚠️  Some core features are not working. Check configuration.\n');
      return {
        success: false,
        ...results,
      };
    }

  } catch (error) {
    console.error('❌ Error testing Supabase integration:', error);
    console.error('\nPlease check:');
    console.error('1. Your .env file has correct SUPABASE_URL and SUPABASE_ANON_KEY');
    console.error('2. The credentials have the necessary permissions');
    console.error('3. Your Supabase project is accessible');
    console.error('4. The database schema has been set up (see infra/supabase/SETUP.md)\n');

    results.error = error instanceof Error ? error.message : String(error);

    return {
      success: false,
      ...results,
    };
  }
}

// Run the test
testSupabaseIntegration()
  .then(result => {
    if (result.success) {
      console.log('✨ Supabase integration test completed successfully!');
      console.log('\nNext steps:');
      console.log('- See shared/libs/supabase/README.md for usage examples');
      console.log('- See shared/libs/supabase/examples.ts for code examples');
      console.log('- See infra/supabase/SETUP.md for database setup\n');
    }
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
