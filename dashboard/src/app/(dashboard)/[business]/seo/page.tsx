'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { RefreshCw, TrendingUp, TrendingDown, MousePointerClick, Eye, Target, BarChart3, AlertTriangle, FileWarning, ExternalLink, Tag, FileText, FolderOpen, ShoppingBag, Home } from 'lucide-react'
import DateRangeSelector, { DateRange, getDatePresets, getCompareRange } from '@/components/DateRangeSelector'

interface SEOMetrics {
  clicks: number | null
  impressions: number | null
  ctr: number | null
  avgPosition: number | null
  indexedPages: number | null
  notIndexedPages: number | null
  criticalIssues: number
  warningIssues: number
  totalIssues: number
}

interface SEOResponse {
  business: string
  metrics: SEOMetrics
  pageTypes?: Record<string, number>
  totalPages?: number
  hasData: boolean
  message?: string
}

interface PageData {
  url: string
  page_type: string
  impressions: number
  clicks: number
  avg_position: number
  ctr: number
}

interface PagesResponse {
  pages: PageData[]
  total: number
}

type PageTypeFilter = 'all' | 'homepage' | 'category' | 'brand' | 'blog' | 'other'

function formatNumber(value: number | null | undefined): string {
  if (value == null) return '--'
  return new Intl.NumberFormat('en-AU').format(Math.round(value))
}

function formatDecimal(value: number | null | undefined, decimals = 1): string {
  if (value == null) return '--'
  return value.toFixed(decimals)
}

function formatPercent(value: number | null | undefined): string {
  if (value == null) return '--'
  return `${value.toFixed(2)}%`
}

function formatLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function SEODashboard() {
  const params = useParams()
  const business = params.business as string

  const [data, setData] = useState<SEOResponse | null>(null)
  const [compareData, setCompareData] = useState<SEOResponse | null>(null)
  const [pages, setPages] = useState<PageData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pageTypeFilter, setPageTypeFilter] = useState<PageTypeFilter>('all')

  // Date range state
  const presets = getDatePresets()
  const [dateRange, setDateRange] = useState<DateRange>(presets.find(p => p.key === 'last_30') || presets[3])
  const [compareRange, setCompareRange] = useState<DateRange | null>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const from = formatLocalDate(dateRange.start)
      const to = formatLocalDate(dateRange.end)

      // Fetch performance metrics
      const perfRes = await fetch(`/api/seo/performance?business=${business}&from=${from}&to=${to}`)
      if (!perfRes.ok) throw new Error('Failed to fetch SEO data')
      const perfData = await perfRes.json()
      setData(perfData)

      // Fetch comparison data if enabled
      if (compareRange) {
        const compFrom = formatLocalDate(compareRange.start)
        const compTo = formatLocalDate(compareRange.end)
        const compRes = await fetch(`/api/seo/performance?business=${business}&from=${compFrom}&to=${compTo}`)
        if (compRes.ok) {
          setCompareData(await compRes.json())
        }
      } else {
        setCompareData(null)
      }

      // Fetch top pages (only for BOO) - pass date range to match top cards
      if (business === 'boo') {
        const pageTypeParam = pageTypeFilter !== 'all' ? `&pageType=${pageTypeFilter}` : ''
        const pagesRes = await fetch(`/api/seo/pages?business=${business}&limit=100&sortBy=clicks&from=${from}&to=${to}${pageTypeParam}`)
        if (pagesRes.ok) {
          const pagesData: PagesResponse = await pagesRes.json()
          setPages(pagesData.pages || [])
        }
      }

      setError(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [business, dateRange, compareRange, pageTypeFilter])

  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range)
    if (compareRange) {
      setCompareRange(getCompareRange(range))
    }
  }

  const getVariance = (current: number | null, previous: number | null) => {
    if (current == null || previous == null || previous === 0) return null
    const pct = ((current - previous) / Math.abs(previous)) * 100
    return { value: current - previous, pct }
  }

  const metrics = data?.metrics
  const pageTypes = data?.pageTypes || {}

  // Get counts for tabs
  const tabCounts = {
    all: Object.values(pageTypes).reduce((a, b) => a + b, 0),
    homepage: pageTypes['homepage'] || 0,
    category: pageTypes['category'] || 0,
    brand: pageTypes['brand'] || 0,
    blog: pageTypes['blog'] || 0,
    other: pageTypes['other'] || 0,
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">SEO Dashboard</h1>
          <p className="text-gray-400 mt-1">
            Search performance and index health
            {!data?.hasData && data?.message && (
              <span className="ml-2 text-yellow-500">({data.message})</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DateRangeSelector
            value={dateRange}
            onChange={handleDateRangeChange}
            showCompare={true}
            compareRange={compareRange}
            onCompareChange={setCompareRange}
          />
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </header>

      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard
          label="Clicks"
          value={formatNumber(metrics?.clicks)}
          previousValue={compareData ? formatNumber(compareData.metrics.clicks) : undefined}
          icon={MousePointerClick}
          color="text-blue-400"
          variance={compareData ? getVariance(metrics?.clicks ?? null, compareData.metrics.clicks) : null}
        />
        <MetricCard
          label="Impressions"
          value={formatNumber(metrics?.impressions)}
          previousValue={compareData ? formatNumber(compareData.metrics.impressions) : undefined}
          icon={Eye}
          color="text-purple-400"
          variance={compareData ? getVariance(metrics?.impressions ?? null, compareData.metrics.impressions) : null}
        />
        <MetricCard
          label="CTR"
          value={formatPercent(metrics?.ctr)}
          previousValue={compareData ? formatPercent(compareData.metrics.ctr) : undefined}
          icon={Target}
          color="text-green-400"
          variance={compareData ? getVariance(metrics?.ctr ?? null, compareData.metrics.ctr) : null}
        />
        <MetricCard
          label="Avg Position"
          value={formatDecimal(metrics?.avgPosition)}
          previousValue={compareData ? formatDecimal(compareData.metrics.avgPosition) : undefined}
          icon={BarChart3}
          color="text-yellow-400"
          variance={compareData ? getVariance(metrics?.avgPosition ?? null, compareData.metrics.avgPosition) : null}
          invertVariance={true}
        />
        <MetricCard
          label="Indexed Pages"
          value={formatNumber(metrics?.indexedPages)}
          icon={FileWarning}
          color="text-cyan-400"
          subtext={metrics?.notIndexedPages ? `${formatNumber(metrics.notIndexedPages)} not indexed` : undefined}
        />
        <MetricCard
          label="Active Issues"
          value={formatNumber(metrics?.totalIssues)}
          icon={AlertTriangle}
          color={metrics?.criticalIssues ? 'text-red-400' : 'text-orange-400'}
          subtext={metrics?.criticalIssues ? `${metrics.criticalIssues} critical` : undefined}
        />
      </div>

      {/* Page Type Tabs + Table */}
      {business === 'boo' && (
        <section className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
          {/* Tab Navigation */}
          <div className="border-b border-gray-800">
            <nav className="flex flex-wrap">
              <TabButton
                active={pageTypeFilter === 'all'}
                onClick={() => setPageTypeFilter('all')}
                icon={BarChart3}
                label="All Pages"
                count={tabCounts.all}
              />
              <TabButton
                active={pageTypeFilter === 'homepage'}
                onClick={() => setPageTypeFilter('homepage')}
                icon={Home}
                label="Homepage"
                count={tabCounts.homepage}
                color="text-cyan-400"
              />
              <TabButton
                active={pageTypeFilter === 'category'}
                onClick={() => setPageTypeFilter('category')}
                icon={FolderOpen}
                label="Categories"
                count={tabCounts.category}
                color="text-blue-400"
              />
              <TabButton
                active={pageTypeFilter === 'brand'}
                onClick={() => setPageTypeFilter('brand')}
                icon={Tag}
                label="Brands"
                count={tabCounts.brand}
                color="text-purple-400"
              />
              <TabButton
                active={pageTypeFilter === 'blog'}
                onClick={() => setPageTypeFilter('blog')}
                icon={FileText}
                label="Blog"
                count={tabCounts.blog}
                color="text-orange-400"
              />
              <TabButton
                active={pageTypeFilter === 'other'}
                onClick={() => setPageTypeFilter('other')}
                icon={ShoppingBag}
                label="Products"
                count={tabCounts.other}
                color="text-green-400"
              />
            </nav>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">URL</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Type</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">Clicks</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">Impressions</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">CTR</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">Position</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {pages.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      {loading ? 'Loading...' : 'No pages found'}
                    </td>
                  </tr>
                ) : (
                  pages.slice(0, 50).map((page, idx) => (
                    <tr key={idx} className="hover:bg-gray-800/50">
                      <td className="px-4 py-3">
                        <a
                          href={page.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 flex items-center gap-1 max-w-lg"
                        >
                          <span className="truncate">{page.url.replace('https://www.buyorganicsonline.com.au', '')}</span>
                          <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        </a>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getPageTypeStyle(page.page_type)}`}>
                          {page.page_type || 'other'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-white font-medium">
                        {formatNumber(page.clicks)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-300">
                        {formatNumber(page.impressions)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-300">
                        {formatPercent(page.ctr)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-300">
                        {formatDecimal(page.avg_position)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {pages.length > 50 && (
            <div className="p-4 border-t border-gray-800 text-center text-sm text-gray-500">
              Showing top 50 of {pages.length} pages
            </div>
          )}
        </section>
      )}

      {/* Not Connected Message */}
      {!data?.hasData && (
        <section className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">GSC Not Connected</h2>
          <p className="text-gray-400 max-w-md mx-auto">
            Google Search Console performance data is not yet connected for this business.
            Issue tracking data may still be available.
          </p>
        </section>
      )}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
  count,
  color = 'text-gray-400',
}: {
  active: boolean
  onClick: () => void
  icon: any
  label: string
  count: number
  color?: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors border-b-2 ${
        active
          ? 'border-purple-500 text-white bg-gray-800/50'
          : 'border-transparent text-gray-400 hover:text-white hover:bg-gray-800/30'
      }`}
    >
      <Icon className={`w-4 h-4 ${active ? 'text-purple-400' : color}`} />
      <span>{label}</span>
      <span className={`px-2 py-0.5 rounded-full text-xs ${active ? 'bg-purple-500/20 text-purple-300' : 'bg-gray-700 text-gray-400'}`}>
        {count}
      </span>
    </button>
  )
}

function MetricCard({
  label,
  value,
  previousValue,
  icon: Icon,
  color,
  variance,
  invertVariance = false,
  subtext,
}: {
  label: string
  value: string
  previousValue?: string
  icon: any
  color: string
  variance?: { value: number; pct: number } | null
  invertVariance?: boolean
  subtext?: string
}) {
  const isPositive = variance ? (invertVariance ? variance.value < 0 : variance.value > 0) : null

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-sm text-gray-400">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {previousValue && variance && (
        <div className="mt-1 space-y-0.5">
          <div className="text-xs text-gray-500">
            vs {previousValue}
          </div>
          <div className={`flex items-center gap-1 text-xs ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            <span>{isPositive ? '+' : ''}{variance.pct.toFixed(1)}%</span>
          </div>
        </div>
      )}
      {subtext && !variance && (
        <p className="text-xs text-gray-500 mt-1">{subtext}</p>
      )}
    </div>
  )
}

function getPageTypeStyle(type: string): string {
  const styles: Record<string, string> = {
    homepage: 'bg-cyan-500/10 text-cyan-400',
    product: 'bg-green-500/10 text-green-400',
    category: 'bg-blue-500/10 text-blue-400',
    brand: 'bg-purple-500/10 text-purple-400',
    blog: 'bg-orange-500/10 text-orange-400',
    page: 'bg-gray-500/10 text-gray-400',
    other: 'bg-gray-500/10 text-gray-400',
  }
  return styles[type] || 'bg-gray-500/10 text-gray-400'
}
