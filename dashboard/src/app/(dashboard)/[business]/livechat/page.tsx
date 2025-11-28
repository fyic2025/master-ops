'use client'

import { MessageSquare, ExternalLink } from 'lucide-react'
import Link from 'next/link'

export default function LiveChatPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">LiveChat Analytics</h1>
        <p className="text-gray-400 mt-1">Customer support insights and common issues</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center">
        <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Coming Soon</h2>
        <p className="text-gray-400 mb-6 max-w-md mx-auto">
          Analyze LiveChat conversations to identify common customer issues,
          checkout problems, and product questions.
        </p>
        <Link
          href="https://my.livechat.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg"
        >
          <ExternalLink className="w-4 h-4" />
          Open LiveChat
        </Link>
      </div>
    </div>
  )
}
