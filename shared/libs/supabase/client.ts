import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Supabase Client Wrapper
 *
 * Provides configured Supabase clients for database operations.
 * Supports both standard (RLS-aware) and service role (full access) clients.
 *
 * @example
 * const client = new SupabaseClientWrapper();
 * const { data, error } = await client.client.from('tasks').select('*');
 */
export class SupabaseClientWrapper {
  public client: SupabaseClient;
  public serviceClient: SupabaseClient | null = null;
  private supabaseUrl: string;
  private supabaseAnonKey: string;
  private supabaseServiceRoleKey?: string;

  constructor(
    url?: string,
    anonKey?: string,
    serviceRoleKey?: string
  ) {
    this.supabaseUrl = url || process.env.SUPABASE_URL || '';
    this.supabaseAnonKey = anonKey || process.env.SUPABASE_ANON_KEY || '';
    this.supabaseServiceRoleKey = serviceRoleKey || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!this.supabaseUrl || !this.supabaseAnonKey) {
      throw new Error(
        'Supabase URL and anon key are required. ' +
        'Set SUPABASE_URL and SUPABASE_ANON_KEY environment variables or pass them to the constructor.'
      );
    }

    // Create standard client (respects RLS)
    this.client = createClient(this.supabaseUrl, this.supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
      },
    });

    // Create service role client if key is provided (bypasses RLS)
    if (this.supabaseServiceRoleKey) {
      this.serviceClient = createClient(this.supabaseUrl, this.supabaseServiceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
    }
  }

  /**
   * Get all records from a table
   */
  async getAll<T>(table: string, limit?: number): Promise<T[]> {
    let query = this.client.from(table).select('*');

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Error fetching ${table}: ${error.message}`);
    }

    return (data as T[]) || [];
  }

  /**
   * Get a single record by ID
   */
  async getById<T>(table: string, id: string | number): Promise<T | null> {
    const { data, error } = await this.client
      .from(table)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Error fetching ${table} by ID: ${error.message}`);
    }

    return data as T;
  }

  /**
   * Insert a new record
   */
  async insert<T>(table: string, record: Partial<T>): Promise<T> {
    const { data, error } = await this.client
      .from(table)
      .insert(record)
      .select()
      .single();

    if (error) {
      throw new Error(`Error inserting into ${table}: ${error.message}`);
    }

    return data as T;
  }

  /**
   * Insert multiple records
   */
  async insertMany<T>(table: string, records: Partial<T>[]): Promise<T[]> {
    const { data, error } = await this.client
      .from(table)
      .insert(records)
      .select();

    if (error) {
      throw new Error(`Error inserting multiple into ${table}: ${error.message}`);
    }

    return (data as T[]) || [];
  }

  /**
   * Update a record by ID
   */
  async update<T>(table: string, id: string | number, updates: Partial<T>): Promise<T> {
    const { data, error } = await this.client
      .from(table)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Error updating ${table}: ${error.message}`);
    }

    return data as T;
  }

  /**
   * Delete a record by ID
   */
  async delete(table: string, id: string | number): Promise<void> {
    const { error } = await this.client
      .from(table)
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Error deleting from ${table}: ${error.message}`);
    }
  }

  /**
   * Query with custom filters
   */
  async query<T>(
    table: string,
    filters: Record<string, any>,
    options?: {
      select?: string;
      limit?: number;
      orderBy?: { column: string; ascending?: boolean };
    }
  ): Promise<T[]> {
    let query = this.client.from(table).select(options?.select || '*');

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });

    // Apply ordering
    if (options?.orderBy) {
      query = query.order(options.orderBy.column, {
        ascending: options.orderBy.ascending ?? true,
      });
    }

    // Apply limit
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Error querying ${table}: ${error.message}`);
    }

    return (data as T[]) || [];
  }

  /**
   * Call a Supabase RPC function
   */
  async rpc<T>(functionName: string, params?: Record<string, any>): Promise<T> {
    const { data, error } = await this.client.rpc(functionName, params);

    if (error) {
      throw new Error(`Error calling RPC ${functionName}: ${error.message}`);
    }

    return data as T;
  }

  /**
   * Use service role client for operations that bypass RLS
   */
  async withServiceRole<T>(callback: (client: SupabaseClient) => Promise<T>): Promise<T> {
    if (!this.serviceClient) {
      throw new Error('Service role client is not configured. Set SUPABASE_SERVICE_ROLE_KEY.');
    }

    return callback(this.serviceClient);
  }

  /**
   * Subscribe to real-time changes on a table
   */
  subscribe(
    table: string,
    callback: (payload: any) => void,
    event: 'INSERT' | 'UPDATE' | 'DELETE' | '*' = '*'
  ) {
    return this.client
      .channel(`${table}_changes`)
      .on(
        'postgres_changes' as any,
        { event, schema: 'public', table } as any,
        callback
      )
      .subscribe();
  }

  /**
   * Perform a full-text search
   */
  async search<T>(
    table: string,
    column: string,
    query: string,
    options?: { limit?: number }
  ): Promise<T[]> {
    let search = this.client
      .from(table)
      .select('*')
      .textSearch(column, query);

    if (options?.limit) {
      search = search.limit(options.limit);
    }

    const { data, error } = await search;

    if (error) {
      throw new Error(`Error searching ${table}: ${error.message}`);
    }

    return (data as T[]) || [];
  }

  /**
   * Upload a file to Supabase Storage
   */
  async uploadFile(
    bucket: string,
    path: string,
    file: File | Buffer,
    options?: { contentType?: string; cacheControl?: string }
  ): Promise<{ path: string; url: string }> {
    const { data, error } = await this.client.storage
      .from(bucket)
      .upload(path, file, {
        contentType: options?.contentType,
        cacheControl: options?.cacheControl,
      });

    if (error) {
      throw new Error(`Error uploading file: ${error.message}`);
    }

    const { data: urlData } = this.client.storage
      .from(bucket)
      .getPublicUrl(path);

    return {
      path: data.path,
      url: urlData.publicUrl,
    };
  }

  /**
   * Download a file from Supabase Storage
   */
  async downloadFile(bucket: string, path: string): Promise<Blob> {
    const { data, error } = await this.client.storage
      .from(bucket)
      .download(path);

    if (error) {
      throw new Error(`Error downloading file: ${error.message}`);
    }

    return data;
  }

  /**
   * List files in a bucket
   */
  async listFiles(bucket: string, path: string = '') {
    const { data, error } = await this.client.storage
      .from(bucket)
      .list(path);

    if (error) {
      throw new Error(`Error listing files: ${error.message}`);
    }

    return data;
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(bucket: string, path: string): Promise<void> {
    const { error } = await this.client.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      throw new Error(`Error deleting file: ${error.message}`);
    }
  }
}

// Export a default instance for convenience
export const supabaseClient = new SupabaseClientWrapper();
