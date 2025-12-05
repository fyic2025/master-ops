'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { Users, Plus, Loader2, CheckCircle, AlertCircle, Copy, ExternalLink } from 'lucide-react'

interface CustomerFormData {
  email: string
  firstName: string
  lastName: string
  businessName: string
  phone: string
  abn: string
  address1: string
  city: string
  state: string
  postcode: string
}

const initialFormData: CustomerFormData = {
  email: '',
  firstName: '',
  lastName: '',
  businessName: '',
  phone: '',
  abn: '',
  address1: '',
  city: '',
  state: '',
  postcode: '',
}

export default function CustomersPage() {
  const params = useParams()
  const business = params?.business as string

  // Only show full functionality for Elevate
  if (business !== 'elevate') {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">Customers</h1>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center">
          <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">Customer management is only available for Elevate Wholesale.</p>
        </div>
      </div>
    )
  }

  return <ElevateCustomerCreator />
}

function ElevateCustomerCreator() {
  const [formData, setFormData] = useState<CustomerFormData>(initialFormData)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    message: string
    activationUrl?: string
    customerId?: string
  } | null>(null)
  const [copied, setCopied] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/elevate/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (response.ok) {
        setResult({
          success: true,
          message: data.message || 'Customer created successfully!',
          activationUrl: data.activationUrl,
          customerId: data.customerId
        })
        setFormData(initialFormData)
      } else {
        setResult({
          success: false,
          message: data.error || 'Failed to create customer'
        })
      }
    } catch (err: any) {
      setResult({
        success: false,
        message: err.message || 'Network error'
      })
    } finally {
      setLoading(false)
    }
  }

  const copyActivationUrl = async () => {
    if (result?.activationUrl) {
      await navigator.clipboard.writeText(result.activationUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Elevate Customers</h1>
        <p className="text-gray-400 mt-1">Create and manage wholesale customer accounts</p>
      </div>

      {/* Success/Error Message */}
      {result && (
        <div className={`rounded-lg p-4 ${
          result.success
            ? 'bg-green-900/20 border border-green-800'
            : 'bg-red-900/20 border border-red-800'
        }`}>
          <div className="flex items-start gap-3">
            {result.success ? (
              <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
            )}
            <div className="flex-1">
              <p className={result.success ? 'text-green-400' : 'text-red-400'}>
                {result.message}
              </p>

              {result.activationUrl && (
                <div className="mt-3 p-3 bg-gray-800 rounded-lg">
                  <p className="text-gray-400 text-sm mb-2">
                    Activation link (send to customer if needed):
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs text-gray-300 bg-gray-900 p-2 rounded overflow-x-auto">
                      {result.activationUrl}
                    </code>
                    <button
                      onClick={copyActivationUrl}
                      className="p-2 text-gray-400 hover:text-white bg-gray-700 rounded transition-colors"
                      title="Copy URL"
                    >
                      {copied ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <a
                      href={result.activationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-gray-400 hover:text-white bg-gray-700 rounded transition-colors"
                      title="Open URL"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                  <p className="text-green-400 text-sm mt-2">
                    An activation email has also been sent to the customer automatically.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Customer Form */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <Plus className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Create New Customer</h2>
            <p className="text-gray-500 text-sm">Add a new wholesale customer to Shopify</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Contact Information */}
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-3">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Email <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  placeholder="customer@example.com"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  placeholder="+61 400 000 000"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  First Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  placeholder="John"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Last Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  placeholder="Smith"
                />
              </div>
            </div>
          </div>

          {/* Business Information */}
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-3">Business Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Business Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  placeholder="ABC Health Store"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">ABN</label>
                <input
                  type="text"
                  name="abn"
                  value={formData.abn}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  placeholder="12 345 678 901"
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-3">Address</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-400 mb-1">Street Address</label>
                <input
                  type="text"
                  name="address1"
                  value={formData.address1}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  placeholder="123 Main Street"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">City</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  placeholder="Melbourne"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">State</label>
                  <select
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="">Select...</option>
                    <option value="VIC">VIC</option>
                    <option value="NSW">NSW</option>
                    <option value="QLD">QLD</option>
                    <option value="WA">WA</option>
                    <option value="SA">SA</option>
                    <option value="TAS">TAS</option>
                    <option value="NT">NT</option>
                    <option value="ACT">ACT</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Postcode</label>
                  <input
                    type="text"
                    name="postcode"
                    value={formData.postcode}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                    placeholder="3000"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end pt-4 border-t border-gray-800">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Create Customer
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Info Box */}
      <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
        <h3 className="text-blue-400 font-medium mb-2">How it works</h3>
        <ul className="text-gray-400 text-sm space-y-1">
          <li>1. Fill in the customer details and submit</li>
          <li>2. System checks for duplicate emails in Shopify</li>
          <li>3. Customer is created with &quot;approved&quot; tag</li>
          <li>4. Activation email is automatically sent to customer</li>
          <li>5. Customer clicks link, enters code, and can start ordering</li>
        </ul>
      </div>
    </div>
  )
}
