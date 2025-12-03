import { NextResponse } from 'next/server'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0

// DO API token from environment
const DO_TOKEN = process.env.DO_API_TOKEN

interface DropletInfo {
  id: string
  name: string
  displayName: string
  ip: string
  vcpus: number
  memoryMb: number
  diskGb: number
  region: string
  status: 'active' | 'offline' | 'unknown'
  containers: ContainerInfo[]
  metrics: DropletMetrics | null
}

interface ContainerInfo {
  name: string
  status: string
  image: string
}

interface DropletMetrics {
  cpuPercent: number
  memoryUsedMb: number
  memoryTotalMb: number
  memoryPercent: number
  diskUsedGb: number
  diskTotalGb: number
  diskPercent: number
  loadAverage: string
  uptime: string
}

// Friendly names and known containers for droplets
const DROPLET_CONFIG: Record<string, { displayName: string; containers: ContainerInfo[] }> = {
  'ubuntu-s-2vcpu-4gb-120gb-intel-syd1-01': {
    displayName: 'n8n-primary',
    containers: [
      { name: 'n8n-n8n-1', status: 'Up (healthy)', image: 'n8nio/n8n:latest' },
      { name: 'n8n-caddy-1', status: 'Up', image: 'caddy:2' },
      { name: 'n8n-watchtower-1', status: 'Up (healthy)', image: 'containrrr/watchtower' },
    ],
  },
  'ubuntu-s-2vcpu-4gb-amd-syd1-01': {
    displayName: 'n8n-secondary',
    containers: [],
  },
}

interface DODroplet {
  id: number
  name: string
  memory: number
  vcpus: number
  disk: number
  status: string
  region: { slug: string; name: string }
  networks: {
    v4: Array<{ ip_address: string; type: string }>
  }
}

