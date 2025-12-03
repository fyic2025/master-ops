/**
 * Apify API Client
 *
 * TypeScript client for Apify web scraping platform.
 * Focused on lead generation via Google Maps scraper.
 *
 * Usage:
 *   import { ApifyClient } from './apify-client'
 *   const client = new ApifyClient()
 *   const results = await client.runGoogleMapsScraper('gyms Sydney')
 */

import * as https from 'https'

// ============================================================================
// Types
// ============================================================================

export interface ApifyConfig {
  token: string
  baseUrl?: string
}

export interface GoogleMapsInput {
  searchStringsArray: string[]
  maxCrawledPlacesPerSearch?: number
  language?: string
  includeContactInfo?: boolean
  includeWebsite?: boolean
  includeOpeningHours?: boolean
}

export interface ApifyRun {
  id: string
  actId: string
  status: 'READY' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'ABORTED' | 'TIMED-OUT'
  startedAt: string
  finishedAt?: string
  defaultDatasetId: string
  defaultKeyValueStoreId: string
  usageTotalUsd?: number
}

export interface ApifyLead {
  title: string
  categoryName: string
  address: string
  city?: string
  state?: string
  postalCode?: string
  phone?: string
  website?: string
  email?: string
  totalScore?: number
  reviewsCount?: number
  placeId: string
  url: string
}

export interface ApifyUsage {
  monthlyUsageUsd: number
  maxMonthlyUsageUsd: number
  monthlyActorComputeUnits: number
  cycleStartAt: string
  cycleEndAt: string
}

// ============================================================================
// Client Class
// ============================================================================

export class ApifyClient {
  private token: string
  private baseUrl: string

  constructor(config?: Partial<ApifyConfig>) {
    this.token = config?.token || process.env.APIFY_TOKEN || ''
    this.baseUrl = config?.baseUrl || 'https://api.apify.com/v2'

    if (!this.token) {
      throw new Error('APIFY_TOKEN not provided. Set via config or environment variable.')
    }
  }

  // --------------------------------------------------------------------------
  // HTTP Request Helper
  // --------------------------------------------------------------------------

  private async request<T>(
    method: 'GET' | 'POST' | 'DELETE',
    path: string,
    body?: any
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseUrl)
      const postData = body ? JSON.stringify(body) : ''

      const options = {
        hostname: url.hostname,
        port: 443,
        path: url.pathname + url.search,
        method,
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
          ...(body && { 'Content-Length': Buffer.byteLength(postData) })
        }
      }

      const req = https.request(options, (res) => {
        let data = ''
        res.on('data', chunk => data += chunk)
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`Apify API Error (${res.statusCode}): ${data}`))
          } else {
            try {
              resolve(JSON.parse(data))
            } catch {
              resolve(data as unknown as T)
            }
          }
        })
      })

      req.on('error', reject)
      if (body) req.write(postData)
      req.end()
    })
  }

  // --------------------------------------------------------------------------
  // Usage & Account
  // --------------------------------------------------------------------------

  /**
   * Get current usage and limits
   */
  async getUsage(): Promise<ApifyUsage> {
    const response = await this.request<{ data: any }>('GET', '/users/me/limits')
    const limits = response.data

    return {
      monthlyUsageUsd: limits.current.monthlyUsageUsd,
      maxMonthlyUsageUsd: limits.limits.maxMonthlyUsageUsd,
      monthlyActorComputeUnits: limits.current.monthlyActorComputeUnits,
      cycleStartAt: limits.monthlyUsageCycle.startAt,
      cycleEndAt: limits.monthlyUsageCycle.endAt
    }
  }

  /**
   * Get remaining budget
   */
  async getRemainingBudget(): Promise<{ remaining: number; used: number; total: number }> {
    const usage = await this.getUsage()
    return {
      remaining: usage.maxMonthlyUsageUsd - usage.monthlyUsageUsd,
      used: usage.monthlyUsageUsd,
      total: usage.maxMonthlyUsageUsd
    }
  }

  // --------------------------------------------------------------------------
  // Actor Runs
  // --------------------------------------------------------------------------

  /**
   * Run Google Maps scraper
   */
  async runGoogleMapsScraper(
    searchQueries: string | string[],
    options: Partial<GoogleMapsInput> = {}
  ): Promise<ApifyRun> {
    const queries = Array.isArray(searchQueries) ? searchQueries : [searchQueries]

    const input: GoogleMapsInput = {
      searchStringsArray: queries,
      maxCrawledPlacesPerSearch: options.maxCrawledPlacesPerSearch || 50,
      language: options.language || 'en',
      includeContactInfo: options.includeContactInfo ?? true,
      includeWebsite: options.includeWebsite ?? true,
      includeOpeningHours: options.includeOpeningHours ?? false,
      ...options
    }

    const response = await this.request<{ data: ApifyRun }>(
      'POST',
      '/acts/compass~crawler-google-places/runs',
      input
    )

    return response.data
  }

  /**
   * Get run status
   */
  async getRunStatus(runId: string): Promise<ApifyRun> {
    const response = await this.request<{ data: ApifyRun }>('GET', `/actor-runs/${runId}`)
    return response.data
  }

  /**
   * Wait for run to complete
   */
  async waitForRun(runId: string, pollIntervalMs: number = 10000): Promise<ApifyRun> {
    let run = await this.getRunStatus(runId)

    while (run.status === 'RUNNING' || run.status === 'READY') {
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs))
      run = await this.getRunStatus(runId)
    }

    return run
  }

  /**
   * List recent runs
   */
  async listRuns(limit: number = 10): Promise<ApifyRun[]> {
    const response = await this.request<{ data: { items: ApifyRun[] } }>(
      'GET',
      `/actor-runs?limit=${limit}`
    )
    return response.data.items
  }

  // --------------------------------------------------------------------------
  // Datasets
  // --------------------------------------------------------------------------

  /**
   * Get dataset items (scraped results)
   */
  async getDatasetItems<T = ApifyLead>(datasetId: string): Promise<T[]> {
    const response = await this.request<T[]>(
      'GET',
      `/datasets/${datasetId}/items?clean=true`
    )
    return response
  }

  /**
   * Get leads from a completed run
   */
  async getLeadsFromRun(runId: string): Promise<ApifyLead[]> {
    const run = await this.getRunStatus(runId)
    if (run.status !== 'SUCCEEDED') {
      throw new Error(`Run ${runId} has not succeeded. Status: ${run.status}`)
    }
    return this.getDatasetItems<ApifyLead>(run.defaultDatasetId)
  }

  // --------------------------------------------------------------------------
  // Convenience Methods
  // --------------------------------------------------------------------------

  /**
   * Run scraper and wait for results
   */
  async scrapeGoogleMaps(
    searchQueries: string | string[],
    options: Partial<GoogleMapsInput> = {}
  ): Promise<{ run: ApifyRun; leads: ApifyLead[] }> {
    const run = await this.runGoogleMapsScraper(searchQueries, options)
    console.log(`Started run ${run.id}...`)

    const completedRun = await this.waitForRun(run.id)
    console.log(`Run completed with status: ${completedRun.status}`)

    if (completedRun.status !== 'SUCCEEDED') {
      throw new Error(`Run failed with status: ${completedRun.status}`)
    }

    const leads = await this.getDatasetItems<ApifyLead>(completedRun.defaultDatasetId)
    console.log(`Retrieved ${leads.length} leads`)

    return { run: completedRun, leads }
  }

  /**
   * Transform Apify lead to our standard format
   */
  static transformLead(apifyLead: ApifyLead): Record<string, any> {
    return {
      business_name: apifyLead.title,
      business_type: apifyLead.categoryName,
      address: apifyLead.address,
      city: apifyLead.city || '',
      state: apifyLead.state || '',
      postcode: apifyLead.postalCode || '',
      phone: apifyLead.phone || '',
      website: apifyLead.website || '',
      email: apifyLead.email || null,
      google_rating: apifyLead.totalScore,
      review_count: apifyLead.reviewsCount || 0,
      google_place_id: apifyLead.placeId,
      google_url: apifyLead.url,
      scraped_at: new Date().toISOString()
    }
  }
}

