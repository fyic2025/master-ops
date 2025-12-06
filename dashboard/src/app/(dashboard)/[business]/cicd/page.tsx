'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  FileCode,
  TestTube,
  Bug,
  Wrench,
  Clock,
  Play,
  Trash2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react'
import { useState } from 'react'
import { FixSingleButton, FixBatchButton, FixProgressTracker } from '@/components/cicd'
import { VerifyFixesButton } from '@/components/cicd/VerifyFixesButton'

interface CicdIssue {
  id: string
  issue_type: string
  severity: string
  file_path: string | null
  line_number: number | null
  message: string
  code: string | null
  auto_fixable: boolean
  first_seen_at: string
  last_seen_at: string
  occurrence_count: number
  fix_status?: 'pending' | 'in_progress' | 'failed' | 'resolved'
  fix_attempt_count?: number
  last_fix_attempt_at?: string | null
}

interface CicdStats {
  total_active: number
  typescript_errors: number
  test_failures: number
  lint_errors: number
  build_errors: number
  auto_fixable: number
  oldest_issue_hours: number
  pending_count?: number
  in_progress_count?: number
  failed_count?: number
}

interface ScanHistory {
  id: string
  scan_type: string
  started_at: string
  completed_at: string | null
  total_issues: number
  new_issues: number
  resolved_issues: number
  status: string
}

interface CicdResponse {
  issues: CicdIssue[]
  byType: Record<string, CicdIssue[]>
  byFile: Record<string, CicdIssue[]>
  byErrorCode: Record<string, CicdIssue[]>
  byFixStatus: Record<string, CicdIssue[]>
  stats: CicdStats
  recentScans: ScanHistory[]
  lastUpdated: string
}

async function fetchCicdIssues(): Promise<CicdResponse> {
  const res = await fetch('/api/cicd')
  if (!res.ok) throw new Error('Failed to fetch CI/CD issues')
  return res.json()
}

