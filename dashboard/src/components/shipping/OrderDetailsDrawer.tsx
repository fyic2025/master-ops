'use client'

import { useState, useEffect } from 'react'
import {
  X,
  Package,
  Truck,
  User,
  MapPin,
  Scale,
  Printer,
  Loader2,
  CheckCircle,
  ExternalLink,
  AlertCircle,
  AlertTriangle,
  Check
} from 'lucide-react'
import { PACKAGE_PRESETS, suggestPackage } from '@/lib/package-presets'
import { printZPL, checkPrinterStatus, openZPLViewer } from '@/lib/zebra-print'

// Types
interface ShippingOrder {
  id: string
  order_number: string
  source: string
  source_order_id: string
  business_code: string
  customer_name: string
  customer_email: string
  customer_phone?: string
  ship_to_name?: string
  ship_to_company?: string
  ship_to_address1?: string
  ship_to_address2?: string
  ship_to_city: string
  ship_to_state: string
  ship_to_postcode: string
  ship_to_country: string
  order_date: string
  item_count: number
  total_weight_grams: number | null
  order_total: number
  status: string
  carrier: string | null
  service_code: string | null
  tracking_number: string | null
  products?: Array<{
    name: string
    sku?: string
    quantity: number
    price: number
  }>
}

interface CarrierService {
  code: string
  name: string
  type: 'domestic' | 'international'
  isDefault: boolean
}

interface CarrierConfig {
  code: string
  name: string
  services: CarrierService[]
}

interface AddressValidation {
  isValid: boolean
  isDeliverable: boolean
  errors?: string[]
  warnings?: string[]
}

interface OrderDetailsDrawerProps {
  order: ShippingOrder | null
  isOpen: boolean
  onClose: () => void
  onLabelCreated: () => void
}

