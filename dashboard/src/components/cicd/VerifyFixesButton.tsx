'use client'

import { useState } from 'react'
import { CheckCircle2, Loader2, Terminal, Upload, AlertCircle, ClipboardCopy } from 'lucide-react'
import type { CicdIssue } from '@/lib/cicd/prompt-generator'

interface VerifyFixesButtonProps {
  inProgressIssues: CicdIssue[]
  onVerificationComplete?: () => void
  className?: string
}

interface VerificationResult {
  issueId: string
  stillExists: boolean
}

export function VerifyFixesButton({
  inProgressIssues,
  onVerificationComplete,
  className = ''
}: VerifyFixesButtonProps) {
  const [showModal, setShowModal] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [verificationResults, setVerificationResults] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<{ fixed: number; failed: number } | null>(null)
  const [copiedCommand, setCopiedCommand] = useState(false)

  if (inProgressIssues.length === 0) {
    return null
  }

  const verifyCommand = 'npx tsx scripts/cicd-health-check.ts --verify'

  const handleCopyCommand = async () => {
    await navigator.clipboard.writeText(verifyCommand)
    setCopiedCommand(true)
    setTimeout(() => setCopiedCommand(false), 2000)
  }

  const handleVerify = async () => {
    if (!verificationResults.trim()) {
      setError('Please paste the verification output')
      return
    }

    setVerifying(true)
    setError(null)

    try {
      // Parse verification results from the health check output
      // Format: JSON array of still-existing issues (file_path, line_number, message, code)
      let parsedResults: VerificationResult[] = []

      try {
        // Try to parse as JSON first (if --verify mode outputs JSON)
        const jsonData = JSON.parse(verificationResults)

        if (Array.isArray(jsonData)) {
          // Map found issues to verification results
          // Issues NOT in the JSON output are considered fixed
          const foundIssues = new Set(
            jsonData.map((issue: any) =>
              `${issue.file_path || issue.file}:${issue.line_number || issue.line}:${issue.message}`
            )
          )

          parsedResults = inProgressIssues.map(issue => ({
            issueId: issue.id,
            stillExists: foundIssues.has(`${issue.file_path}:${issue.line_number}:${issue.message}`)
          }))
        }
      } catch {
        // Not JSON - parse line-by-line for TypeScript error format
        // Format: file(line,col): error TSxxxx: message
        const lines = verificationResults.split('\n')
        const errorRegex = /^(.+?)\((\d+),(\d+)\):\s*(error|warning)\s+(TS\d+):\s*(.+)$/

        const foundErrors: { file: string; line: number; message: string }[] = []
        for (const line of lines) {
          const match = line.match(errorRegex)
          if (match) {
            foundErrors.push({
              file: match[1].replace(/\\/g, '/'),
              line: parseInt(match[2], 10),
              message: match[6].trim()
            })
          }
        }

        // Match found errors against in-progress issues
        parsedResults = inProgressIssues.map(issue => {
          const stillExists = foundErrors.some(
            err =>
              err.file.includes(issue.file_path || '') &&
              err.line === issue.line_number &&
              err.message.includes(issue.message.substring(0, 50))
          )
          return { issueId: issue.id, stillExists }
        })
      }

      // Send verification results to API
      const response = await fetch('/api/cicd/fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          verificationResults: parsedResults
        })
      })

      if (!response.ok) {
        throw new Error('Failed to submit verification results')
      }

      const data = await response.json()
      setResults({ fixed: data.fixedCount, failed: data.failedCount })

      // Close modal after showing results for 3 seconds
      setTimeout(() => {
        setShowModal(false)
        setResults(null)
        setVerificationResults('')
        onVerificationComplete?.()
      }, 3000)
    } catch (err: any) {
      setError(err.message || 'Verification failed')
    } finally {
      setVerifying(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-yellow-500 hover:bg-yellow-600 text-black transition-colors ${className}`}
      >
        <CheckCircle2 className="w-4 h-4" />
        Verify {inProgressIssues.length} Fixes
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-slate-800 rounded-xl p-6 max-w-2xl w-full mx-4 shadow-2xl border border-slate-700">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Terminal className="w-5 h-5 text-yellow-400" />
              Verify Fixes
            </h2>

            {results ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-400" />
                <h3 className="text-2xl font-bold mb-2">Verification Complete</h3>
                <p className="text-lg">
                  <span className="text-green-400">{results.fixed} fixed</span>
                  {results.failed > 0 && (
                    <>, <span className="text-red-400">{results.failed} still broken</span></>
                  )}
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-slate-300 mb-2">
                      Run this command in your terminal to check which issues are fixed:
                    </p>
                    <div className="flex items-center gap-2 bg-slate-900 rounded-lg p-3 font-mono text-sm">
                      <code className="flex-1 text-green-400">{verifyCommand}</code>
                      <button
                        onClick={handleCopyCommand}
                        className="p-1.5 rounded hover:bg-slate-700 transition-colors"
                        title="Copy command"
                      >
                        {copiedCommand ? (
                          <CheckCircle2 className="w-4 h-4 text-green-400" />
                        ) : (
                          <ClipboardCopy className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-slate-300 mb-2">
                      Paste the output below:
                    </label>
                    <textarea
                      value={verificationResults}
                      onChange={(e) => setVerificationResults(e.target.value)}
                      placeholder="Paste the output from the health check script here..."
                      className="w-full h-48 bg-slate-900 border border-slate-600 rounded-lg p-3 font-mono text-sm text-slate-300 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    />
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 text-red-400 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      {error}
                    </div>
                  )}

                  <div className="bg-slate-700/50 rounded-lg p-3">
                    <p className="text-xs text-slate-400">
                      <strong>Tip:</strong> The script will output any remaining TypeScript errors.
                      If your fixes worked, the issues should not appear in the output.
                      Issues not found in the output will be marked as resolved.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowModal(false)
                      setVerificationResults('')
                      setError(null)
                    }}
                    className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleVerify}
                    disabled={verifying || !verificationResults.trim()}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-yellow-500 hover:bg-yellow-600 disabled:bg-slate-600 disabled:text-slate-400 text-black transition-colors"
                  >
                    {verifying ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    Submit Verification
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default VerifyFixesButton
