'use client'

import { useState } from 'react'
import {
  File,
  FileText,
  FileImage,
  FileSpreadsheet,
  Download,
  Trash2,
  Loader2,
  ExternalLink,
} from 'lucide-react'

interface Attachment {
  id: string
  filename: string
  original_filename: string
  file_type: string
  size_bytes: number
  storage_path: string
  uploaded_by: string
  description: string | null
  uploaded_at: string
}

interface AttachmentListProps {
  taskId: number | string
  attachments: Attachment[]
  onDelete?: () => void
  currentUser?: string
}

function getFileIcon(fileType: string) {
  if (fileType.startsWith('image/')) {
    return <FileImage className="w-5 h-5 text-purple-500" />
  }
  if (fileType === 'application/pdf') {
    return <FileText className="w-5 h-5 text-red-500" />
  }
  if (fileType.includes('spreadsheet') || fileType.includes('excel') || fileType === 'text/csv') {
    return <FileSpreadsheet className="w-5 h-5 text-green-500" />
  }
  if (fileType.includes('word') || fileType.includes('document')) {
    return <FileText className="w-5 h-5 text-blue-500" />
  }
  return <File className="w-5 h-5 text-gray-500" />
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function AttachmentList({
  taskId,
  attachments,
  onDelete,
  currentUser = 'dashboard',
}: AttachmentListProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleDownload = async (attachment: Attachment) => {
    setLoadingId(attachment.id)
    setError(null)

    try {
      const response = await fetch(
        `/api/tasks/${taskId}/attachments/${attachment.id}`
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to get download URL')
      }

      const data = await response.json()

      // Open download URL in new tab
      window.open(data.downloadUrl, '_blank')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed')
    } finally {
      setLoadingId(null)
    }
  }

  const handleDelete = async (attachment: Attachment) => {
    if (!confirm(`Delete "${attachment.original_filename}"?`)) return

    setDeletingId(attachment.id)
    setError(null)

    try {
      const response = await fetch(
        `/api/tasks/${taskId}/attachments/${attachment.id}?deleted_by=${encodeURIComponent(currentUser)}`,
        { method: 'DELETE' }
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Delete failed')
      }

      onDelete?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setDeletingId(null)
    }
  }

  if (attachments.length === 0) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400 italic">
        No attachments
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 mb-2">{error}</p>
      )}

      {attachments.map((attachment) => (
        <div
          key={attachment.id}
          className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
        >
          {/* File icon */}
          {getFileIcon(attachment.file_type)}

          {/* File info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {attachment.original_filename}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {formatFileSize(attachment.size_bytes)} &bull;{' '}
              {attachment.uploaded_by} &bull;{' '}
              {formatDate(attachment.uploaded_at)}
            </p>
            {attachment.description && (
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
                {attachment.description}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleDownload(attachment)}
              disabled={loadingId === attachment.id}
              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded disabled:opacity-50"
              title="Download"
            >
              {loadingId === attachment.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
            </button>

            <button
              onClick={() => handleDelete(attachment)}
              disabled={deletingId === attachment.id}
              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded disabled:opacity-50"
              title="Delete"
            >
              {deletingId === attachment.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
