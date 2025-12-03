'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ServerIcon,
  CpuChipIcon,
  CircleStackIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowPathIcon,
  CubeIcon,
} from '@heroicons/react/24/outline';

interface ContainerInfo {
  name: string;
  status: string;
  image: string;
}

interface DropletMetrics {
  cpuPercent: number;
  memoryUsedMb: number;
  memoryTotalMb: number;
  memoryPercent: number;
  diskUsedGb: number;
  diskTotalGb: number;
  diskPercent: number;
  loadAverage: string;
  uptime: string;
}

interface DropletInfo {
  id: string;
  name: string;
  ip: string;
  vcpus: number;
  memoryMb: number;
  diskGb: number;
  region: string;
  status: 'active' | 'offline' | 'unknown';
  containers: ContainerInfo[];
  metrics: DropletMetrics | null;
}

interface DropletData {
  droplets: DropletInfo[];
  summary: {
    total: number;
    active: number;
    offline: number;
    totalContainers: number;
    avgCpuPercent: number;
    avgMemoryPercent: number;
  };
  lastUpdated: string;
}

async function fetchDroplets(): Promise<DropletData> {
  const res = await fetch('/api/infrastructure/droplets');
  if (!res.ok) throw new Error('Failed to fetch droplet status');
  return res.json();
}

function ProgressBar({ percent, colorClass }: { percent: number; colorClass: string }) {
  return (
    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
      <div
        className={`h-full ${colorClass} transition-all duration-300`}
        style={{ width: `${Math.min(percent, 100)}%` }}
      />
    </div>
  );
}

function getColorForPercent(percent: number): string {
  if (percent >= 90) return 'bg-red-500';
  if (percent >= 70) return 'bg-yellow-500';
  return 'bg-green-500';
}

export function DropletCapacityWidget() {
  const [isExpanded, setIsExpanded] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['droplets'],
    queryFn: fetchDroplets,
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 animate-pulse">
        <div className="h-6 bg-gray-700 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-gray-700 rounded w-full mb-2"></div>
        <div className="h-4 bg-gray-700 rounded w-2/3"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 border border-red-500/20">
        <div className="flex items-center gap-2 text-red-400">
          <ExclamationTriangleIcon className="h-5 w-5" />
          <span>Failed to load droplet status</span>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          SSH access may not be available in this environment
        </p>
      </div>
    );
  }

  const { droplets, summary } = data;
  const allHealthy = summary.active === summary.total;

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
      {/* Header - Always visible */}
      <div
        className="p-4 cursor-pointer hover:bg-gray-750 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <ServerIcon className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">DigitalOcean Droplets</h3>
              <p className="text-sm text-gray-400">
                {summary.active}/{summary.total} active, {summary.totalContainers} containers
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Status Badge */}
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              allHealthy
                ? 'bg-green-500/10 text-green-400'
                : 'bg-yellow-500/10 text-yellow-400'
            }`}>
              {allHealthy ? 'All Healthy' : `${summary.offline} Offline`}
            </div>

            {isExpanded ? (
              <ChevronUpIcon className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronDownIcon className="h-5 w-5 text-gray-400" />
            )}
          </div>
        </div>

        {/* Quick Stats Bar */}
        <div className="mt-3 flex gap-6 text-sm">
          <div className="flex items-center gap-1.5">
            <CpuChipIcon className="h-4 w-4 text-blue-400" />
            <span className="text-gray-300">CPU: {summary.avgCpuPercent}%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CircleStackIcon className="h-4 w-4 text-purple-400" />
            <span className="text-gray-300">Memory: {summary.avgMemoryPercent}%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CubeIcon className="h-4 w-4 text-cyan-400" />
            <span className="text-gray-300">{summary.totalContainers} Containers</span>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-700">
          <div className="flex items-center justify-between px-4 py-2 bg-gray-750">
            <span className="text-sm text-gray-400">
              Last updated: {new Date(data.lastUpdated).toLocaleTimeString()}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                refetch();
              }}
              className="p-1 text-gray-400 hover:text-white"
              title="Refresh"
            >
              <ArrowPathIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {droplets.map((droplet) => (
              <div
                key={droplet.id}
                className="bg-gray-750 rounded-lg p-4"
              >
                {/* Droplet Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      droplet.status === 'active' ? 'bg-green-400' : 'bg-red-400'
                    }`} />
                    <span className="text-white font-medium">{droplet.name}</span>
                    <span className="text-xs px-1.5 py-0.5 bg-gray-700 rounded text-gray-400">
                      {droplet.ip}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span>{droplet.vcpus} vCPU</span>
                    <span>|</span>
                    <span>{droplet.memoryMb / 1024}GB RAM</span>
                    <span>|</span>
                    <span>{droplet.diskGb}GB Disk</span>
                  </div>
                </div>

                {/* Metrics */}
                {droplet.metrics ? (
                  <div className="space-y-3">
                    {/* CPU */}
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-400">CPU</span>
                        <span className="text-white">{droplet.metrics.cpuPercent.toFixed(1)}%</span>
                      </div>
                      <ProgressBar
                        percent={droplet.metrics.cpuPercent}
                        colorClass={getColorForPercent(droplet.metrics.cpuPercent)}
                      />
                    </div>

                    {/* Memory */}
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-400">Memory</span>
                        <span className="text-white">
                          {(droplet.metrics.memoryUsedMb / 1024).toFixed(1)}GB / {(droplet.metrics.memoryTotalMb / 1024).toFixed(1)}GB ({droplet.metrics.memoryPercent}%)
                        </span>
                      </div>
                      <ProgressBar
                        percent={droplet.metrics.memoryPercent}
                        colorClass={getColorForPercent(droplet.metrics.memoryPercent)}
                      />
                    </div>

                    {/* Disk */}
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-400">Disk</span>
                        <span className="text-white">
                          {droplet.metrics.diskUsedGb}GB / {droplet.metrics.diskTotalGb}GB ({droplet.metrics.diskPercent}%)
                        </span>
                      </div>
                      <ProgressBar
                        percent={droplet.metrics.diskPercent}
                        colorClass={getColorForPercent(droplet.metrics.diskPercent)}
                      />
                    </div>

                    {/* Extra Info */}
                    <div className="flex gap-4 text-xs text-gray-500 mt-2">
                      <span>Load: {droplet.metrics.loadAverage}</span>
                      <span>Uptime: {droplet.metrics.uptime}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <ExclamationTriangleIcon className="h-6 w-6 mx-auto mb-2" />
                    <p className="text-sm">Unable to fetch metrics</p>
                  </div>
                )}

                {/* Containers */}
                {droplet.containers.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-gray-700">
                    <h4 className="text-xs font-medium text-gray-400 mb-2">Containers</h4>
                    <div className="space-y-1">
                      {droplet.containers.map((container) => (
                        <div
                          key={container.name}
                          className="flex items-center justify-between text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <CubeIcon className="h-3.5 w-3.5 text-cyan-400" />
                            <span className="text-white">{container.name}</span>
                          </div>
                          <span className={`text-xs ${
                            container.status.includes('healthy') || container.status.startsWith('Up')
                              ? 'text-green-400'
                              : 'text-yellow-400'
                          }`}>
                            {container.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {droplet.containers.length === 0 && droplet.status === 'active' && (
                  <div className="mt-4 pt-3 border-t border-gray-700">
                    <p className="text-xs text-gray-500">No containers running</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
