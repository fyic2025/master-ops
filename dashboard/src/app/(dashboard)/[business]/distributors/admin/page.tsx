'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Copy, Check, Database, ExternalLink, Mail, Link2, Trash2, CheckCircle, XCircle, Loader2 } from 'lucide-react'

const PRODUCT_TYPES_SQL = `-- Update product types (46 categories)
UPDATE tlx_products SET product_type =
  CASE
    -- Lions Mane
    WHEN (product_name ILIKE '%lions mane%' OR product_name ILIKE '%lion''s mane%') AND product_name ILIKE '%pure%' THEN 'Lions Mane Pure'
    WHEN product_name ILIKE '%lions mane%' OR product_name ILIKE '%lion''s mane%' THEN 'Lions Mane'

    -- Ashwagandha
    WHEN product_name ILIKE '%ashwa%' AND product_name ILIKE '%pure%' THEN 'Ashwagandha Pure'
    WHEN product_name ILIKE '%ashwa%' THEN 'Ashwagandha'

    -- Reishi
    WHEN product_name ILIKE '%reishi%' AND product_name ILIKE '%pure%' THEN 'Reishi Pure'
    WHEN product_name ILIKE '%reishi%' THEN 'Reishi'

    -- Chaga
    WHEN product_name ILIKE '%chaga%' AND product_name ILIKE '%pure%' THEN 'Chaga Pure'
    WHEN product_name ILIKE '%chaga%' THEN 'Chaga'

    -- Cordyceps
    WHEN product_name ILIKE '%cordyceps%' AND product_name ILIKE '%pure%' THEN 'Cordyceps Pure'
    WHEN product_name ILIKE '%cordyceps%' THEN 'Cordyceps'

    -- Other mushrooms
    WHEN product_name ILIKE '%tremella%' THEN 'Tremella'
    WHEN product_name ILIKE '%maitake%' THEN 'Maitake'
    WHEN product_name ILIKE '%shiitake%' THEN 'Shiitake'
    WHEN product_name ILIKE '%turkey tail%' THEN 'Turkey Tail'
    WHEN product_name ILIKE '%pearl%' THEN 'Pearl'
    WHEN product_name ILIKE '%immun%' THEN 'Immunity'

    -- Cans (Sparkling Elixir drinks)
    WHEN product_name ILIKE '%sparkling%' AND product_name ILIKE '%elixir%' THEN 'Cans'

    -- Latte flavours (4 variants)
    WHEN product_name ILIKE '%cacao%' AND product_name ILIKE '%latte%' THEN 'Latte - Cacao Rose'
    WHEN product_name ILIKE '%turmeric%' AND product_name ILIKE '%latte%' THEN 'Latte - Turmeric'
    WHEN product_name ILIKE '%beet%' AND product_name ILIKE '%latte%' THEN 'Latte - Beet'
    WHEN product_name ILIKE '%matcha%' AND product_name ILIKE '%latte%' THEN 'Latte - Matcha'

    -- Japanese Matcha (standalone, not latte)
    WHEN product_name ILIKE '%japanese matcha%' THEN 'Japanese Matcha'

    -- TLXR Blends
    WHEN product_name ILIKE '%body build%' THEN 'Body Build'
    WHEN product_name ILIKE '%body repair%' THEN 'Body Repair'

    -- Adaptogens
    WHEN product_name ILIKE '%siberian ginseng%' THEN 'Siberian Ginseng'
    WHEN product_name ILIKE '%bee pollen%' THEN 'Bee Pollen'
    WHEN product_name ILIKE '%fulvic%' THEN 'Fulvic Acid'
    WHEN product_name ILIKE '%resveratrol%' THEN 'Resveratrol'
    WHEN product_name ILIKE '%schizandra%' OR product_name ILIKE '%schisandra%' THEN 'Schizandra'
    WHEN product_name ILIKE '%red pine%' OR product_name ILIKE '%pine needle%' THEN 'Red Pine Needle'
    WHEN product_name ILIKE '%camu camu%' THEN 'Camu Camu'
    WHEN product_name ILIKE '%spirulina%' THEN 'Spirulina'
    WHEN product_name ILIKE '%stress less%' AND product_name NOT ILIKE '%bundle%' THEN 'Stress Less'
    WHEN product_name ILIKE '%maca%' THEN 'Maca'
    WHEN product_name ILIKE '%shilajit%' THEN 'Shilajit'
    WHEN product_name ILIKE '%he shou wu%' OR product_name ILIKE '%fo-ti%' THEN 'He Shou Wu'
    WHEN product_name ILIKE '%astragalus%' THEN 'Astragalus'
    WHEN product_name ILIKE '%goji%' THEN 'Goji'
    WHEN product_name ILIKE '%eucommia%' THEN 'Eucommia'
    WHEN product_name ILIKE '%gynostemma%' THEN 'Gynostemma'
    WHEN product_name ILIKE '%mucuna%' THEN 'Mucuna'
    WHEN product_name ILIKE '%rhodiola%' THEN 'Rhodiola'
    WHEN product_name ILIKE '%tocos%' THEN 'Tocos'
    WHEN product_name ILIKE '%deer antler%' OR product_name ILIKE '%velvet antler%' THEN 'Deer Antler'
    WHEN product_name ILIKE '%pine pollen%' THEN 'Pine Pollen'
    WHEN product_name ILIKE '%beauty%' OR product_name ILIKE '%skin%' OR product_name ILIKE '%glow%' THEN 'Beauty'

    ELSE 'Other'
  END
WHERE is_sellable = TRUE
  AND product_name NOT ILIKE '%raw%'
  AND product_name NOT ILIKE '%packaging%'
  AND product_name NOT ILIKE '%material%'
  AND product_name NOT ILIKE '%carbon%'
  AND product_name NOT ILIKE '%gift card%'
  AND product_name NOT ILIKE '%ebook%'
  AND product_name NOT ILIKE '%bundle%'
  AND product_name NOT ILIKE '%membership%'
  AND product_name NOT ILIKE '%cap%'
  AND product_name NOT ILIKE '%bottle%'
  AND product_name NOT ILIKE '%frother%'
  AND product_name NOT ILIKE '%mixer%'
  AND product_name NOT ILIKE '%shipper%'
  AND product_name NOT ILIKE '%box%'
  AND product_name NOT ILIKE '%probiotic%';

-- Check results
SELECT product_type, COUNT(*) as count
FROM tlx_products
WHERE product_type IS NOT NULL
GROUP BY product_type
ORDER BY count DESC;`

