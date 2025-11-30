'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body className="bg-gray-950">
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 max-w-md w-full text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Application Error</h2>
            <p className="text-gray-400 mb-6">
              {error.message || 'A critical error occurred'}
            </p>
            <button
              onClick={reset}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
            >
              Reload
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
