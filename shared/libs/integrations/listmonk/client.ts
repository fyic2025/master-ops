/**
 * Listmonk API Client
 * Open-source email marketing platform integration
 *
 * @see https://listmonk.app/docs/apis/
 */

export interface ListmonkConfig {
  baseUrl: string;
  username: string;
  password: string;
}

export interface ListmonkSubscriber {
  id?: number;
  uuid?: string;
  email: string;
  name: string;
  status: 'enabled' | 'disabled' | 'blocklisted';
  lists?: number[];
  attribs?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface ListmonkList {
  id: number;
  uuid: string;
  name: string;
  type: 'public' | 'private';
  optin: 'single' | 'double';
  tags: string[];
  subscriber_count: number;
  created_at: string;
  updated_at: string;
}

export interface ListmonkTemplate {
  id: number;
  name: string;
  type: 'campaign' | 'tx';
  subject?: string;
  body: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface ListmonkCampaign {
  id?: number;
  uuid?: string;
  name: string;
  subject: string;
  from_email?: string;
  lists: number[];
  type: 'regular' | 'optin';
  content_type: 'richtext' | 'html' | 'plain' | 'markdown';
  body: string;
  altbody?: string;
  template_id?: number;
  tags?: string[];
  send_at?: string;
  status?: 'draft' | 'scheduled' | 'running' | 'paused' | 'finished' | 'cancelled';
  started_at?: string;
  to_send?: number;
  sent?: number;
  views?: number;
  clicks?: number;
  bounces?: number;
}

export interface TransactionalEmailRequest {
  subscriber_email?: string;
  subscriber_id?: number;
  subscriber_emails?: string[];
  template_id: number;
  from_email?: string;
  data?: Record<string, any>;
  headers?: { name: string; value: string }[];
  content_type?: 'html' | 'plain' | 'markdown';
  messenger?: string;
}

export interface ListmonkApiResponse<T> {
  data: T;
}

export interface ListmonkPaginatedResponse<T> {
  data: {
    results: T[];
    total: number;
    per_page: number;
    page: number;
  };
}

export class ListmonkClient {
  private config: ListmonkConfig;
  private authHeader: string;

  constructor(config: ListmonkConfig) {
    this.config = config;
    this.authHeader = `Basic ${Buffer.from(`${config.username}:${config.password}`).toString('base64')}`;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': this.authHeader,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Listmonk API error ${response.status}: ${errorText}`);
    }

    return response.json();
  }

  // ==========================================
  // Health Check
  // ==========================================

  async healthCheck(): Promise<boolean> {
    try {
      await this.request('/api/health');
      return true;
    } catch {
      return false;
    }
  }

  // ==========================================
  // Subscribers
  // ==========================================

  /**
   * Get all subscribers with pagination
   */
  async getSubscribers(params?: {
    page?: number;
    per_page?: number;
    query?: string;
    list_id?: number;
    subscription_status?: 'confirmed' | 'unconfirmed' | 'unsubscribed';
  }): Promise<{ subscribers: ListmonkSubscriber[]; total: number }> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.per_page) query.set('per_page', params.per_page.toString());
    if (params?.query) query.set('query', params.query);
    if (params?.list_id) query.set('list_id', params.list_id.toString());
    if (params?.subscription_status) query.set('subscription_status', params.subscription_status);

    const response = await this.request<ListmonkPaginatedResponse<ListmonkSubscriber>>(
      `/api/subscribers?${query.toString()}`
    );

