/**
 * HubSpot Integration Library
 *
 * Provides three ways to access HubSpot:
 * 1. SDK Client - Official HubSpot Node.js SDK (recommended for most use cases)
 * 2. Direct API - Direct HTTP calls to HubSpot API (for advanced use cases)
 * 3. Default Instances - Pre-configured instances for quick access
 *
 * @example Using SDK Client
 * import { HubSpotClient } from './shared/libs/hubspot';
 * const hubspot = new HubSpotClient();
 * const contacts = await hubspot.getContacts();
 *
 * @example Using Direct API
 * import { HubSpotAPI } from './shared/libs/hubspot';
 * const api = new HubSpotAPI();
 * const contacts = await api.getContacts();
 *
 * @example Using Default Instances
 * import { hubspotClient, hubspotAPI } from './shared/libs/hubspot';
 * const contacts = await hubspotClient.getContacts();
 */

// Export classes
export { HubSpotClient, hubspotClient } from './client';
export { HubSpotAPI, hubspotAPI } from './api';

// Export types
export * from './types';
