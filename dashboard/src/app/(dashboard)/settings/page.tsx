import { Settings, Key, Bell, Users } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="text-gray-400 mt-1">Dashboard configuration</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* API Connections */}
        <section className="bg-gray-900 border border-gray-800 rounded-lg">
          <div className="p-4 border-b border-gray-800 flex items-center gap-2">
            <Key className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-white">API Connections</h2>
          </div>
          <div className="p-4 space-y-3">
            <ConnectionRow name="Supabase" connected={false} />
            <ConnectionRow name="BigCommerce" connected={false} />
            <ConnectionRow name="Shopify" connected={false} />
            <ConnectionRow name="HubSpot" connected={false} />
            <ConnectionRow name="Google Ads" connected={false} />
          </div>
        </section>

        {/* Notifications */}
        <section className="bg-gray-900 border border-gray-800 rounded-lg">
          <div className="p-4 border-b border-gray-800 flex items-center gap-2">
            <Bell className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-white">Notifications</h2>
          </div>
          <div className="p-4">
            <p className="text-gray-400 text-sm">Notification settings coming soon</p>
          </div>
        </section>

        {/* Users */}
        <section className="bg-gray-900 border border-gray-800 rounded-lg">
          <div className="p-4 border-b border-gray-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-white">Team Access</h2>
          </div>
          <div className="p-4">
            <p className="text-gray-400 text-sm">Team management coming soon</p>
          </div>
        </section>
      </div>
    </div>
  )
}

function ConnectionRow({ name, connected }: { name: string; connected: boolean }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-white">{name}</span>
      <span className={`text-sm ${connected ? 'text-green-500' : 'text-gray-500'}`}>
        {connected ? 'Connected' : 'Not connected'}
      </span>
    </div>
  )
}
