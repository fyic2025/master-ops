import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * HubSpot API (Direct HTTP calls)
 *
 * This class provides direct HTTP API access to HubSpot without using the SDK.
 * Useful for endpoints not yet covered by the SDK or for lightweight operations.
 *
 * @example
 * const api = new HubSpotAPI();
 * const contacts = await api.get('/crm/v3/objects/contacts');
 */
export class HubSpotAPI {
  private baseUrl: string = 'https://api.hubapi.com';
  private accessToken: string;

  constructor(accessToken?: string) {
    this.accessToken = accessToken || process.env.HUBSPOT_ACCESS_TOKEN || '';

    if (!this.accessToken) {
      throw new Error(
        'HubSpot access token is required. ' +
        'Set HUBSPOT_ACCESS_TOKEN environment variable or pass it to the constructor.'
      );
    }
  }

  /**
   * Make a GET request to the HubSpot API
   */
  async get<T = any>(endpoint: string, params?: Record<string, any>): Promise<T> {
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
      throw new Error(`HubSpot API Error (${response.status}): ${error}`);
    }

    return response.json();
  }

  /**
   * Make a POST request to the HubSpot API
   */
  async post<T = any>(endpoint: string, data: any): Promise<T> {
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
      throw new Error(`HubSpot API Error (${response.status}): ${error}`);
    }

    return response.json();
  }

  /**
   * Make a PATCH request to the HubSpot API
   */
  async patch<T = any>(endpoint: string, data: any): Promise<T> {
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
      throw new Error(`HubSpot API Error (${response.status}): ${error}`);
    }

    return response.json();
  }

  /**
   * Make a PUT request to the HubSpot API
   */
  async put<T = any>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HubSpot API Error (${response.status}): ${error}`);
    }

    return response.json();
  }

  /**
   * Make a DELETE request to the HubSpot API
   */
  async delete<T = any>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HubSpot API Error (${response.status}): ${error}`);
    }

    // DELETE requests might not return content
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  // Convenience methods for common operations

  /**
   * Get all contacts
   */
  async getContacts(limit: number = 100) {
    return this.get('/crm/v3/objects/contacts', { limit });
  }

  /**
   * Get contact by ID
   */
  async getContactById(contactId: string) {
    return this.get(`/crm/v3/objects/contacts/${contactId}`);
  }

  /**
   * Create a contact
   */
  async createContact(properties: Record<string, any>) {
    return this.post('/crm/v3/objects/contacts', { properties });
  }

  /**
   * Update a contact
   */
  async updateContact(contactId: string, properties: Record<string, any>) {
    return this.patch(`/crm/v3/objects/contacts/${contactId}`, { properties });
  }

  /**
   * Delete a contact
   */
  async deleteContact(contactId: string) {
    return this.delete(`/crm/v3/objects/contacts/${contactId}`);
  }

  /**
   * Search contacts
   */
  async searchContacts(filterGroups: any[], limit: number = 100) {
    return this.post('/crm/v3/objects/contacts/search', {
      filterGroups,
      limit,
    });
  }

  /**
   * Get all companies
   */
  async getCompanies(limit: number = 100) {
    return this.get('/crm/v3/objects/companies', { limit });
  }

  /**
   * Get all deals
   */
  async getDeals(limit: number = 100) {
    return this.get('/crm/v3/objects/deals', { limit });
  }

  /**
   * Create a deal
   */
  async createDeal(properties: Record<string, any>) {
    return this.post('/crm/v3/objects/deals', { properties });
  }

  /**
   * Get account information
   */
  async getAccountInfo() {
    return this.get('/account-info/v3/details');
  }
}

// Export a default instance for convenience
export const hubspotAPI = new HubSpotAPI();
