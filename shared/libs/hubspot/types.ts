/**
 * Common HubSpot types and interfaces
 */

export interface HubSpotContact {
  id: string;
  properties: {
    email?: string;
    firstname?: string;
    lastname?: string;
    phone?: string;
    company?: string;
    website?: string;
    lifecyclestage?: string;
    hs_lead_status?: string;
    createdate?: string;
    lastmodifieddate?: string;
    [key: string]: any;
  };
  createdAt: string;
  updatedAt: string;
  archived: boolean;
}

export interface HubSpotCompany {
  id: string;
  properties: {
    name?: string;
    domain?: string;
    city?: string;
    state?: string;
    country?: string;
    industry?: string;
    phone?: string;
    numberofemployees?: string;
    annualrevenue?: string;
    createdate?: string;
    lastmodifieddate?: string;
    [key: string]: any;
  };
  createdAt: string;
  updatedAt: string;
  archived: boolean;
}

export interface HubSpotDeal {
  id: string;
  properties: {
    dealname?: string;
    amount?: string;
    dealstage?: string;
    pipeline?: string;
    closedate?: string;
    createdate?: string;
    lastmodifieddate?: string;
    [key: string]: any;
  };
  createdAt: string;
  updatedAt: string;
  archived: boolean;
}

export interface HubSpotSearchFilter {
  propertyName: string;
  operator: 'EQ' | 'NEQ' | 'LT' | 'LTE' | 'GT' | 'GTE' | 'CONTAINS_TOKEN' | 'NOT_CONTAINS_TOKEN';
  value: string | number;
}

export interface HubSpotSearchFilterGroup {
  filters: HubSpotSearchFilter[];
}

export interface HubSpotSearchRequest {
  filterGroups: HubSpotSearchFilterGroup[];
  sorts?: Array<{
    propertyName: string;
    direction: 'ASCENDING' | 'DESCENDING';
  }>;
  properties?: string[];
  limit?: number;
  after?: string;
}

export interface HubSpotSearchResponse<T> {
  total: number;
  results: T[];
  paging?: {
    next?: {
      after: string;
      link: string;
    };
  };
}

export interface HubSpotBatchRequest {
  inputs: Array<{
    id?: string;
    properties: Record<string, any>;
  }>;
}

export interface HubSpotError {
  status: string;
  message: string;
  correlationId: string;
  category: string;
  subCategory?: string;
  errors?: Array<{
    message: string;
    in?: string;
    code?: string;
  }>;
}

export interface HubSpotAssociation {
  from: {
    id: string;
  };
  to: {
    id: string;
  };
  type: string;
}

export interface HubSpotProperty {
  name: string;
  label: string;
  type: string;
  fieldType: string;
  description?: string;
  groupName: string;
  options?: Array<{
    label: string;
    value: string;
    description?: string;
    displayOrder: number;
    hidden: boolean;
  }>;
  createdAt?: string;
  updatedAt?: string;
  archived?: boolean;
}