// Target emails to connect
const TARGET_EMAILS = [
  'warehouse@teelixir.com',
  'jayson@teelixir.com',
  'peter@teelixir.com',
]

interface GmailConnection {
  id: string
  email: string
  display_name: string | null
  connected_at: string
  last_sync_at: string | null
  is_active: boolean
}

export default function DistributorAdminPage() {
  const searchParams = useSearchParams()
  const [copied, setCopied] = useState(false)
  const [connections, setConnections] = useState<GmailConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [generatingLink, setGeneratingLink] = useState<string | null>(null)

  // Check for success/error messages from OAuth callback
  const success = searchParams.get('success')
  const connectedEmail = searchParams.get('email')
  const error = searchParams.get('error')

  useEffect(() => {
    fetchConnections()
  }, [])

  const fetchConnections = async () => {
    try {
      const response = await fetch('/api/auth/gmail/connections')
      const data = await response.json()
      setConnections(data.connections || [])
    } catch (err) {
      console.error('Failed to fetch connections:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(PRODUCT_TYPES_SQL)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const generateAuthLink = async (email: string) => {
    setGeneratingLink(email)
    try {
      const response = await fetch(`/api/auth/gmail/authorize?email=${encodeURIComponent(email)}`)
      const data = await response.json()
      if (data.authUrl) {
        // Open in new window
        window.open(data.authUrl, '_blank', 'width=600,height=700')
      }
    } catch (err) {
      console.error('Failed to generate auth link:', err)
    } finally {
      setGeneratingLink(null)
    }
  }

  const disconnectEmail = async (email: string) => {
    if (!confirm(`Disconnect ${email}?`)) return

    try {
      await fetch('/api/auth/gmail/connections', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      fetchConnections()
    } catch (err) {
      console.error('Failed to disconnect:', err)
    }
  }

  const isConnected = (email: string) => connections.some(c => c.email === email)
  const getConnection = (email: string) => connections.find(c => c.email === email)

  const supabaseUrl = 'https://supabase.com/dashboard/project/qcvfxxsnqvdfmpbcgdni/sql/new'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Distributor Admin</h1>
        <p className="text-gray-400 mt-1">Gmail connections & database maintenance</p>
      </div>

      {/* Success/Error Messages */}
      {success === 'connected' && connectedEmail && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-400" />
          <span className="text-green-300">Successfully connected {connectedEmail}</span>
        </div>
      )}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-center gap-3">
          <XCircle className="w-5 h-5 text-red-400" />
          <span className="text-red-300">Connection failed: {error}</span>
        </div>
      )}

      {/* Gmail Connections Section */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <Mail className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Gmail Connections</h2>
            <p className="text-sm text-gray-400">Connect mailboxes to receive distributor PO emails</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
          </div>
        ) : (
          <div className="space-y-3">
            {TARGET_EMAILS.map((email) => {
              const connection = getConnection(email)
              const connected = !!connection

              return (
                <div
                  key={email}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    connected
                      ? 'bg-green-500/5 border-green-500/30'
                      : 'bg-gray-800/50 border-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-gray-500'}`} />
                    <div>
                      <p className="text-white font-medium">{email}</p>
                      {connection && (
                        <p className="text-xs text-gray-400">
                          Connected {new Date(connection.connected_at).toLocaleDateString()}
                          {connection.last_sync_at && (
                            <> · Last sync {new Date(connection.last_sync_at).toLocaleDateString()}</>
                          )}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {connected ? (
                      <>
                        <span className="text-sm text-green-400 mr-2">Connected</span>
                        <button
                          onClick={() => disconnectEmail(email)}
                          className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Disconnect"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => generateAuthLink(email)}
                        disabled={generatingLink === email}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white rounded-lg transition-colors"
                      >
                        {generatingLink === email ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Link2 className="w-4 h-4" />
                            Connect
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <p className="text-sm text-blue-300">
            <strong>How it works:</strong> Click &quot;Connect&quot; to open Google&apos;s authorization page.
            Sign in with the Teelixir account and grant read-only access to emails.
            The system will then be able to scan for distributor PO emails.
          </p>
        </div>
      </div>

      {/* Product Types SQL Section */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Database className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Update Product Types</h2>
              <p className="text-sm text-gray-400">Classifies products with fuzzy matching</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                copied
                  ? 'bg-green-600 text-white'
                  : 'bg-purple-600 hover:bg-purple-500 text-white'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy SQL
                </>
              )}
            </button>
            <a
              href={supabaseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Open Supabase
            </a>
          </div>
        </div>

        <div className="bg-gray-950 rounded-lg p-4 overflow-x-auto max-h-64">
          <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
            {PRODUCT_TYPES_SQL}
          </pre>
        </div>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <h3 className="text-blue-300 font-medium mb-2">SQL Instructions</h3>
        <ol className="text-sm text-gray-300 space-y-1 list-decimal list-inside">
          <li>Click &quot;Copy SQL&quot; to copy the query</li>
          <li>Click &quot;Open Supabase&quot; to open the SQL editor</li>
          <li>Paste the SQL and click &quot;Run&quot;</li>
          <li>Check the results to verify classification</li>
        </ol>
      </div>
    </div>
  )
}