// ============================================================================
// CLI Usage
// ============================================================================

if (require.main === module) {
  const args = process.argv.slice(2)

  async function main() {
    // Load token from vault if not in env
    if (!process.env.APIFY_TOKEN) {
      const { execSync } = require('child_process')
      try {
        const token = execSync('node creds.js get global apify_token', {
          cwd: process.cwd().replace(/\\.claude.*$/, ''),
          encoding: 'utf8'
        }).trim()
        process.env.APIFY_TOKEN = token
      } catch (e) {
        console.error('Failed to load APIFY_TOKEN from vault')
        process.exit(1)
      }
    }

    const client = new ApifyClient()

    if (args[0] === 'usage') {
      const usage = await client.getUsage()
      console.log('\n=== Apify Usage ===')
      console.log(`Spent: $${usage.monthlyUsageUsd.toFixed(4)}`)
      console.log(`Limit: $${usage.maxMonthlyUsageUsd}`)
      console.log(`Remaining: $${(usage.maxMonthlyUsageUsd - usage.monthlyUsageUsd).toFixed(2)}`)
      console.log(`Cycle: ${new Date(usage.cycleStartAt).toLocaleDateString()} - ${new Date(usage.cycleEndAt).toLocaleDateString()}`)

    } else if (args[0] === 'runs') {
      const runs = await client.listRuns(parseInt(args[1]) || 5)
      console.log('\n=== Recent Runs ===')
      runs.forEach(r => {
        console.log(`${r.id} | ${r.status} | ${new Date(r.startedAt).toLocaleString()}`)
      })

    } else if (args[0] === 'scrape' && args[1]) {
      const query = args.slice(1).join(' ')
      console.log(`Scraping: "${query}"...`)
      const { run, leads } = await client.scrapeGoogleMaps(query, { maxCrawledPlacesPerSearch: 10 })
      console.log(`\nResults (${leads.length}):`)
      leads.slice(0, 5).forEach(l => {
        console.log(`- ${l.title} | ${l.phone || 'no phone'} | ${l.website || 'no website'}`)
      })

    } else {
      console.log(`
Apify Client CLI

Usage:
  npx tsx apify-client.ts usage          Check monthly usage
  npx tsx apify-client.ts runs [limit]   List recent runs
  npx tsx apify-client.ts scrape <query> Run Google Maps scrape

Examples:
  npx tsx apify-client.ts usage
  npx tsx apify-client.ts scrape gyms Sydney Australia
      `)
    }
  }

  main().catch(console.error)
}
