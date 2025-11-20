/**
 * Supabase Integration Library
 *
 * Provides comprehensive access to Supabase:
 * 1. Database Client - Supabase client for database operations (CRUD, queries, RPC, real-time)
 * 2. Management API - Supabase Management API for project administration
 * 3. Type Definitions - Full TypeScript types for tasks and database schema
 *
 * @example Using Database Client
 * import { SupabaseClientWrapper } from './shared/libs/supabase';
 * const client = new SupabaseClientWrapper();
 * const tasks = await client.getAll('tasks');
 *
 * @example Using Management API
 * import { SupabaseManagementAPI } from './shared/libs/supabase';
 * const api = new SupabaseManagementAPI();
 * const projects = await api.getProjects();
 *
 * @example Using Default Instances
 * import { supabaseClient, supabaseAPI } from './shared/libs/supabase';
 * const tasks = await supabaseClient.getAll('tasks');
 * const projects = await supabaseAPI.getProjects();
 *
 * @example Using Types
 * import { Task, TaskLog } from './shared/libs/supabase';
 */

// Export classes
export { SupabaseClientWrapper, supabaseClient } from './client';
export { SupabaseManagementAPI, supabaseAPI } from './api';

// Export types
export * from './types';

// Re-export the existing infra client for backwards compatibility
export { supabase, serviceClient, type Database as InfraDatabase } from '../../../infra/supabase/client';
