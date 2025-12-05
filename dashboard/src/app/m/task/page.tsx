'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { Send, CheckCircle, Loader2, ChevronDown, Zap, Clock, XCircle, AlertTriangle, Cpu, RefreshCw, Image as ImageIcon, X, Camera } from 'lucide-react'

const BUSINESSES = [
  { value: 'overall', label: 'General' },
  { value: 'teelixir', label: 'Teelixir' },
  { value: 'boo', label: 'BOO' },
  { value: 'elevate', label: 'Elevate' },
  { value: 'rhf', label: 'RHF' },
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
  escalated?: boolean
}

const STATUS_CONFIG: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  pending: { icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/20', label: 'Queued' },
  pending_input: { icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/20', label: 'Queued' },
  in_progress: { icon: Loader2, color: 'text-blue-400', bg: 'bg-blue-500/20', label: 'Running' },
  completed: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/20', label: 'Done' },
  failed: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/20', label: 'Failed' },
  needs_manual: { icon: AlertTriangle, color: 'text-orange-400', bg: 'bg-orange-500/20', label: 'Review' },
}

export default function MobileTaskPage() {
  const { data: session, status } = useSession()
  const [title, setTitle] = useState('')
  const [details, setDetails] = useState('')
  const [business, setBusiness] = useState('overall')
  const [submitting, setSubmitting] = useState(false)
  const [justSubmitted, setJustSubmitted] = useState<Task | null>(null)
  const [error, setError] = useState('')
  const [recentTasks, setRecentTasks] = useState<Task[]>([])

  // Image handling
  const [images, setImages] = useState<{ file: File; preview: string }[]>([])
  const [uploadingImage, setUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const detailsRef = useRef<HTMLTextAreaElement>(null)

  // Fetch recent tasks
  useEffect(() => {
    if (session?.user?.email) {
      fetchRecentTasks()
      const interval = setInterval(fetchRecentTasks, 8000)
      return () => clearInterval(interval)
    }
  }, [session?.user?.email])

  // Handle paste events for images
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault()
          const file = item.getAsFile()
          if (file) {
            addImage(file)
          }
          break
        }
      }
    }

    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [])

  const addImage = (file: File) => {
    if (images.length >= 3) {
      setError('Max 3 images')
      return
    }

    const preview = URL.createObjectURL(file)
    setImages(prev => [...prev, { file, preview }])
  }

  const removeImage = (index: number) => {
    setImages(prev => {
      const newImages = [...prev]
      URL.revokeObjectURL(newImages[index].preview)
      newImages.splice(index, 1)
      return newImages
    })
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    for (const file of files) {
      if (file.type.startsWith('image/')) {
        addImage(file)
      }
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      // Convert to base64 for simple storage in task metadata
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          resolve(reader.result as string)
        }
        reader.readAsDataURL(file)
      })
    } catch (err) {
      console.error('Failed to process image:', err)
      return null
    }
  }

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

  // Auth loading
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    )
  }

  // Not logged in
  if (!session) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 safe-area-inset">
        <Zap className="w-16 h-16 text-blue-500 mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Quick Task</h1>
        <p className="text-gray-400 text-center mb-8">Auto-execute tasks with Claude</p>
        <button
          onClick={() => signIn('google')}
          className="flex items-center gap-3 bg-white text-gray-900 px-8 py-4 rounded-2xl font-semibold text-lg active:scale-95 transition-transform"
        >
          <svg className="w-6 h-6" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Sign in
        </button>
      </div>
    )
  }

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('Enter what needs to be done')
      return
    }

    setSubmitting(true)
    setError('')
    setJustSubmitted(null)

    try {
      // Process images to base64
      let imageUrls: string[] = []
      if (images.length > 0) {
        setUploadingImage(true)
        for (const img of images) {
          const url = await uploadImage(img.file)
          if (url) imageUrls.push(url)
        }
        setUploadingImage(false)
      }

      // Build description with image references
      let fullDescription = details.trim()
      if (imageUrls.length > 0) {
        fullDescription += `\n\n[${imageUrls.length} image(s) attached]`
      }

      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: fullDescription || null,
          business: business || 'overall',
          priority: 2,
          execution_type: 'auto',
          created_by: session.user?.email || 'mobile',
          status: 'pending',
          metadata: imageUrls.length > 0 ? { images: imageUrls } : null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create task')
      }

      const data = await res.json()

      // Show success
      setJustSubmitted(data.task)

      // Reset form
      setTitle('')
      setDetails('')
      images.forEach(img => URL.revokeObjectURL(img.preview))
      setImages([])

      // Refresh tasks
      fetchRecentTasks()

      // Clear success after 4s
      setTimeout(() => setJustSubmitted(null), 4000)

    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
      setUploadingImage(false)
    }
  }

  const parseNotes = (notes?: string) => {
    if (!notes) return null
    const cost = notes.match(/total_cost_usd:\s*([\d.]+)/)
    const duration = notes.match(/total_duration_ms:\s*(\d+)/)
    return {
      cost: cost ? parseFloat(cost[1]) : null,
      duration: duration ? Math.round(parseInt(duration[1]) / 1000) : null,
    }
  }

  return (
    <div className="min-h-screen bg-black text-white safe-area-inset pb-20">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Success Toast */}
      {justSubmitted && (
        <div className="fixed top-4 left-4 right-4 z-50 animate-slide-down">
          <div className="bg-green-500 text-white rounded-2xl p-4 flex items-center gap-3 shadow-lg">
            <CheckCircle className="w-6 h-6 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-semibold">Task Queued!</div>
              <div className="text-sm opacity-90 truncate">{justSubmitted.title}</div>
            </div>
            <Zap className="w-5 h-5 opacity-75" />
          </div>
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 bg-black/95 backdrop-blur-lg border-b border-gray-800 px-4 py-4 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-6 h-6 text-blue-500" />
            <span className="text-lg font-bold">Quick Task</span>
          </div>
          <button
            onClick={fetchRecentTasks}
            className="p-2 text-gray-400 active:text-white"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="p-4 space-y-4">
        {/* Error */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-2xl p-4 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Title Input */}
        <div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs to be done?"
            className="w-full bg-gray-900 border-2 border-gray-700 rounded-2xl px-4 py-4 text-white text-lg placeholder-gray-500 focus:border-blue-500 outline-none"
            autoFocus
          />
        </div>

        {/* Details */}
        <div>
          <textarea
            ref={detailsRef}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Add details... (paste images here)"
            rows={3}
            className="w-full bg-gray-900 border-2 border-gray-700 rounded-2xl px-4 py-4 text-white placeholder-gray-500 focus:border-blue-500 outline-none resize-none"
          />
        </div>

        {/* Image Previews */}
        {images.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {images.map((img, i) => (
              <div key={i} className="relative flex-shrink-0">
                <img
                  src={img.preview}
                  alt={`Attachment ${i + 1}`}
                  className="w-20 h-20 object-cover rounded-xl border-2 border-gray-700"
                />
                <button
                  onClick={() => removeImage(i)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add Image Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 text-gray-400 hover:text-white px-2 py-1"
        >
          <Camera className="w-5 h-5" />
          <span className="text-sm">
            {images.length > 0 ? `Add more (${images.length}/3)` : 'Add screenshot/photo'}
          </span>
        </button>

        {/* Business Selector */}
        <div className="relative">
          <select
            value={business}
            onChange={(e) => setBusiness(e.target.value)}
            className="w-full bg-gray-900 border-2 border-gray-700 rounded-2xl px-4 py-4 text-white appearance-none focus:border-blue-500 outline-none text-lg"
          >
            {BUSINESSES.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-500 pointer-events-none" />
        </div>

        {/* Auto Badge */}
        <div className="flex items-center gap-2 px-1 text-blue-400">
          <Zap className="w-4 h-4" />
          <span className="text-sm">Will auto-execute with Claude</span>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={submitting || !title.trim()}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-600 text-white font-bold py-5 rounded-2xl flex items-center justify-center gap-3 text-xl active:scale-[0.98] transition-all"
        >
          {submitting ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              {uploadingImage ? 'Uploading...' : 'Submitting...'}
            </>
          ) : (
            <>
              <Send className="w-6 h-6" />
              Submit Task
              {images.length > 0 && (
                <span className="bg-blue-500 text-xs px-2 py-0.5 rounded-full">
                  +{images.length} img
                </span>
              )}
            </>
          )}
        </button>
      </div>

      {/* Recent Tasks */}
      {recentTasks.length > 0 && (
        <div className="px-4 pb-8">
          <div className="border-t border-gray-800 pt-4">
            <h2 className="text-sm font-medium text-gray-500 mb-3 px-1">Recent</h2>
            <div className="space-y-2">
              {recentTasks.map((task) => {
                const cfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending
                const Icon = cfg.icon
                const notes = parseNotes(task.automation_notes)

                return (
                  <div
                    key={task.id}
                    className={`${cfg.bg} rounded-xl p-3 border border-gray-800`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon
                        className={`w-4 h-4 flex-shrink-0 ${cfg.color} ${
                          task.status === 'in_progress' ? 'animate-spin' : ''
                        }`}
                      />
                      <span className={`text-xs font-medium ${cfg.color}`}>
                        {cfg.label}
                      </span>
                      {task.execution_type === 'auto' && (
                        <Zap className="w-3 h-3 text-blue-400" />
                      )}
                      {task.model_used && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Cpu className="w-3 h-3" />
                          {task.model_used}
                        </span>
                      )}
                      {notes?.cost != null && notes.cost > 0 && (
                        <span className="text-xs text-gray-500">
                          ${notes.cost.toFixed(3)}
                        </span>
                      )}
                    </div>
                    <p className="text-white text-sm mt-1 line-clamp-2">
                      {task.title}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur border-t border-gray-800 px-4 py-3 text-center">
        <span className="text-gray-600 text-xs">{session.user?.email}</span>
      </div>

      <style jsx global>{`
        .safe-area-inset {
          padding-top: env(safe-area-inset-top);
          padding-bottom: env(safe-area-inset-bottom);
        }
        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-down {
          animation: slide-down 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