export function OrderDetailsDrawer({ order, isOpen, onClose, onLabelCreated }: OrderDetailsDrawerProps) {
  // Form state - weight in kg for easier input
  const [weightKg, setWeightKg] = useState<number>(0)
  const [selectedPackage, setSelectedPackage] = useState<string>('satchel-1kg')
  const [customDimensions, setCustomDimensions] = useState({ length: 30, width: 20, height: 10 })
  const [selectedCarrier, setSelectedCarrier] = useState<string>('auspost')
  const [selectedService, setSelectedService] = useState<string>('')

  // API state
  const [carriers, setCarriers] = useState<CarrierConfig[]>([])
  const [loadingCarriers, setLoadingCarriers] = useState(false)
  const [creating, setCreating] = useState(false)
  const [validating, setValidating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [addressValidation, setAddressValidation] = useState<AddressValidation | null>(null)
  const [success, setSuccess] = useState<{
    trackingNumber: string
    labelUrl: string
    platformUpdated: boolean
  } | null>(null)

  // Printer state
  const [printerStatus, setPrinterStatus] = useState<{
    available: boolean
    printerName?: string
    error?: string
  } | null>(null)

  // Check printer status on mount
  useEffect(() => {
    checkPrinterStatus().then(setPrinterStatus)
  }, [])

  // Fetch carriers when order changes
  useEffect(() => {
    if (order?.business_code) {
      fetchCarriers(order.business_code)
    }
  }, [order?.business_code])

  // Auto-select default service when carrier changes
  useEffect(() => {
    if (carriers.length > 0 && selectedCarrier) {
      const carrier = carriers.find(c => c.code === selectedCarrier)
      if (carrier) {
        const isDomestic = order?.ship_to_country === 'AU' || !order?.ship_to_country
        const defaultService = carrier.services.find(s =>
          s.isDefault && (isDomestic ? s.type === 'domestic' : s.type === 'international')
        ) || carrier.services[0]

        if (defaultService) {
          setSelectedService(defaultService.code)
        }
      }
    }
  }, [carriers, selectedCarrier, order?.ship_to_country])

  // Reset state when order changes
  useEffect(() => {
    if (order) {
      // Convert grams to kg for display (round to 2 decimal places)
      const kgValue = order.total_weight_grams ? Math.round((order.total_weight_grams / 1000) * 100) / 100 : 0
      setWeightKg(kgValue)
      setError(null)
      setSuccess(null)
      setAddressValidation(null)

      // Suggest package based on existing weight
      if (order.total_weight_grams) {
        const suggested = suggestPackage(order.total_weight_grams)
        setSelectedPackage(suggested.id)
      }

      // Validate address when order loads
      validateAddress(order)
    }
  }, [order?.id])

  const fetchCarriers = async (businessCode: string) => {
    setLoadingCarriers(true)
    try {
      const res = await fetch(`/api/shipping/carriers?business=${businessCode}`)
      if (!res.ok) throw new Error('Failed to fetch carriers')
      const data = await res.json()
      setCarriers(data.carriers || [])

      // Auto-select first carrier
      if (data.carriers?.length > 0) {
        setSelectedCarrier(data.carriers[0].code)
      }
    } catch (err: any) {
      console.error('Failed to fetch carriers:', err)
    } finally {
      setLoadingCarriers(false)
    }
  }

  const validateAddress = async (orderToValidate: ShippingOrder) => {
    setValidating(true)
    try {
      const res = await fetch('/api/shipping/validate-address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address1: orderToValidate.ship_to_address1,
          address2: orderToValidate.ship_to_address2,
          city: orderToValidate.ship_to_city,
          state: orderToValidate.ship_to_state,
          postcode: orderToValidate.ship_to_postcode,
          country: orderToValidate.ship_to_country || 'AU'
        })
      })

      if (res.ok) {
        const data = await res.json()
        setAddressValidation(data)
      }
    } catch (err) {
      console.error('Address validation failed:', err)
    } finally {
      setValidating(false)
    }
  }

  const handleCreateLabel = async () => {
    if (!order) return

    // Validate weight (in kg)
    if (!weightKg || weightKg <= 0) {
      setError('Please enter a valid weight')
      return
    }

    // Convert kg to grams for API
    const weightGrams = Math.round(weightKg * 1000)

    // Check address validation
    if (addressValidation && !addressValidation.isValid) {
      setError('Please fix address errors before creating label')
      return
    }

    const pkg = PACKAGE_PRESETS.find(p => p.id === selectedPackage)
    const dimensions = pkg?.id === 'custom'
      ? customDimensions
      : { length: pkg?.length || 30, width: pkg?.width || 20, height: pkg?.height || 10 }

    if (!dimensions.length || !dimensions.width || !dimensions.height) {
      setError('Please enter valid dimensions')
      return
    }

    if (!selectedCarrier || !selectedService) {
      setError('Please select a carrier and service')
      return
    }

    setCreating(true)
    setError(null)

    try {
      const res = await fetch('/api/shipping/label', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          weightGrams,
          dimensions,
          carrier: selectedCarrier,
          serviceCode: selectedService,
          labelFormat: 'ZPL'
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create label')
      }

      // Try to print ZPL directly to Zebra
      if (data.zplData && printerStatus?.available) {
        const printResult = await printZPL(data.zplData)
        if (!printResult.success) {
          console.warn('Direct print failed, opening viewer:', printResult.error)
          // Fallback to ZPL viewer
          openZPLViewer(data.zplData)
        }
      } else if (data.zplData) {
        // No Zebra printer available, show ZPL viewer
        openZPLViewer(data.zplData)
      } else if (data.labelUrl) {
        // Fallback to PDF if no ZPL
        window.open(data.labelUrl, '_blank')
      }

      setSuccess({
        trackingNumber: data.trackingNumber,
        labelUrl: data.labelUrl,
        platformUpdated: data.platformUpdated
      })

      onLabelCreated()

    } catch (err: any) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(amount)
  }

  const isDomestic = order?.ship_to_country === 'AU' || !order?.ship_to_country
  const currentCarrier = carriers.find(c => c.code === selectedCarrier)
  const availableServices = currentCarrier?.services.filter(s =>
    isDomestic ? s.type === 'domestic' : s.type === 'international'
  ) || []

  if (!isOpen || !order) return null

  const isAlreadyShipped = order.status === 'shipped' || order.status === 'printed' || order.tracking_number

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/60 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-gray-900 border-l border-gray-700 z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Order {order.order_number}
            </h2>
            <p className="text-sm text-gray-400">
              {formatDate(order.order_date)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Printer Status */}
          {!isAlreadyShipped && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
              printerStatus?.available
                ? 'bg-green-500/10 text-green-300'
                : 'bg-amber-500/10 text-amber-300'
            }`}>
              <Printer className="w-4 h-4" />
              {printerStatus?.available
                ? `Zebra: ${printerStatus.printerName || 'Connected'}`
                : 'Zebra Browser Print not detected'
              }
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-green-300 font-medium">Label printed & order shipped!</p>
                  <p className="text-sm text-green-400 mt-1">
                    Tracking: <span className="font-mono">{success.trackingNumber}</span>
                  </p>
                  {success.platformUpdated && (
                    <p className="text-sm text-green-400 flex items-center gap-1 mt-1">
                      <Check className="w-3 h-3" />
                      {order.source === 'bigcommerce' ? 'BigCommerce' : 'Shopify'} updated
                    </p>
                  )}
                  <a
                    href={success.labelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-green-400 hover:text-green-300 mt-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open Label
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
              <p className="text-red-300">{error}</p>
            </div>
          )}

          {/* Customer Info */}
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <User className="w-4 h-4 text-gray-400" />
              <h3 className="text-sm font-medium text-gray-300">Customer</h3>
            </div>
            <div className="space-y-1 text-sm">
              <p className="text-white">{order.customer_name}</p>
              {order.customer_email && (
                <p className="text-gray-400">{order.customer_email}</p>
              )}
              {order.customer_phone && (
                <p className="text-gray-400">{order.customer_phone}</p>
              )}
            </div>
          </div>

          {/* Shipping Address with Validation */}
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4 text-gray-400" />
              <h3 className="text-sm font-medium text-gray-300">Ship To</h3>
              {!isDomestic && (
                <span className="px-2 py-0.5 text-xs bg-amber-500/20 text-amber-300 rounded">
                  International
                </span>
              )}
              {validating ? (
                <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
              ) : addressValidation?.isValid ? (
                <Check className="w-4 h-4 text-green-400" />
              ) : addressValidation ? (
                <AlertCircle className="w-4 h-4 text-red-400" />
              ) : null}
            </div>
            <div className="space-y-1 text-sm text-gray-300">
              <p className="font-medium">{order.ship_to_name || order.customer_name}</p>
              {order.ship_to_company && <p className="text-gray-400">{order.ship_to_company}</p>}
              {order.ship_to_address1 && <p>{order.ship_to_address1}</p>}
              {order.ship_to_address2 && <p>{order.ship_to_address2}</p>}
              <p>{order.ship_to_city}, {order.ship_to_state} {order.ship_to_postcode}</p>
              {order.ship_to_country && order.ship_to_country !== 'AU' && (
                <p className="text-amber-300">{order.ship_to_country}</p>
              )}
            </div>

            {/* Address validation errors */}
            {addressValidation?.errors && addressValidation.errors.length > 0 && (
              <div className="mt-3 p-2 bg-red-500/10 rounded text-sm">
                {addressValidation.errors.map((err, i) => (
                  <p key={i} className="text-red-300 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {err}
                  </p>
                ))}
              </div>
            )}

            {/* Address validation warnings */}
            {addressValidation?.warnings && addressValidation.warnings.length > 0 && !addressValidation.errors?.length && (
              <div className="mt-3 p-2 bg-amber-500/10 rounded text-sm">
                {addressValidation.warnings.map((warn, i) => (
                  <p key={i} className="text-amber-300 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> {warn}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-4 h-4 text-gray-400" />
              <h3 className="text-sm font-medium text-gray-300">Order Summary</h3>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">{order.item_count} item{order.item_count !== 1 ? 's' : ''}</span>
              <span className="text-white font-medium">{formatCurrency(order.order_total)}</span>
            </div>
          </div>

          {!isAlreadyShipped && (
            <>
              {/* Divider */}
              <div className="border-t border-gray-700 pt-4">
                <h3 className="text-sm font-medium text-white mb-4">Shipping Details</h3>
              </div>

              {/* Weight Input */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                  <Scale className="w-4 h-4" />
                  Weight (kg)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={weightKg || ''}
                  onChange={(e) => setWeightKg(parseFloat(e.target.value) || 0)}
                  placeholder="Enter weight in kg"
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {weightKg > 0 && `= ${Math.round(weightKg * 1000)}g`}
                </p>
              </div>

              {/* Package Select */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                  <Package className="w-4 h-4" />
                  Package Size
                </label>
                <select
                  value={selectedPackage}
                  onChange={(e) => setSelectedPackage(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <optgroup label="Satchels">
                    {PACKAGE_PRESETS.filter(p => p.category === 'satchel').map(pkg => (
                      <option key={pkg.id} value={pkg.id}>
                        {pkg.name} ({pkg.length}x{pkg.width}x{pkg.height}cm)
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Boxes">
                    {PACKAGE_PRESETS.filter(p => p.category === 'box').map(pkg => (
                      <option key={pkg.id} value={pkg.id}>
                        {pkg.name} ({pkg.length}x{pkg.width}x{pkg.height}cm)
                      </option>
                    ))}
                  </optgroup>
                  <option value="custom">Custom Dimensions</option>
                </select>

                {/* Custom dimensions input */}
                {selectedPackage === 'custom' && (
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <div>
                      <label className="text-xs text-gray-500">Length (cm)</label>
                      <input
                        type="number"
                        value={customDimensions.length}
                        onChange={(e) => setCustomDimensions(d => ({ ...d, length: parseInt(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Width (cm)</label>
                      <input
                        type="number"
                        value={customDimensions.width}
                        onChange={(e) => setCustomDimensions(d => ({ ...d, width: parseInt(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Height (cm)</label>
                      <input
                        type="number"
                        value={customDimensions.height}
                        onChange={(e) => setCustomDimensions(d => ({ ...d, height: parseInt(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Carrier Select */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                  <Truck className="w-4 h-4" />
                  Carrier
                </label>
                {loadingCarriers ? (
                  <div className="flex items-center gap-2 text-gray-400 py-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading carriers...
                  </div>
                ) : (
                  <select
                    value={selectedCarrier}
                    onChange={(e) => setSelectedCarrier(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    {carriers.map(carrier => (
                      <option key={carrier.code} value={carrier.code}>
                        {carrier.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Service Select */}
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">
                  Service
                </label>
                <select
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  disabled={availableServices.length === 0}
                >
                  {availableServices.length === 0 ? (
                    <option value="">No services available</option>
                  ) : (
                    availableServices.map(service => (
                      <option key={service.code} value={service.code}>
                        {service.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 bg-gray-900">
          {isAlreadyShipped ? (
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <span className="text-gray-400">Tracking:</span>
                <span className="text-white ml-2 font-mono">{order.tracking_number}</span>
              </div>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          ) : (
            <button
              onClick={handleCreateLabel}
              disabled={creating || !weightKg || !selectedService || (addressValidation?.errors && addressValidation.errors.length > 0)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
            >
              {creating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating & Printing...
                </>
              ) : (
                <>
                  <Printer className="w-5 h-5" />
                  Print Label & Ship
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </>
  )
}
