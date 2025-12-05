'use client'

import { useState, useEffect } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { Send, CheckCircle, Loader2, ChevronDown, Zap, ClipboardList, Clock, XCircle, AlertTriangle, DollarSign, Cpu, RefreshCw } from 'lucide-react'

const BUSINESSES = [
  { value: '', label: 'General / All' },
  { value: 'teelixir', label: 'Teelixir' },
  { value: 'boo', label: 'Buy Organics Online' },
  { value: 'elevate', label: 'Elevate Wholesale' },
  { value: 'rhf', label: 'Red Hill Fresh' },
]

const PRIORITIES = [
  { value: 1, label: 'P1 - Urgent', color: 'text-red-400' },
  { value: 2, label: 'P2 - High', color: 'text-orange-400' },
  { value: 3, label: 'P3 - Normal', color: 'text-yellow-400' },
  { value: 4, label: 'P4 - Low', color: 'text-gray-400' },
]

interface Task {
  id: number
  title: string
  status: string
  execution_type: string
  created_at: string
  completed_at?: string
  model_used?: string
  automation_notes?: string
  completion_notes?: string
  escalated?: boolean
}

const STATUS_CONFIG: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  pending: { icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/20', label: 'Pending' },
  in_progress: { icon: Loader2, color: 'text-blue-400', bg: 'bg-blue-500/20', label: 'Running' },
  completed: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/20', label: 'Completed' },
  failed: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/20', label: 'Failed' },
  needs_manual: { icon: AlertTriangle, color: 'text-orange-400', bg: 'bg-orange-500/20', label: 'Needs Review' },
  blocked: { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/20', label: 'Blocked' },
}

export default function AddTaskPage() {
  const { data: session, status } = useSession()
  const [title, setTitle] = useState('')
  const [instructions, setInstructions] = useState('')
  const [business, setBusiness] = useState('')
  const [priority, setPriority] = useState(3)
  const [autoExecute, setAutoExecute] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Recent tasks tracking
  const [recentTasks, setRecentTasks] = useState<Task[]>([])
  const [loadingTasks, setLoadingTasks] = useState(false)

  // Fetch recent tasks on mount and periodically
  useEffect(() => {
    if (session?.user?.email) {
      fetchRecentTasks()
      const interval = setInterval(fetchRecentTasks, 10000) // Poll every 10s
      return () => clearInterval(interval)
    }
  }, [session?.user?.email])

  const fetchRecentTasks = async () => {
    try {
      const res = await fetch('/api/tasks?limit=5&order=created_at.desc')
      if (res.ok) {
        const data = await res.json()
        setRecentTasks(data.tasks || [])
      }
    } catch (err) {
      console.error('Failed to fetch tasks:', err)
    }
  }

  // Loading auth
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    )
  }

  // Not logged in
  if (!session) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6">
        <ClipboardList className="w-16 h-16 text-gray-600 mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Add Task</h1>
        <p className="text-gray-400 text-center mb-6">Sign in to submit tasks</p>
        <button
          onClick={() => signIn('google')}
          className="flex items-center gap-3 bg-white text-gray-900 px-6 py-3 rounded-xl font-medium text-lg"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Sign in with Google
        </button>
      </div>
    )
  }

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('Please enter a task title')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          instructions: instructions.trim() || null,
          business: business || null,
          priority,
          execution_type: autoExecute ? 'auto' : 'manual',
          created_by: session.user?.email || 'mobile',
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create task')
      }

      const data = await res.json()

      // Add to recent tasks immediately
      setRecentTasks(prev => [data.task, ...prev.slice(0, 4)])

      // Reset form
      setTitle('')
      setInstructions('')
      setBusiness('')
      setPriority(3)
      setAutoExecute(false)

    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const parseAutomationNotes = (notes?: string) => {
    if (!notes) return null
    const match = notes.match(/total_cost_usd:\s*([\d.]+)/)
    const durationMatch = notes.match(/total_duration_ms:\s*(\d+)/)
    const attemptsMatch = notes.match(/total_attempts:\s*(\d+)/)
    return {
      cost: match ? parseFloat(match[1]) : null,
      duration: durationMatch ? parseInt(durationMatch[1]) : null,
      attempts: attemptsMatch ? parseInt(attemptsMatch[1]) : null,
    }
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}m`
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <div className="sticky top-0 bg-gray-900/95 backdrop-blur border-b border-gray-800 px-4 py-4 z-10">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-blue-500" />
            Quick Task
          </h1>
          <button
            onClick={fetchRecentTasks}
            className="text-gray-400 hover:text-white p-2"
          >
            <RefreshCw className={`w-5 h-5 ${loadingTasks ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-lg mx-auto p-4 space-y-5">
        {/* Error Message */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 text-red-300">
            {error}
          </div>
        )}

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            What needs to be done?
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Fix checkout bug on Teelixir"
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-4 text-white text-lg placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          />
        </div>

        {/* Instructions */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Details / Instructions (optional)
          </label>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Paste any additional context, error messages, or specific instructions..."
            rows={4}
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-4 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
          />
        </div>

        {/* Business & Priority Row */}
        <div className="grid grid-cols-2 gap-3">
          {/* Business */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Business
            </label>
            <div className="relative">
              <select
                value={business}
                onChange={(e) => setBusiness(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3.5 text-white appearance-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              >
                {BUSINESSES.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Priority
            </label>
            <div className="relative">
              <select
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3.5 text-white appearance-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Auto-Execute Toggle */}
        <button
          type="button"
          onClick={() => setAutoExecute(!autoExecute)}
          className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
            autoExecute
              ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
              : 'bg-gray-900 border-gray-700 text-gray-400'
          }`}
        >
          <div className="flex items-center gap-3">
            <Zap className={`w-5 h-5 ${autoExecute ? 'text-blue-400' : 'text-gray-500'}`} />
            <div className="text-left">
              <div className={`font-medium ${autoExecute ? 'text-white' : 'text-gray-300'}`}>
                Auto-execute with Claude
              </div>
              <div className="text-sm">
                {autoExecute ? 'Will run automatically' : 'Manual review first'}
              </div>
            </div>
          </div>
          <div
            className={`w-12 h-7 rounded-full transition-colors flex items-center px-1 ${
              autoExecute ? 'bg-blue-500' : 'bg-gray-700'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                autoExecute ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </div>
        </button>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={submitting || !title.trim()}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold py-4 rounded-xl flex items-center justify-center gap-2 text-lg transition-colors"
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              Submit Task
            </>
          )}
        </button>

        {/* Recent Tasks */}
        {recentTasks.length > 0 && (
          <div className="pt-4 border-t border-gray-800">
            <h2 className="text-sm font-medium text-gray-400 mb-3">Recent Tasks</h2>
            <div className="space-y-3">
              {recentTasks.map((task) => {
                const statusCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending
                const StatusIcon = statusCfg.icon
                const notes = parseAutomationNotes(task.automation_notes)

                return (
                  <div
                    key={task.id}
                    className={`${statusCfg.bg} border border-gray-700/50 rounded-xl p-4`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <StatusIcon
                            className={`w-4 h-4 flex-shrink-0 ${statusCfg.color} ${
                              task.status === 'in_progress' ? 'animate-spin' : ''
                            }`}
                          />
                          <span className={`text-xs font-medium ${statusCfg.color}`}>
                            {statusCfg.label}
                          </span>
                          {task.execution_type === 'auto' && (
                            <Zap className="w-3 h-3 text-blue-400" />
                          )}
                        </div>
                        <p className="text-white text-sm font-medium truncate">
                          {task.title}
                        </p>
                      </div>
                    </div>

                    {/* Show cost/model for completed tasks */}
                    {(task.status === 'completed' || task.status === 'failed' || task.status === 'needs_manual') && (
                      <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-gray-700/50 text-xs">
                        {task.model_used && (
                          <div className="flex items-center gap-1 text-gray-400">
                            <Cpu className="w-3 h-3" />
                            <span>{task.model_used}</span>
                            {task.escalated && (
                              <span className="text-orange-400">(escalated)</span>
                            )}
                          </div>
                        )}
                        {notes?.cost != null && notes.cost > 0 && (
                          <div className="flex items-center gap-1 text-gray-400">
                            <DollarSign className="w-3 h-3" />
                            <span>${notes?.cost?.toFixed(4)}</span>
                          </div>
                        )}
                        {notes?.duration && (
                          <div className="flex items-center gap-1 text-gray-400">
                            <Clock className="w-3 h-3" />
                            <span>{formatDuration(notes.duration)}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Show completion notes preview */}
                    {task.completion_notes && task.status === 'completed' && (
                      <p className="text-gray-400 text-xs mt-2 line-clamp-2">
                        {task.completion_notes.slice(0, 150)}...
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Logged in as */}
        <p className="text-center text-gray-500 text-sm pt-2">
          {session.user?.email}
        </p>
      </div>
    </div>
  )
}
