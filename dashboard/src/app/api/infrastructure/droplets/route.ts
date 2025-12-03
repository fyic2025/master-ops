import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

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

// Friendly names for droplets
const DROPLET_NAMES: Record<string, string> = {
  'ubuntu-s-2vcpu-4gb-120gb-intel-syd1-01': 'n8n-primary',
  'ubuntu-s-2vcpu-4gb-amd-syd1-01': 'n8n-secondary',
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

async function sshCommand(ip: string, command: string, timeoutMs = 10000): Promise<string | null> {
  try {
    const { stdout } = await execAsync(
      `ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 -o BatchMode=yes root@${ip} "${command}"`,
      { timeout: timeoutMs }
    )
    return stdout.trim()
  } catch (error) {
    // SSH not available (expected in production)
    return null
  }
}

async function getContainers(ip: string): Promise<ContainerInfo[]> {
  const output = await sshCommand(ip, "docker ps --format '{{.Names}}|{{.Status}}|{{.Image}}'")
  if (!output) return []

  return output.split('\n').filter(Boolean).map(line => {
    const [name, status, image] = line.split('|')
    return { name, status, image }
  })
}

async function getMetrics(ip: string): Promise<DropletMetrics | null> {
  const output = await sshCommand(ip, `
    echo "CPU:$(top -bn1 | grep '%Cpu' | awk '{print $2}')" &&
    echo "MEM:$(free -m | grep Mem | awk '{print $2,$3}')" &&
    echo "DISK:$(df -BG / | tail -1 | awk '{print $2,$3,$5}')" &&
    echo "LOAD:$(cat /proc/loadavg | awk '{print $1, $2, $3}')" &&
    echo "UP:$(uptime -p)"
  `)

  if (!output) return null

  try {
    const lines = output.split('\n')
    const getValue = (prefix: string) => {
      const line = lines.find(l => l.startsWith(prefix))
      return line?.replace(prefix, '') || ''
    }

    const cpuRaw = getValue('CPU:')
    const memRaw = getValue('MEM:').split(' ')
    const diskRaw = getValue('DISK:').replace(/G/g, '').split(' ')
    const loadRaw = getValue('LOAD:')
    const uptimeRaw = getValue('UP:')

    const memTotal = parseInt(memRaw[0]) || 0
    const memUsed = parseInt(memRaw[1]) || 0
    const diskTotal = parseInt(diskRaw[0]) || 0
    const diskUsed = parseInt(diskRaw[1]) || 0

    return {
      cpuPercent: parseFloat(cpuRaw) || 0,
      memoryUsedMb: memUsed,
      memoryTotalMb: memTotal,
      memoryPercent: memTotal > 0 ? Math.round((memUsed / memTotal) * 100) : 0,
      diskUsedGb: diskUsed,
      diskTotalGb: diskTotal,
      diskPercent: parseInt(diskRaw[2]) || 0,
      loadAverage: loadRaw,
      uptime: uptimeRaw.replace('up ', ''),
    }
  } catch (error) {
    console.error('Error parsing metrics:', error)
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

    // Enhance with SSH metrics where possible
    const droplets: DropletInfo[] = await Promise.all(
      doDroplets.map(async (doDroplet) => {
        const publicIp = doDroplet.networks.v4.find(n => n.type === 'public')?.ip_address || ''
        const displayName = DROPLET_NAMES[doDroplet.name] || doDroplet.name

        // Try to get SSH metrics (will fail in production, that's ok)
        const [containers, metrics] = await Promise.all([
          getContainers(publicIp),
          getMetrics(publicIp),
        ])

        return {
          id: String(doDroplet.id),
          name: doDroplet.name,
          displayName,
          ip: publicIp,
          vcpus: doDroplet.vcpus,
          memoryMb: doDroplet.memory,
          diskGb: doDroplet.disk,
          region: doDroplet.region.slug,
          status: doDroplet.status === 'active' ? 'active' : 'offline',
          containers,
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
