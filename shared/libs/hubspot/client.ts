import { Client } from '@hubspot/api-client';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * HubSpot API Client (SDK-based)
 *
 * This class provides a wrapper around the official HubSpot SDK client.
 * It automatically loads credentials from environment variables.
 *
 * @example
 * const hubspot = new HubSpotClient();
 * const contacts = await hubspot.client.crm.contacts.getAll();
 */
export class HubSpotClient {
  public client: Client;
  private accessToken: string;

  constructor(accessToken?: string) {
    this.accessToken = accessToken || process.env.HUBSPOT_ACCESS_TOKEN || '';

    if (!this.accessToken) {
      throw new Error(
        'HubSpot access token is required. ' +
        'Set HUBSPOT_ACCESS_TOKEN environment variable or pass it to the constructor.'
      );
    }

    this.client = new Client({
      accessToken: this.accessToken,
    });
  }

  /**
   * Get all contacts
   */
  async getContacts(limit: number = 100) {
    try {
      const response = await this.client.crm.contacts.getAll(limit);
      return response;
    } catch (error) {
      console.error('Error fetching contacts:', error);
      throw error;
    }
  }

  /**
   * Search contacts by criteria
   */
  async searchContacts(filterGroups: any[]) {
    try {
      const response = await this.client.crm.contacts.searchApi.doSearch({
        filterGroups,
        limit: 100,
      });
      return response;
    } catch (error) {
      console.error('Error searching contacts:', error);
      throw error;
    }
  }

  /**
   * Create a new contact
   */
  async createContact(properties: Record<string, any>) {
    try {
      const response = await this.client.crm.contacts.basicApi.create({
        properties,
      });
      return response;
    } catch (error) {
      console.error('Error creating contact:', error);
      throw error;
    }
  }

  /**
   * Update a contact by ID
   */
  async updateContact(contactId: string, properties: Record<string, any>) {
    try {
      const response = await this.client.crm.contacts.basicApi.update(contactId, {
        properties,
      });
      return response;
    } catch (error) {
      console.error('Error updating contact:', error);
      throw error;
    }
  }

  /**
   * Get all companies
   */
  async getCompanies(limit: number = 100) {
    try {
      const response = await this.client.crm.companies.getAll(limit);
      return response;
    } catch (error) {
      console.error('Error fetching companies:', error);
      throw error;
    }
  }

  /**
   * Get all deals
   */
  async getDeals(limit: number = 100) {
    try {
      const response = await this.client.crm.deals.getAll(limit);
      return response;
    } catch (error) {
      console.error('Error fetching deals:', error);
      throw error;
    }
  }

  /**
   * Create a new deal
   */
  async createDeal(properties: Record<string, any>) {
    try {
      const response = await this.client.crm.deals.basicApi.create({
        properties,
      });
      return response;
    } catch (error) {
      console.error('Error creating deal:', error);
      throw error;
    }
  }

  /**
   * Get contact by email
   */
  async getContactByEmail(email: string) {
    try {
      const response = await this.client.crm.contacts.searchApi.doSearch({
        filterGroups: [
          {
            filters: [
              {
                propertyName: 'email',
                operator: 'EQ',
                value: email,
              },
            ],
          },
        ],
        limit: 1,
      });
      return response.results[0] || null;
    } catch (error) {
      console.error('Error fetching contact by email:', error);
      throw error;
    }
  }
}

// Export a default instance for convenience
export const hubspotClient = new HubSpotClient();