async function fetchDropletsFromDO(): Promise<DODroplet[]> {
  if (!DO_TOKEN) {
    console.error('DO_API_TOKEN not configured')
    return []
  }

  try {
    const response = await fetch('https://api.digitalocean.com/v2/droplets', {
      headers: {
        'Authorization': `Bearer ${DO_TOKEN}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error(`DO API error: ${response.status}`)
    }

    const data = await response.json()
    return data.droplets || []
  } catch (error) {
    console.error('Failed to fetch from DO API:', error)
    return []
  }
}

async function fetchDOMetric(dropletId: string, metric: string): Promise<number | null> {
  if (!DO_TOKEN) return null

  const now = Math.floor(Date.now() / 1000)
  const fiveMinutesAgo = now - 300

  try {
    const response = await fetch(
      `https://api.digitalocean.com/v2/monitoring/metrics/droplet/${metric}?host_id=${dropletId}&start=${fiveMinutesAgo}&end=${now}`,
      {
        headers: {
          'Authorization': `Bearer ${DO_TOKEN}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }
    )

    if (!response.ok) return null

    const data = await response.json()
    const values = data.data?.result?.[0]?.values
    if (!values || values.length === 0) return null

    // Get the most recent value
    const latestValue = parseFloat(values[values.length - 1][1])
    return isNaN(latestValue) ? null : latestValue
  } catch (error) {
    return null
  }
}

async function getMetricsFromDO(dropletId: string, memoryMb: number, diskGb: number): Promise<DropletMetrics | null> {
  try {
    // Fetch all metrics in parallel
    const [cpuIdle, memFree, memTotal, diskFree, diskTotal, load1] = await Promise.all([
      fetchDOMetric(dropletId, 'cpu'),           // CPU idle %
      fetchDOMetric(dropletId, 'memory_free'),   // bytes
      fetchDOMetric(dropletId, 'memory_total'),  // bytes
      fetchDOMetric(dropletId, 'filesystem_free'), // bytes
      fetchDOMetric(dropletId, 'filesystem_size'), // bytes
      fetchDOMetric(dropletId, 'load_1'),        // 1-min load avg
    ])

    // If we don't have basic metrics, return null
    if (memFree === null || memTotal === null) return null

    const memTotalMb = Math.round((memTotal || memoryMb * 1024 * 1024) / (1024 * 1024))
    const memUsedMb = Math.round((memTotal! - memFree!) / (1024 * 1024))
    const memPercent = memTotalMb > 0 ? Math.round((memUsedMb / memTotalMb) * 100) : 0

    const diskTotalGb = Math.round((diskTotal || diskGb * 1024 * 1024 * 1024) / (1024 * 1024 * 1024))
    const diskUsedGb = diskTotal && diskFree ? Math.round((diskTotal - diskFree) / (1024 * 1024 * 1024)) : 0
    const diskPercent = diskTotalGb > 0 ? Math.round((diskUsedGb / diskTotalGb) * 100) : 0

    // CPU: DO returns idle %, we want usage %
    const cpuPercent = cpuIdle !== null ? Math.round(100 - cpuIdle) : 0

    return {
      cpuPercent,
      memoryUsedMb: memUsedMb,
      memoryTotalMb: memTotalMb,
      memoryPercent: memPercent,
      diskUsedGb,
      diskTotalGb,
      diskPercent,
      loadAverage: load1 !== null ? load1.toFixed(2) : '0.00',
      uptime: '', // Not available from DO API
    }
  } catch (error) {
    console.error('Error fetching DO metrics:', error)
    return null
  }
}

export async function GET() {
  try {
    // Fetch droplet list from DO API
    const doDroplets = await fetchDropletsFromDO()

    if (doDroplets.length === 0) {
      return NextResponse.json({
        droplets: [],
        summary: {
          total: 0,
          active: 0,
          offline: 0,
          totalContainers: 0,
          avgCpuPercent: 0,
          avgMemoryPercent: 0,
        },
        error: 'Could not fetch droplets from DigitalOcean API',
        lastUpdated: new Date().toISOString(),
      })
    }

    // Fetch metrics from DO Monitoring API
    const droplets: DropletInfo[] = await Promise.all(
      doDroplets.map(async (doDroplet) => {
        const publicIp = doDroplet.networks.v4.find(n => n.type === 'public')?.ip_address || ''
        const config = DROPLET_CONFIG[doDroplet.name] || { displayName: doDroplet.name, containers: [] }

        // Get metrics from DO Monitoring API
        const metrics = await getMetricsFromDO(String(doDroplet.id), doDroplet.memory, doDroplet.disk)

        return {
          id: String(doDroplet.id),
          name: doDroplet.name,
          displayName: config.displayName,
          ip: publicIp,
          vcpus: doDroplet.vcpus,
          memoryMb: doDroplet.memory,
          diskGb: doDroplet.disk,
          region: doDroplet.region.slug,
          status: doDroplet.status === 'active' ? 'active' : 'offline',
          containers: doDroplet.status === 'active' ? config.containers : [],
          metrics,
        } as DropletInfo
      })
    )

    // Calculate summary
    const activeDroplets = droplets.filter(d => d.status === 'active')
    const dropletsWithMetrics = droplets.filter(d => d.metrics)
    const totalContainers = droplets.reduce((sum, d) => sum + d.containers.length, 0)
    const avgCpuPercent = dropletsWithMetrics.length > 0
      ? Math.round(dropletsWithMetrics.reduce((sum, d) => sum + (d.metrics?.cpuPercent || 0), 0) / dropletsWithMetrics.length)
      : 0
    const avgMemoryPercent = dropletsWithMetrics.length > 0
      ? Math.round(dropletsWithMetrics.reduce((sum, d) => sum + (d.metrics?.memoryPercent || 0), 0) / dropletsWithMetrics.length)
      : 0

    return NextResponse.json({
      droplets,
      summary: {
        total: droplets.length,
        active: activeDroplets.length,
        offline: droplets.filter(d => d.status === 'offline').length,
        totalContainers,
        avgCpuPercent,
        avgMemoryPercent,
        hasDetailedMetrics: dropletsWithMetrics.length > 0,
      },
      lastUpdated: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Droplets API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
