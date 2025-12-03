import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

interface DropletInfo {
  id: string
  name: string
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

// Hardcoded droplet configuration
const DROPLETS = [
  {
    id: '514465059',
    name: 'n8n-primary',
    ip: '134.199.175.243',
    vcpus: 2,
    memoryMb: 4096,
    diskGb: 120,
    region: 'syd1',
  },
  {
    id: '531266924',
    name: 'n8n-secondary',
    ip: '170.64.223.141',
    vcpus: 2,
    memoryMb: 4096,
    diskGb: 80,
    region: 'syd1',
  },
]

async function sshCommand(ip: string, command: string, timeoutMs = 10000): Promise<string | null> {
  try {
    const { stdout } = await execAsync(
      `ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 -o BatchMode=yes root@${ip} "${command}"`,
      { timeout: timeoutMs }
    )
    return stdout.trim()
  } catch (error) {
    console.error(`SSH command failed for ${ip}:`, error)
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
    const droplets: DropletInfo[] = await Promise.all(
      DROPLETS.map(async (droplet) => {
        const [containers, metrics] = await Promise.all([
          getContainers(droplet.ip),
          getMetrics(droplet.ip),
        ])

        return {
          ...droplet,
          status: metrics ? 'active' : 'offline',
          containers,
          metrics,
        } as DropletInfo
      })
    )

    // Calculate summary
    const activeDroplets = droplets.filter(d => d.status === 'active')
    const totalContainers = droplets.reduce((sum, d) => sum + d.containers.length, 0)
    const avgCpuPercent = activeDroplets.length > 0
      ? Math.round(activeDroplets.reduce((sum, d) => sum + (d.metrics?.cpuPercent || 0), 0) / activeDroplets.length)
      : 0
    const avgMemoryPercent = activeDroplets.length > 0
      ? Math.round(activeDroplets.reduce((sum, d) => sum + (d.metrics?.memoryPercent || 0), 0) / activeDroplets.length)
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
      },
      lastUpdated: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Droplets API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