async function resolveIssue(id: string): Promise<void> {
  const res = await fetch(`/api/cicd?id=${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to resolve issue')
}

const issueTypeConfig: Record<string, { icon: typeof AlertCircle; label: string; color: string }> = {
  typescript_error: { icon: FileCode, label: 'TypeScript Error', color: 'text-red-400' },
  test_failure: { icon: TestTube, label: 'Test Failure', color: 'text-yellow-400' },
  lint_error: { icon: Bug, label: 'Lint Error', color: 'text-orange-400' },
  build_error: { icon: Wrench, label: 'Build Error', color: 'text-red-500' },
  health_check: { icon: AlertCircle, label: 'Health Check', color: 'text-blue-400' },
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${diffDays}d ago`
}

function generateErrorCodeFixPrompt(code: string, issues: CicdIssue[]): string {
  const uniqueFiles = [...new Set(issues.map(i => i.file_path).filter(Boolean))]
  const fileList = issues
    .map(i => `- ${i.file_path}:${i.line_number} - ${i.message}`)
    .join('\n')

  return `## CI/CD Fix Request

**Error Code**: ${code}
**Total Occurrences**: ${issues.length}
**Files Affected**: ${uniqueFiles.length}

### Error Message
\`\`\`
${issues[0]?.message || 'Unknown error'}
\`\`\`

### All Locations
${fileList}

---

### Fix Instructions

1. Read the affected files to understand the context
2. Apply the appropriate fix for ${code} errors:
${code === 'TS7006' ? '   - Add explicit type annotations to parameters' : ''}
${code === 'TS2322' ? '   - Fix type mismatches by correcting the assigned value or updating the type' : ''}
${code === 'TS18046' ? '   - Add type narrowing or type assertions for unknown types' : ''}
${code === 'TS2339' ? '   - Add missing properties to the type definition or fix property access' : ''}
${code === 'TS2307' ? '   - Install missing @types packages or add module declarations' : ''}
${code === 'TS1205' ? '   - Use "export type" for type-only re-exports when isolatedModules is enabled' : ''}
${code === 'TS2416' ? '   - Fix property type to match the interface/base class' : ''}
3. Run \`npx tsc --noEmit\` to verify fixes
4. After fixing, run \`npx tsx scripts/cicd-health-check.ts\` to update the dashboard

**Dashboard Link**: https://ops.growthcohq.com/home/cicd`
}

function generateFileFixPrompt(file: string, issues: CicdIssue[]): string {
  const errorsByCode: Record<string, CicdIssue[]> = {}
  for (const issue of issues) {
    const code = issue.code || 'unknown'
    if (!errorsByCode[code]) errorsByCode[code] = []
    errorsByCode[code].push(issue)
  }

  const issueList = issues
    .map(i => `- Line ${i.line_number}: [${i.code}] ${i.message}`)
    .join('\n')

  const errorSummary = Object.entries(errorsByCode)
    .map(([code, errs]) => `- ${code}: ${errs.length}`)
    .join('\n')

  return `## CI/CD Fix Request

**File**: ${file}
**Total Issues**: ${issues.length}

### Error Summary
${errorSummary}

### All Issues in This File
${issueList}

---

### Fix Instructions

1. Read the file: \`${file}\`
2. Fix each issue listed above
3. Run \`npx tsc --noEmit\` to verify fixes
4. After fixing, run \`npx tsx scripts/cicd-health-check.ts\` to update the dashboard

**Dashboard Link**: https://ops.growthcohq.com/home/cicd`
}

export default function CicdDashboard() {
  const queryClient = useQueryClient()
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set())
  const [expandedErrorCodes, setExpandedErrorCodes] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'byType' | 'byFile' | 'byErrorCode'>('byErrorCode')
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [copiedFile, setCopiedFile] = useState<string | null>(null)

  const copyErrorCodePrompt = async (code: string, issues: CicdIssue[]) => {
    const prompt = generateErrorCodeFixPrompt(code, issues)
    await navigator.clipboard.writeText(prompt)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const copyFilePrompt = async (file: string, issues: CicdIssue[]) => {
    const prompt = generateFileFixPrompt(file, issues)
    await navigator.clipboard.writeText(prompt)
    setCopiedFile(file)
    setTimeout(() => setCopiedFile(null), 2000)
  }

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['cicd-issues'],
    queryFn: fetchCicdIssues,
    refetchInterval: 60000,
  })

  const resolveMutation = useMutation({
    mutationFn: resolveIssue,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cicd-issues'] })
    },
  })

  const toggleFile = (file: string) => {
    const newExpanded = new Set(expandedFiles)
    if (newExpanded.has(file)) {
      newExpanded.delete(file)
    } else {
      newExpanded.add(file)
    }
    setExpandedFiles(newExpanded)
  }

  const toggleErrorCode = (code: string) => {
    const newExpanded = new Set(expandedErrorCodes)
    if (newExpanded.has(code)) {
      newExpanded.delete(code)
    } else {
      newExpanded.add(code)
    }
    setExpandedErrorCodes(newExpanded)
  }

  const stats = data?.stats || {
    total_active: 0,
    typescript_errors: 0,
    test_failures: 0,
    lint_errors: 0,
    build_errors: 0,
    auto_fixable: 0,
    oldest_issue_hours: 0,
  }

  const overallStatus = stats.total_active === 0 ? 'healthy' :
    stats.total_active > 10 ? 'critical' : 'warning'

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">CI/CD Health</h1>
          <p className="text-gray-400 mt-1">Code quality monitoring and issue tracking</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </header>

      {/* Fix Status Buckets - 3 bucket layout */}
      {data && data.issues.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Pending Bucket */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-white">Not Attempted</h3>
              <span className="text-2xl font-bold text-slate-300">
                {data.byFixStatus?.pending?.length || 0}
              </span>
            </div>
            <p className="text-sm text-slate-400 mb-3">Issues waiting to be fixed</p>
            {(data.byFixStatus?.pending?.length || 0) > 0 && (
              <FixBatchButton
                issues={data.byFixStatus.pending || []}
                maxBatchSize={10}
                onFixStarted={() => refetch()}
              />
            )}
          </div>

          {/* In Progress Bucket */}
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-yellow-400">Fix In Progress</h3>
              <span className="text-2xl font-bold text-yellow-400">
                {data.byFixStatus?.in_progress?.length || 0}
              </span>
            </div>
            <p className="text-sm text-slate-400 mb-3">Awaiting verification</p>
            {(data.byFixStatus?.in_progress?.length || 0) > 0 && (
              <VerifyFixesButton
                inProgressIssues={data.byFixStatus.in_progress || []}
                onVerificationComplete={() => refetch()}
              />
            )}
          </div>

          {/* Failed Bucket */}
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-red-400">Failed (Retry)</h3>
              <span className="text-2xl font-bold text-red-400">
                {data.byFixStatus?.failed?.length || 0}
              </span>
            </div>
            <p className="text-sm text-slate-400 mb-3">Fix attempts unsuccessful</p>
            {(data.byFixStatus?.failed?.length || 0) > 0 && (
              <FixBatchButton
                issues={data.byFixStatus.failed || []}
                maxBatchSize={10}
                variant="retry"
                onFixStarted={() => refetch()}
              />
            )}
          </div>
        </div>
      )}

      {/* Overall Status */}
      {isLoading ? (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 text-center">
          <RefreshCw className="w-12 h-12 text-gray-500 mx-auto mb-2 animate-spin" />
          <p className="text-gray-400">Loading CI/CD status...</p>
        </div>
      ) : (
        <div className={`${
          overallStatus === 'healthy' ? 'bg-green-500/10 border-green-500/20' :
          overallStatus === 'warning' ? 'bg-yellow-500/10 border-yellow-500/20' :
          'bg-red-500/10 border-red-500/20'
        } border rounded-lg p-6`}>
          <div className="flex items-center gap-4">
            {overallStatus === 'healthy' ? (
              <CheckCircle className="w-12 h-12 text-green-500" />
            ) : overallStatus === 'warning' ? (
              <AlertCircle className="w-12 h-12 text-yellow-500" />
            ) : (
              <XCircle className="w-12 h-12 text-red-500" />
            )}
            <div>
              <h2 className="text-xl font-semibold text-white">
                {overallStatus === 'healthy' ? 'All Checks Passing' :
                 overallStatus === 'warning' ? 'Some Issues Detected' :
                 'Critical Issues Need Attention'}
              </h2>
              <p className="text-gray-400 text-sm mt-1">
                {stats.total_active} active issues
                {stats.auto_fixable > 0 && ` (${stats.auto_fixable} auto-fixable)`}
                {stats.oldest_issue_hours > 24 && ` | Oldest: ${Math.round(stats.oldest_issue_hours / 24)}d`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard
          label="TypeScript"
          value={stats.typescript_errors}
          icon={FileCode}
          color={stats.typescript_errors > 0 ? 'text-red-400' : 'text-green-400'}
        />
        <StatCard
          label="Tests"
          value={stats.test_failures}
          icon={TestTube}
          color={stats.test_failures > 0 ? 'text-yellow-400' : 'text-green-400'}
        />
        <StatCard
          label="Lint"
          value={stats.lint_errors}
          icon={Bug}
          color={stats.lint_errors > 0 ? 'text-orange-400' : 'text-green-400'}
        />
        <StatCard
          label="Build"
          value={stats.build_errors}
          icon={Wrench}
          color={stats.build_errors > 0 ? 'text-red-500' : 'text-green-400'}
        />
        <StatCard
          label="Auto-Fixable"
          value={stats.auto_fixable}
          icon={Play}
          color={stats.auto_fixable > 0 ? 'text-blue-400' : 'text-gray-400'}
        />
      </div>

      {/* Progress Tracker - Shows when there are issues */}
      {data && data.issues.length > 0 && (
        <FixProgressTracker
          issues={data.issues.map(issue => ({
            id: issue.id,
            issue_type: issue.issue_type,
            file_path: issue.file_path,
            line_number: issue.line_number,
            message: issue.message,
            code: issue.code
          }))}
          title="Fix Progress Tracker"
          onAllFixed={() => {
            // Refresh data when all fixed
            refetch()
          }}
        />
      )}

      {/* View Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setViewMode('byErrorCode')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            viewMode === 'byErrorCode'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          By Error Code
        </button>
        <button
          onClick={() => setViewMode('byType')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            viewMode === 'byType'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          By Type
        </button>
        <button
          onClick={() => setViewMode('byFile')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            viewMode === 'byFile'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          By File
        </button>
      </div>

      {/* Issues List */}
      {viewMode === 'byErrorCode' ? (
        <div className="space-y-2">
          {Object.entries(data?.byErrorCode || {}).map(([code, issues]) => (
            <div key={code} className="bg-gray-900 border border-gray-800 rounded-lg">
              <div className="p-4 flex items-center gap-3">
                <button
                  onClick={() => toggleErrorCode(code)}
                  className="flex items-center gap-3 flex-1 text-left hover:opacity-80"
                >
                  {expandedErrorCodes.has(code) ? (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                  <span className={`px-2 py-0.5 rounded text-xs font-mono ${
                    code.startsWith('TS') ? 'bg-red-500/20 text-red-400' : 'bg-gray-700 text-gray-300'
                  }`}>
                    {code}
                  </span>
                  <span className="text-gray-400 text-sm flex-1 truncate">
                    {issues[0]?.message?.slice(0, 60)}...
                  </span>
                </button>
                <span className={`px-2 py-1 rounded text-sm font-semibold ${
                  issues.length >= 10 ? 'bg-red-500/20 text-red-400' :
                  issues.length >= 5 ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-gray-700 text-gray-300'
                }`}>
                  {issues.length} {issues.length === 1 ? 'issue' : 'issues'}
                </span>
                <button
                  onClick={() => copyErrorCodePrompt(code, issues)}
                  className={`ml-2 px-3 py-1.5 rounded text-sm font-medium flex items-center gap-1.5 transition-colors ${
                    copiedCode === code
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                  }`}
                  title={`Copy fix prompt for all ${issues.length} ${code} errors`}
                >
                  {copiedCode === code ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Fix All
                    </>
                  )}
                </button>
              </div>
              {expandedErrorCodes.has(code) && (
                <div className="border-t border-gray-800 divide-y divide-gray-800">
                  {issues.map((issue) => (
                    <IssueRow
                      key={issue.id}
                      issue={issue}
                      onResolve={() => resolveMutation.mutate(issue.id)}
                      onFixStarted={() => refetch()}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
          {Object.keys(data?.byErrorCode || {}).length === 0 && !isLoading && (
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
              <p className="text-gray-400">No active issues</p>
            </div>
          )}
        </div>
      ) : viewMode === 'byType' ? (
        <div className="space-y-4">
          {Object.entries(data?.byType || {}).map(([type, issues]) => {
            const config = issueTypeConfig[type] || issueTypeConfig.typescript_error
            const Icon = config.icon
            return (
              <div key={type} className="bg-gray-900 border border-gray-800 rounded-lg">
                <div className="p-4 border-b border-gray-800 flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${config.color}`} />
                  <h3 className="font-semibold text-white">{config.label}</h3>
                  <span className="text-gray-400 text-sm">({issues.length})</span>
                </div>
                <div className="divide-y divide-gray-800">
                  {issues.map((issue) => (
                    <IssueRow
                      key={issue.id}
                      issue={issue}
                      onResolve={() => resolveMutation.mutate(issue.id)}
                      onFixStarted={() => refetch()}
                    />
                  ))}
                </div>
              </div>
            )
          })}
          {Object.keys(data?.byType || {}).length === 0 && !isLoading && (
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
              <p className="text-gray-400">No active issues</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {Object.entries(data?.byFile || {}).map(([file, issues]) => (
            <div key={file} className="bg-gray-900 border border-gray-800 rounded-lg">
              <div className="p-4 flex items-center gap-3">
                <button
                  onClick={() => toggleFile(file)}
                  className="flex items-center gap-3 flex-1 text-left hover:opacity-80"
                >
                  {expandedFiles.has(file) ? (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                  <FileCode className="w-4 h-4 text-gray-400" />
                  <span className="text-white font-mono text-sm flex-1 truncate">{file}</span>
                </button>
                <span className={`px-2 py-1 rounded text-sm font-semibold ${
                  issues.length >= 10 ? 'bg-red-500/20 text-red-400' :
                  issues.length >= 5 ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-gray-700 text-gray-300'
                }`}>
                  {issues.length} {issues.length === 1 ? 'issue' : 'issues'}
                </span>
                <button
                  onClick={() => copyFilePrompt(file, issues)}
                  className={`ml-2 px-3 py-1.5 rounded text-sm font-medium flex items-center gap-1.5 transition-colors ${
                    copiedFile === file
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                  }`}
                  title={`Copy fix prompt for all ${issues.length} issues in this file`}
                >
                  {copiedFile === file ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Fix All
                    </>
                  )}
                </button>
              </div>
              {expandedFiles.has(file) && (
                <div className="border-t border-gray-800 divide-y divide-gray-800">
                  {issues.map((issue) => (
                    <IssueRow
                      key={issue.id}
                      issue={issue}
                      onResolve={() => resolveMutation.mutate(issue.id)}
                      onFixStarted={() => refetch()}
                      showFile={false}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Recent Scans */}
      {data?.recentScans && data.recentScans.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg">
          <div className="p-4 border-b border-gray-800">
            <h3 className="font-semibold text-white">Recent Scans</h3>
          </div>
          <div className="p-4">
            <div className="space-y-2">
              {data.recentScans.slice(0, 5).map((scan) => (
                <div key={scan.id} className="flex items-center gap-4 text-sm">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-400">{formatTimeAgo(scan.started_at)}</span>
                  <span className="text-white">{scan.scan_type}</span>
                  <span className={`${
                    scan.status === 'completed' ? 'text-green-400' :
                    scan.status === 'failed' ? 'text-red-400' : 'text-yellow-400'
                  }`}>
                    {scan.status}
                  </span>
                  <span className="text-gray-500">
                    {scan.total_issues} issues ({scan.new_issues} new, {scan.resolved_issues} resolved)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Run Scan Button */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        <h3 className="font-semibold text-white mb-2">Run Local Scan</h3>
        <p className="text-gray-400 text-sm mb-4">
          Run the health check script locally to scan for issues and log them here.
        </p>
        <code className="block bg-gray-950 text-green-400 p-3 rounded text-sm font-mono">
          npx tsx scripts/cicd-health-check.ts
        </code>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
  color
}: {
  label: string
  value: number
  icon: typeof AlertCircle
  color: string
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-gray-400 text-sm">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  )
}

function IssueRow({
  issue,
  onResolve,
  onFixStarted,
  showFile = true
}: {
  issue: CicdIssue
  onResolve: () => void
  onFixStarted?: () => void
  showFile?: boolean
}) {
  return (
    <div className="p-4 hover:bg-gray-800/30">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          {showFile && issue.file_path && (
            <p className="text-gray-400 text-xs font-mono mb-1 truncate">
              {issue.file_path}
              {issue.line_number && `:${issue.line_number}`}
            </p>
          )}
          {!showFile && issue.line_number && (
            <p className="text-gray-500 text-xs mb-1">Line {issue.line_number}</p>
          )}
          <p className="text-white text-sm">{issue.message}</p>
          <div className="flex items-center gap-2 mt-1">
            {issue.code && (
              <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">
                {issue.code}
              </span>
            )}
            {issue.fix_status === 'in_progress' && (
              <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">
                In Progress
              </span>
            )}
            {issue.fix_status === 'failed' && (
              <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded">
                Failed ({issue.fix_attempt_count || 1}x)
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          {issue.occurrence_count > 1 && (
            <span className="bg-gray-800 px-2 py-0.5 rounded">{issue.occurrence_count}x</span>
          )}
          <span>{formatTimeAgo(issue.last_seen_at)}</span>
          {issue.auto_fixable && (
            <span className="text-blue-400" title="Auto-fixable">
              <Play className="w-3 h-3" />
            </span>
          )}
          <FixSingleButton issue={issue} compact onFixStarted={onFixStarted} />
          <button
            onClick={onResolve}
            className="text-gray-400 hover:text-green-400"
            title="Mark as resolved"
          >
            <CheckCircle className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