    return {
      subscribers: response.data.results,
      total: response.data.total,
    };
  }

  /**
   * Get a single subscriber by ID
   */
  async getSubscriber(id: number): Promise<ListmonkSubscriber> {
    const response = await this.request<ListmonkApiResponse<ListmonkSubscriber>>(
      `/api/subscribers/${id}`
    );
    return response.data;
  }

  /**
   * Get subscriber by email
   */
  async getSubscriberByEmail(email: string): Promise<ListmonkSubscriber | null> {
    const { subscribers } = await this.getSubscribers({
      query: `subscribers.email = '${email}'`,
      per_page: 1,
    });
    return subscribers[0] || null;
  }

  /**
   * Create a new subscriber
   */
  async createSubscriber(data: {
    email: string;
    name: string;
    status?: 'enabled' | 'disabled' | 'blocklisted';
    lists?: number[];
    attribs?: Record<string, any>;
    preconfirm_subscriptions?: boolean;
  }): Promise<ListmonkSubscriber> {
    const response = await this.request<ListmonkApiResponse<ListmonkSubscriber>>(
      '/api/subscribers',
      {
        method: 'POST',
        body: JSON.stringify({
          email: data.email,
          name: data.name,
          status: data.status || 'enabled',
          lists: data.lists || [],
          attribs: data.attribs || {},
          preconfirm_subscriptions: data.preconfirm_subscriptions ?? true,
        }),
      }
    );
    return response.data;
  }

  /**
   * Update a subscriber
   */
  async updateSubscriber(
    id: number,
    data: Partial<{
      email: string;
      name: string;
      status: 'enabled' | 'disabled' | 'blocklisted';
      lists: number[];
      attribs: Record<string, any>;
    }>
  ): Promise<ListmonkSubscriber> {
    const response = await this.request<ListmonkApiResponse<ListmonkSubscriber>>(
      `/api/subscribers/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );
    return response.data;
  }

  /**
   * Delete a subscriber
   */
  async deleteSubscriber(id: number): Promise<void> {
    await this.request(`/api/subscribers/${id}`, { method: 'DELETE' });
  }

  /**
   * Block/unblock a subscriber
   */
  async blockSubscriber(id: number, block: boolean = true): Promise<ListmonkSubscriber> {
    return this.updateSubscriber(id, {
      status: block ? 'blocklisted' : 'enabled',
    });
  }

  /**
   * Add subscriber to lists
   */
  async addSubscriberToLists(id: number, listIds: number[]): Promise<void> {
    await this.request('/api/subscribers/lists', {
      method: 'PUT',
      body: JSON.stringify({
        ids: [id],
        action: 'add',
        target_list_ids: listIds,
      }),
    });
  }

  /**
   * Remove subscriber from lists
   */
  async removeSubscriberFromLists(id: number, listIds: number[]): Promise<void> {
    await this.request('/api/subscribers/lists', {
      method: 'PUT',
      body: JSON.stringify({
        ids: [id],
        action: 'remove',
        target_list_ids: listIds,
      }),
    });
  }

  /**
   * Bulk import subscribers
   */
  async bulkImportSubscribers(
    subscribers: Array<{
      email: string;
      name?: string;
      attribs?: Record<string, any>;
    }>,
    options: {
      mode: 'subscribe' | 'blocklist';
      lists: number[];
      overwrite?: boolean;
    }
  ): Promise<{ imported: number; skipped: number }> {
    const response = await this.request<{ data: { imported: number; skipped: number } }>(
      '/api/import/subscribers',
      {
        method: 'POST',
        body: JSON.stringify({
          mode: options.mode,
          lists: options.lists,
          overwrite: options.overwrite ?? false,
          data: subscribers.map((s) => ({
            email: s.email,
            name: s.name || '',
            attribs: s.attribs || {},
          })),
        }),
      }
    );
    return response.data;
  }

  // ==========================================
  // Lists
  // ==========================================

  /**
   * Get all lists
   */
  async getLists(): Promise<ListmonkList[]> {
    const response = await this.request<ListmonkApiResponse<ListmonkList[]>>('/api/lists');
    return response.data;
  }

  /**
   * Get a single list
   */
  async getList(id: number): Promise<ListmonkList> {
    const response = await this.request<ListmonkApiResponse<ListmonkList>>(`/api/lists/${id}`);
    return response.data;
  }

  /**
   * Create a new list
   */
  async createList(data: {
    name: string;
    type?: 'public' | 'private';
    optin?: 'single' | 'double';
    tags?: string[];
  }): Promise<ListmonkList> {
    const response = await this.request<ListmonkApiResponse<ListmonkList>>('/api/lists', {
      method: 'POST',
      body: JSON.stringify({
        name: data.name,
        type: data.type || 'private',
        optin: data.optin || 'single',
        tags: data.tags || [],
      }),
    });
    return response.data;
  }

  /**
   * Update a list
   */
  async updateList(
    id: number,
    data: Partial<{
      name: string;
      type: 'public' | 'private';
      optin: 'single' | 'double';
      tags: string[];
    }>
  ): Promise<ListmonkList> {
    const response = await this.request<ListmonkApiResponse<ListmonkList>>(`/api/lists/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  }

  /**
   * Delete a list
   */
  async deleteList(id: number): Promise<void> {
    await this.request(`/api/lists/${id}`, { method: 'DELETE' });
  }

  // ==========================================
  // Templates
  // ==========================================

  /**
   * Get all templates
   */
  async getTemplates(): Promise<ListmonkTemplate[]> {
    const response = await this.request<ListmonkApiResponse<ListmonkTemplate[]>>('/api/templates');
    return response.data;
  }

  /**
   * Get a single template
   */
  async getTemplate(id: number): Promise<ListmonkTemplate> {
    const response = await this.request<ListmonkApiResponse<ListmonkTemplate>>(
      `/api/templates/${id}`
    );
    return response.data;
  }

  /**
   * Create a new template
   */
  async createTemplate(data: {
    name: string;
    type: 'campaign' | 'tx';
    subject?: string;
    body: string;
  }): Promise<ListmonkTemplate> {
    const response = await this.request<ListmonkApiResponse<ListmonkTemplate>>('/api/templates', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  }

  /**
   * Update a template
   */
  async updateTemplate(
    id: number,
    data: Partial<{
      name: string;
      subject: string;
      body: string;
    }>
  ): Promise<ListmonkTemplate> {
    const response = await this.request<ListmonkApiResponse<ListmonkTemplate>>(
      `/api/templates/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );
    return response.data;
  }

  /**
   * Delete a template
   */
  async deleteTemplate(id: number): Promise<void> {
    await this.request(`/api/templates/${id}`, { method: 'DELETE' });
  }

  // ==========================================
  // Campaigns
  // ==========================================

  /**
   * Get all campaigns with pagination
   */
  async getCampaigns(params?: {
    page?: number;
    per_page?: number;
    status?: string[];
    query?: string;
  }): Promise<{ campaigns: ListmonkCampaign[]; total: number }> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.per_page) query.set('per_page', params.per_page.toString());
    if (params?.status) query.set('status', params.status.join(','));
    if (params?.query) query.set('query', params.query);

    const response = await this.request<ListmonkPaginatedResponse<ListmonkCampaign>>(
      `/api/campaigns?${query.toString()}`
    );

    return {
      campaigns: response.data.results,
      total: response.data.total,
    };
  }

  /**
   * Get a single campaign
   */
  async getCampaign(id: number): Promise<ListmonkCampaign> {
    const response = await this.request<ListmonkApiResponse<ListmonkCampaign>>(
      `/api/campaigns/${id}`
    );
    return response.data;
  }

  /**
   * Create a new campaign
   */
  async createCampaign(data: {
    name: string;
    subject: string;
    from_email?: string;
    lists: number[];
    type?: 'regular' | 'optin';
    content_type?: 'richtext' | 'html' | 'plain' | 'markdown';
    body: string;
    altbody?: string;
    template_id?: number;
    tags?: string[];
    send_at?: string;
  }): Promise<ListmonkCampaign> {
    const response = await this.request<ListmonkApiResponse<ListmonkCampaign>>('/api/campaigns', {
      method: 'POST',
      body: JSON.stringify({
        name: data.name,
        subject: data.subject,
        from_email: data.from_email,
        lists: data.lists,
        type: data.type || 'regular',
        content_type: data.content_type || 'html',
        body: data.body,
        altbody: data.altbody,
        template_id: data.template_id,
        tags: data.tags || [],
        send_at: data.send_at,
      }),
    });
    return response.data;
  }

  /**
   * Update a campaign
   */
  async updateCampaign(
    id: number,
    data: Partial<{
      name: string;
      subject: string;
      from_email: string;
      lists: number[];
      content_type: 'richtext' | 'html' | 'plain' | 'markdown';
      body: string;
      altbody: string;
      template_id: number;
      tags: string[];
      send_at: string;
    }>
  ): Promise<ListmonkCampaign> {
    const response = await this.request<ListmonkApiResponse<ListmonkCampaign>>(
      `/api/campaigns/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );
    return response.data;
  }

  /**
   * Start a campaign
   */
  async startCampaign(id: number): Promise<ListmonkCampaign> {
    const response = await this.request<ListmonkApiResponse<ListmonkCampaign>>(
      `/api/campaigns/${id}/status`,
      {
        method: 'PUT',
        body: JSON.stringify({ status: 'running' }),
      }
    );
    return response.data;
  }

  /**
   * Pause a campaign
   */
  async pauseCampaign(id: number): Promise<ListmonkCampaign> {
    const response = await this.request<ListmonkApiResponse<ListmonkCampaign>>(
      `/api/campaigns/${id}/status`,
      {
        method: 'PUT',
        body: JSON.stringify({ status: 'paused' }),
      }
    );
    return response.data;
  }

  /**
   * Cancel a campaign
   */
  async cancelCampaign(id: number): Promise<ListmonkCampaign> {
    const response = await this.request<ListmonkApiResponse<ListmonkCampaign>>(
      `/api/campaigns/${id}/status`,
      {
        method: 'PUT',
        body: JSON.stringify({ status: 'cancelled' }),
      }
    );
    return response.data;
  }

  /**
   * Delete a campaign
   */
  async deleteCampaign(id: number): Promise<void> {
    await this.request(`/api/campaigns/${id}`, { method: 'DELETE' });
  }

  /**
   * Get campaign analytics
   */
  async getCampaignAnalytics(id: number): Promise<{
    views: number;
    clicks: number;
    bounces: number;
    link_clicks: Array<{ url: string; count: number }>;
  }> {
    const campaign = await this.getCampaign(id);
    return {
      views: campaign.views || 0,
      clicks: campaign.clicks || 0,
      bounces: campaign.bounces || 0,
      link_clicks: [], // Would need separate API call for detailed link stats
    };
  }

  // ==========================================
  // Transactional Emails
  // ==========================================

  /**
   * Send a transactional email
   */
  async sendTransactional(data: TransactionalEmailRequest): Promise<void> {
    await this.request('/api/tx', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Send a transactional email to a single subscriber
   */
  async sendTransactionalToEmail(
    email: string,
    templateId: number,
    data?: Record<string, any>,
    fromEmail?: string
  ): Promise<void> {
    await this.sendTransactional({
      subscriber_email: email,
      template_id: templateId,
      data,
      from_email: fromEmail,
    });
  }

  /**
   * Send a transactional email to multiple subscribers
   */
  async sendTransactionalToEmails(
    emails: string[],
    templateId: number,
    data?: Record<string, any>,
    fromEmail?: string
  ): Promise<void> {
    await this.sendTransactional({
      subscriber_emails: emails,
      template_id: templateId,
      data,
      from_email: fromEmail,
    });
  }

  // ==========================================
  // Utility Methods
  // ==========================================

  /**
   * Get server stats
   */
  async getStats(): Promise<{
    subscribers: { total: number; enabled: number; blocklisted: number };
    lists: { total: number };
    campaigns: { total: number; running: number };
  }> {
    const response = await this.request<{
      data: {
        subscribers: { total: number; enabled: number; blocklisted: number };
        lists: { total: number };
        campaigns: { total: number; running: number };
      };
    }>('/api/dashboard/counts');
    return response.data;
  }

  /**
   * Search subscribers
   */
  async searchSubscribers(query: string, limit: number = 100): Promise<ListmonkSubscriber[]> {
    const { subscribers } = await this.getSubscribers({
      query,
      per_page: limit,
    });
    return subscribers;
  }
}

// Factory function to create client from environment variables
export function createListmonkClient(config?: Partial<ListmonkConfig>): ListmonkClient {
  return new ListmonkClient({
    baseUrl: config?.baseUrl || process.env.LISTMONK_URL || '',
    username: config?.username || process.env.LISTMONK_USERNAME || '',
    password: config?.password || process.env.LISTMONK_PASSWORD || '',
  });
}

export default ListmonkClient;
