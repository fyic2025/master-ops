'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Search,
  Filter,
  CheckCircle,
  Clock,
  AlertTriangle,
  ExternalLink,
  ChevronDown,
  Loader2,
  FileText,
  Palette,
  Zap,
  Code,
  TrendingUp,
  RefreshCw
} from 'lucide-react'
import Link from 'next/link'

interface DashboardPage {
  id: string
  route: string
  file_path: string
  page_name: string
  description: string | null
  category: string
  business_scope: string[]
  implementation_status: 'implemented' | 'coming_soon' | 'placeholder' | 'deprecated'
  features: Record<string, boolean>
  dependencies: string[]
  skills_required: string[]
  last_analyzed_at: string | null
  improvement_score: number | null
  total_analyses: number
  pending_improvements: number
  completed_improvements: number
  analysis_freshness: 'never' | 'stale' | 'recent' | 'fresh'
}

interface PagesResponse {
  pages: DashboardPage[]
  stats: {
    total: number
    implemented: number
    coming_soon: number
    placeholder: number
    avgScore: number
    pendingImprovements: number
  }
}

const statusConfig = {
  implemented: { color: 'text-green-400', bg: 'bg-green-500/10', label: 'Implemented' },
  coming_soon: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', label: 'Coming Soon' },
  placeholder: { color: 'text-gray-400', bg: 'bg-gray-500/10', label: 'Placeholder' },
  deprecated: { color: 'text-red-400', bg: 'bg-red-500/10', label: 'Deprecated' },
}

const freshnessConfig = {
  never: { color: 'text-gray-500', label: 'Never analyzed' },
  stale: { color: 'text-yellow-400', label: 'Stale (7+ days)' },
  recent: { color: 'text-blue-400', label: 'Recent' },
  fresh: { color: 'text-green-400', label: 'Fresh' },
}

const categoryColors: Record<string, string> = {
  authentication: 'bg-purple-500/20 text-purple-400',
  'task-management': 'bg-blue-500/20 text-blue-400',
  home: 'bg-green-500/20 text-green-400',
  finance: 'bg-emerald-500/20 text-emerald-400',
  monitoring: 'bg-orange-500/20 text-orange-400',
  operations: 'bg-cyan-500/20 text-cyan-400',
  customers: 'bg-pink-500/20 text-pink-400',
  marketing: 'bg-red-500/20 text-red-400',
  automation: 'bg-violet-500/20 text-violet-400',
  sales: 'bg-amber-500/20 text-amber-400',
  system: 'bg-slate-500/20 text-slate-400',
  integrations: 'bg-indigo-500/20 text-indigo-400',
  infrastructure: 'bg-gray-500/20 text-gray-400',
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) {
    return <span className="text-gray-500 text-sm">—</span>
  }

  const getColor = () => {
    if (score >= 80) return 'bg-green-500/20 text-green-400 border-green-500/30'
    if (score >= 60) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    return 'bg-red-500/20 text-red-400 border-red-500/30'
  }

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getColor()}`}>
      {score}/100
    </span>
  )
}

export default function PagesRegistryPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)

  const { data, isLoading, error, refetch, isRefetching } = useQuery<PagesResponse>({
    queryKey: ['dashboard-pages'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard-pages')
      if (!response.ok) throw new Error('Failed to fetch pages')
      return response.json()
    },
  })

  const pages = data?.pages || []
  const stats = data?.stats

  // Filter pages
  const filteredPages = pages.filter((page) => {
    const matchesSearch =
      searchQuery === '' ||
      page.page_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      page.route.toLowerCase().includes(searchQuery.toLowerCase()) ||
      page.description?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesCategory = categoryFilter === 'all' || page.category === categoryFilter
    const matchesStatus = statusFilter === 'all' || page.implementation_status === statusFilter

    return matchesSearch && matchesCategory && matchesStatus
  })

  // Get unique categories
  const categories = [...new Set(pages.map((p) => p.category))].sort()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6 text-center">
        <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
        <p className="text-red-400">Failed to load pages registry</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard Pages Registry</h1>
          <p className="text-gray-400 mt-1">
            Track and monitor all {stats?.total || 0} dashboard pages
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isRefetching}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700
            rounded-lg text-sm text-gray-300 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </header>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Total Pages</p>
            <p className="text-2xl font-bold text-white mt-1">{stats.total}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Implemented</p>
            <p className="text-2xl font-bold text-green-400 mt-1">{stats.implemented}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Coming Soon</p>
            <p className="text-2xl font-bold text-yellow-400 mt-1">{stats.coming_soon}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Avg Score</p>
            <p className="text-2xl font-bold text-blue-400 mt-1">
              {stats.avgScore ? `${stats.avgScore}%` : '—'}
            </p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Pending Improvements</p>
            <p className="text-2xl font-bold text-orange-400 mt-1">{stats.pendingImprovements}</p>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search pages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-800 rounded-lg
                text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors
              ${showFilters
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-white'}`}
          >
            <Filter className="w-4 h-4" />
            Filters
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Filter Dropdowns */}
        {showFilters && (
          <div className="flex items-center gap-4 p-4 bg-gray-900 border border-gray-800 rounded-lg">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white
                  focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1).replace('-', ' ')}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white
                  focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="implemented">Implemented</option>
                <option value="coming_soon">Coming Soon</option>
                <option value="placeholder">Placeholder</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Pages Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800/50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Page
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Category
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Score
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Analysis
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Improvements
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Skills
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredPages.map((page) => {
                const statusInfo = statusConfig[page.implementation_status]
                const freshnessInfo = freshnessConfig[page.analysis_freshness]

                return (
                  <tr key={page.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-4">
                      <div>
                        <p className="text-sm font-medium text-white">{page.page_name}</p>
                        <p className="text-xs text-gray-500 font-mono">{page.route}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${categoryColors[page.category] || 'bg-gray-500/20 text-gray-400'}`}>
                        {page.category}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.bg} ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <ScoreBadge score={page.improvement_score} />
                    </td>
                    <td className="px-4 py-4">
                      <span className={`text-xs ${freshnessInfo.color}`}>
                        {freshnessInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2 text-xs">
                        {page.pending_improvements > 0 && (
                          <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-400">
                            {page.pending_improvements} pending
                          </span>
                        )}
                        {page.completed_improvements > 0 && (
                          <span className="text-gray-500">
                            {page.completed_improvements} done
                          </span>
                        )}
                        {page.pending_improvements === 0 && page.completed_improvements === 0 && (
                          <span className="text-gray-500">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {page.skills_required?.slice(0, 2).map((skill) => (
                          <span
                            key={skill}
                            className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 text-xs"
                          >
                            {skill}
                          </span>
                        ))}
                        {page.skills_required?.length > 2 && (
                          <span className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-500 text-xs">
                            +{page.skills_required.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filteredPages.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            No pages match your filters
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-gray-500">
        Showing {filteredPages.length} of {pages.length} pages
      </div>
    </div>
  )
}
