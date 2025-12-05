'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, X, File, Loader2 } from 'lucide-react'

interface AttachmentUploadProps {
  taskId: number | string
  uploadedBy?: string
  onUploadComplete?: () => void
  disabled?: boolean
}

const ALLOWED_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
]

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export default function AttachmentUpload({
  taskId,
  uploadedBy = 'dashboard',
  onUploadComplete,
  disabled = false,
}: AttachmentUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [description, setDescription] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `File type not allowed: ${file.type}. Allowed: PDF, images, Word, Excel, text, CSV`
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 10MB`
    }
    return null
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) setIsDragging(true)
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (disabled) return

    const file = e.dataTransfer.files[0]
    if (file) {
      const error = validateFile(file)
      if (error) {
        setError(error)
        return
      }
      setError(null)
      setSelectedFile(file)
    }
  }, [disabled])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const error = validateFile(file)
      if (error) {
        setError(error)
        return
      }
      setError(null)
      setSelectedFile(file)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || isUploading) return

    setIsUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('uploaded_by', uploadedBy)
      if (description.trim()) {
        formData.append('description', description.trim())
      }

      const response = await fetch(`/api/tasks/${taskId}/attachments`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Upload failed')
      }

      // Reset form
      setSelectedFile(null)
      setDescription('')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      // Notify parent
      onUploadComplete?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  const cancelSelection = () => {
    setSelectedFile(null)
    setDescription('')
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      {!selectedFile && (
        <div
          className={`
            border-2 border-dashed rounded-lg p-4 text-center cursor-pointer
            transition-colors duration-200
            ${isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-400 dark:hover:border-gray-500'}
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
        >
          <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Drop a file here or click to browse
          </p>
          <p className="text-xs text-gray-500 mt-1">
            PDF, images, Word, Excel, CSV (max 10MB)
          </p>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept={ALLOWED_TYPES.join(',')}
            onChange={handleFileSelect}
            disabled={disabled}
          />
        </div>
      )}

      {/* Selected file preview */}
      {selectedFile && (
        <div className="border rounded-lg p-3 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <File className="w-5 h-5 text-blue-500" />
              <span className="text-sm font-medium truncate max-w-[200px]">
                {selectedFile.name}
              </span>
              <span className="text-xs text-gray-500">
                ({(selectedFile.size / 1024).toFixed(1)} KB)
              </span>
            </div>
            <button
              onClick={cancelSelection}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
              disabled={isUploading}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Description input */}
          <input
            type="text"
            placeholder="Add description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full text-sm px-2 py-1 border rounded mb-2 dark:bg-gray-700 dark:border-gray-600"
            disabled={isUploading}
          />

          {/* Upload button */}
          <button
            onClick={handleUpload}
            disabled={isUploading}
            className="w-full py-1.5 px-3 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Upload
              </>
            )}
          </button>
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  )
}
