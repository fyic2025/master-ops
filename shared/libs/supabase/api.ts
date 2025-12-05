import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Supabase Management API Client
 *
 * Provides access to Supabase Management API for project management,
 * database operations, and administrative tasks.
 *
 * Requires SUPABASE_ACCESS_TOKEN (from Supabase dashboard)
 *
 * @example
 * const api = new SupabaseManagementAPI();
 * const projects = await api.getProjects();
 */
export class SupabaseManagementAPI {
  private baseUrl: string = 'https://api.supabase.com/v1';
  private accessToken: string;

  constructor(accessToken?: string) {
    this.accessToken = accessToken || process.env.SUPABASE_ACCESS_TOKEN || '';

    if (!this.accessToken) {
      throw new Error(
        'Supabase access token is required. ' +
        'Set SUPABASE_ACCESS_TOKEN environment variable or pass it to the constructor.'
      );
    }
  }

  /**
   * Make a GET request to the Supabase Management API
   */
  private async get<T = any>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Supabase API Error (${response.status}): ${error}`);
    }

    return response.json() as T;
  }

  /**
   * Make a POST request to the Supabase Management API
   */
  private async post<T = any>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Supabase API Error (${response.status}): ${error}`);
    }

    return response.json() as T;
  }

  /**
   * Make a PATCH request to the Supabase Management API
   */
  private async patch<T = any>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Supabase API Error (${response.status}): ${error}`);
    }

    return response.json() as T;
  }

  /**
   * Make a DELETE request to the Supabase Management API
   */
  private async delete<T = any>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Supabase API Error (${response.status}): ${error}`);
    }

    // DELETE requests might not return content
    if (response.status === 204) {
      return {} as T;
    }

    return response.json() as T;
  }

  // Public API methods

  /**
   * Get all projects for the authenticated user
   */
  async getProjects() {
    return this.get('/projects');
  }

  /**
   * Get a specific project by ID
   */
  async getProject(projectId: string) {
    return this.get(`/projects/${projectId}`);
  }

  /**
   * Get project API keys
   */
  async getProjectAPIKeys(projectId: string) {
    return this.get(`/projects/${projectId}/api-keys`);
  }

  /**
   * Get project configuration
   */
  async getProjectConfig(projectId: string) {
    return this.get(`/projects/${projectId}/config`);
  }

  /**
   * Update project configuration
   */
  async updateProjectConfig(projectId: string, config: Record<string, any>) {
    return this.patch(`/projects/${projectId}/config`, config);
  }

  /**
   * Get database schema
   */
  async getDatabaseSchema(projectId: string) {
    return this.get(`/projects/${projectId}/database/schema`);
  }

  /**
   * Get database tables
   */
  async getDatabaseTables(projectId: string) {
    return this.get(`/projects/${projectId}/database/tables`);
  }

  /**
   * Get a specific table schema
   */
  async getTableSchema(projectId: string, tableName: string) {
    return this.get(`/projects/${projectId}/database/tables/${tableName}`);
  }

  /**
   * Execute SQL query (use with caution)
   */
  async executeSql(projectId: string, sql: string) {
    return this.post(`/projects/${projectId}/database/query`, { query: sql });
  }

  /**
   * Get database functions
   */
  async getDatabaseFunctions(projectId: string) {
    return this.get(`/projects/${projectId}/database/functions`);
  }

  /**
   * Get storage buckets
   */
  async getStorageBuckets(projectId: string) {
    return this.get(`/projects/${projectId}/storage/buckets`);
  }

  /**
   * Create a storage bucket
   */
  async createStorageBucket(
    projectId: string,
    name: string,
    options?: {
      public?: boolean;
      fileSizeLimit?: number;
      allowedMimeTypes?: string[];
    }
  ) {
    return this.post(`/projects/${projectId}/storage/buckets`, {
      name,
      ...options,
    });
  }

  /**
   * Get authentication settings
   */
  async getAuthSettings(projectId: string) {
    return this.get(`/projects/${projectId}/auth/config`);
  }

  /**
   * Update authentication settings
   */
  async updateAuthSettings(projectId: string, settings: Record<string, any>) {
    return this.patch(`/projects/${projectId}/auth/config`, settings);
  }

  /**
   * Get authentication users
   */
  async getAuthUsers(projectId: string, options?: { page?: number; perPage?: number }) {
    return this.get(`/projects/${projectId}/auth/users`, options);
  }

  /**
   * Get project health status
   */
  async getProjectHealth(projectId: string) {
    return this.get(`/projects/${projectId}/health`);
  }

  /**
   * Get project usage statistics
   */
  async getProjectUsage(projectId: string) {
    return this.get(`/projects/${projectId}/usage`);
  }

  /**
   * Get organizations
   */
  async getOrganizations() {
    return this.get('/organizations');
  }

  /**
   * Get organization by ID
   */
  async getOrganization(orgId: string) {
    return this.get(`/organizations/${orgId}`);
  }

  /**
   * Get organization members
   */
  async getOrganizationMembers(orgId: string) {
    return this.get(`/organizations/${orgId}/members`);
  }

  /**
   * Invite member to organization
   */
  async inviteOrganizationMember(orgId: string, email: string, role: string = 'member') {
    return this.post(`/organizations/${orgId}/members`, { email, role });
  }

  /**
   * Get Edge Functions for a project
   */
  async getEdgeFunctions(projectId: string) {
    return this.get(`/projects/${projectId}/functions`);
  }

  /**
   * Get a specific Edge Function
   */
  async getEdgeFunction(projectId: string, functionName: string) {
    return this.get(`/projects/${projectId}/functions/${functionName}`);
  }

  /**
   * Get database migrations
   */
  async getDatabaseMigrations(projectId: string) {
    return this.get(`/projects/${projectId}/database/migrations`);
  }

  /**
   * Get database extensions
   */
  async getDatabaseExtensions(projectId: string) {
    return this.get(`/projects/${projectId}/database/extensions`);
  }

  /**
   * Enable a database extension
   */
  async enableDatabaseExtension(projectId: string, extensionName: string) {
    return this.post(`/projects/${projectId}/database/extensions`, { name: extensionName });
  }

  /**
   * Disable a database extension
   */
  async disableDatabaseExtension(projectId: string, extensionName: string) {
    return this.delete(`/projects/${projectId}/database/extensions/${extensionName}`);
  }
}

// Export a default instance for convenience
export const supabaseAPI = new SupabaseManagementAPI();
