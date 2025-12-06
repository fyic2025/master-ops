'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Link2,
  RefreshCw,
  Search,
  Filter,
  Building2,
  Package,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Calculator,
  Box,
  Scale,
  DollarSign,
  X
} from 'lucide-react'

interface SupplierProduct {
  id: string
  supplier_id: string
  supplier_code: string
  name: string
  unit: string
  unit_size: string
  cost_price: number
  category: string
  is_available: boolean
  quality_days: number
  last_seen_at: string
  weight_kg: number | null
  is_mapped: boolean
  supplier_name: string
}

interface ProductData {
  products: SupplierProduct[]
  suppliers: { id: string; name: string; code: string }[]
  categories: string[]
  summary: {
    total: number
    mapped: number
    unmapped: number
    by_supplier: { id: string; name: string; code: string; count: number; unmapped: number }[]
  }
}

async function fetchProducts(params: {
  supplier_id: string
  category: string
  search: string
  unmatched: boolean
}): Promise<ProductData> {
  const searchParams = new URLSearchParams()
  if (params.supplier_id !== 'all') searchParams.set('supplier_id', params.supplier_id)
  if (params.category !== 'all') searchParams.set('category', params.category)
  if (params.search) searchParams.set('search', params.search)
  if (params.unmatched) searchParams.set('unmatched', 'true')

  const res = await fetch(`/api/rhf/products?${searchParams}`)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

function MappingModal({
  product,
  onClose,
  onSave
}: {
  product: SupplierProduct
  onClose: () => void
  onSave: (data: any) => void
}) {
  const [supplierUnitType, setSupplierUnitType] = useState('box')
  const [supplierUnitKg, setSupplierUnitKg] = useState<string>('')
  const [sellUnit, setSellUnit] = useState('kg')
  const [notes, setNotes] = useState('')

  // Calculate cost per kg
  const costPerKg = useMemo(() => {
    const kg = parseFloat(supplierUnitKg)
    if (!kg || kg <= 0) return null
    return product.cost_price / kg
  }, [product.cost_price, supplierUnitKg])

  const handleSave = () => {
    onSave({
      supplier_product_id: product.id,
      woo_product_id: null, // Will be linked later via WooCommerce sync
      supplier_unit_type: supplierUnitType,
      supplier_unit_kg: supplierUnitKg ? parseFloat(supplierUnitKg) : null,
      sell_unit: sellUnit,
      is_primary: true,
      notes
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-lg mx-4">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Set Unit Conversion</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Product Info */}
          <div className="bg-gray-800/50 rounded-lg p-3">
            <p className="text-white font-medium">{product.name}</p>
            <p className="text-sm text-gray-400 mt-1">
              {product.supplier_name} • ${product.cost_price.toFixed(2)} per {product.unit || 'unit'}
            </p>
          </div>

          {/* Supplier Unit Type */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Supplier sells in</label>
            <select
              value={supplierUnitType}
              onChange={(e) => setSupplierUnitType(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
            >
              <option value="box">Box</option>
              <option value="tray">Tray</option>
              <option value="bag">Bag</option>
              <option value="kg">KG</option>
              <option value="each">Each</option>
              <option value="bunch">Bunch</option>
              <option value="punnet">Punnet</option>
              <option value="pack">Pack</option>
            </select>
          </div>

          {/* Weight per unit (for boxes/trays) */}
          {['box', 'tray', 'bag', 'pack'].includes(supplierUnitType) && (
            <div>
              <label className="block text-sm text-gray-400 mb-1">Weight per {supplierUnitType} (kg)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  value={supplierUnitKg}
                  onChange={(e) => setSupplierUnitKg(e.target.value)}
                  placeholder="e.g., 11"
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                />
                <span className="text-gray-400">kg</span>
              </div>
              {costPerKg !== null && (
                <p className="text-sm text-green-400 mt-2">
                  = ${costPerKg.toFixed(2)}/kg
                </p>
              )}
            </div>
          )}

          {/* Sell Unit */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">RHF sells by</label>
            <select
              value={sellUnit}
              onChange={(e) => setSellUnit(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
            >
              <option value="kg">KG</option>
              <option value="each">Each</option>
              <option value="bunch">Bunch</option>
              <option value="punnet">Punnet</option>
              <option value="pack">Pack</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Notes (optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special handling notes..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
            />
          </div>

          {/* Cost Summary */}
          {costPerKg !== null && sellUnit === 'kg' && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
              <div className="flex items-center gap-2 text-green-400">
                <Calculator className="w-4 h-4" />
                <span className="font-medium">Cost Calculation</span>
              </div>
              <p className="text-sm text-gray-300 mt-1">
                ${product.cost_price.toFixed(2)} ÷ {supplierUnitKg}kg = <span className="text-green-400 font-medium">${costPerKg.toFixed(2)}/kg</span>
              </p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-800 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Save Conversion
          </button>
        </div>
      </div>
    </div>
  )
}

function SupplierCard({
  name,
  code,
  count,
  unmapped,
  isSelected,
  onClick
}: {
  name: string
  code: string
  count: number
  unmapped: number
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-lg border transition-all text-left ${
        isSelected
          ? 'bg-blue-500/20 border-blue-500'
          : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Building2 className="w-4 h-4 text-gray-400" />
        <span className="font-medium text-white text-sm">{name}</span>
        <span className="text-xs text-gray-500 uppercase">{code}</span>
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-gray-400">{count} products</span>
        {unmapped > 0 && (
          <span className="text-yellow-400">{unmapped} unset</span>
        )}
      </div>
    </button>
  )
}

export default function ProductMatcherPage() {
  const queryClient = useQueryClient()
  const [selectedSupplier, setSelectedSupplier] = useState('all')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showUnmatchedOnly, setShowUnmatchedOnly] = useState(true)
  const [sortColumn, setSortColumn] = useState<string>('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [selectedProduct, setSelectedProduct] = useState<SupplierProduct | null>(null)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['rhf-products', selectedSupplier, selectedCategory, searchQuery, showUnmatchedOnly],
    queryFn: () => fetchProducts({
      supplier_id: selectedSupplier,
      category: selectedCategory,
      search: searchQuery,
      unmatched: showUnmatchedOnly
    })
  })

  const saveMutation = useMutation({
    mutationFn: async (mappingData: any) => {
      const res = await fetch('/api/rhf/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mappingData)
      })
      if (!res.ok) throw new Error('Failed to save')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rhf-products'] })
      setSelectedProduct(null)
    }
  })

  const sortedProducts = useMemo(() => {
    if (!data?.products) return []
    return [...data.products].sort((a, b) => {
      const aVal = a[sortColumn as keyof SupplierProduct]
      const bVal = b[sortColumn as keyof SupplierProduct]
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
      }
      return sortDirection === 'asc'
        ? String(aVal || '').localeCompare(String(bVal || ''))
        : String(bVal || '').localeCompare(String(aVal || ''))
    })
  }, [data?.products, sortColumn, sortDirection])

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const SortHeader = ({ column, label }: { column: string; label: string }) => (
    <button
      onClick={() => handleSort(column)}
      className="flex items-center gap-1 hover:text-white transition-colors"
    >
      {label}
      {sortColumn === column && (
        sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
      )}
    </button>
  )

  if (error) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <p className="text-red-400">Failed to load products</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Link2 className="w-7 h-7" />
            Product Matcher
          </h1>
          <p className="text-gray-400 mt-1">
            Set unit conversions for supplier products (box → kg)
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Unmatched filter */}
          <button
            onClick={() => setShowUnmatchedOnly(!showUnmatchedOnly)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
              showUnmatchedOnly
                ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400'
                : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-600'
            }`}
          >
            <Filter className="w-4 h-4" />
            Unset Only
          </button>
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Supplier filter cards */}
      {data?.summary?.by_supplier && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <button
            onClick={() => setSelectedSupplier('all')}
            className={`p-4 rounded-lg border transition-all text-left ${
              selectedSupplier === 'all'
                ? 'bg-blue-500/20 border-blue-500'
                : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-4 h-4 text-gray-400" />
              <span className="font-medium text-white text-sm">All Suppliers</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">{data.summary.total} products</span>
              {data.summary.unmapped > 0 && (
                <span className="text-yellow-400">{data.summary.unmapped} unset</span>
              )}
            </div>
          </button>
          {data.summary.by_supplier.map(s => (
            <SupplierCard
              key={s.id}
              name={s.name}
              code={s.code}
              count={s.count}
              unmapped={s.unmapped}
              isSelected={selectedSupplier === s.id}
              onClick={() => setSelectedSupplier(s.id)}
            />
          ))}
        </div>
      )}

      {/* Search and Category filter */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products..."
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white min-w-[150px]"
        >
          <option value="all">All Categories</option>
          {data?.categories?.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Summary stats */}
      {data?.summary && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Total Products</p>
            <p className="text-2xl font-bold text-white">{sortedProducts.length}</p>
          </div>
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
            <p className="text-green-400 text-sm">Conversion Set</p>
            <p className="text-2xl font-bold text-green-400">
              {sortedProducts.filter(p => p.is_mapped).length}
            </p>
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <p className="text-yellow-400 text-sm">Needs Conversion</p>
            <p className="text-2xl font-bold text-yellow-400">
              {sortedProducts.filter(p => !p.is_mapped).length}
            </p>
          </div>
        </div>
      )}

      {/* Products table */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800/50 text-gray-400 text-sm">
              <tr>
                <th className="text-left p-4 font-medium">
                  <SortHeader column="name" label="Product" />
                </th>
                <th className="text-left p-4 font-medium">
                  <SortHeader column="supplier_name" label="Supplier" />
                </th>
                <th className="text-left p-4 font-medium">
                  <SortHeader column="category" label="Category" />
                </th>
                <th className="text-right p-4 font-medium">
                  <SortHeader column="cost_price" label="Cost" />
                </th>
                <th className="text-center p-4 font-medium">Unit</th>
                <th className="text-center p-4 font-medium">Status</th>
                <th className="text-center p-4 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading...
                  </td>
                </tr>
              ) : sortedProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">
                    {showUnmatchedOnly ? 'All products have conversions set!' : 'No products found'}
                  </td>
                </tr>
              ) : (
                sortedProducts.map(product => (
                  <tr
                    key={product.id}
                    className={`hover:bg-gray-800/30 ${product.is_mapped ? 'opacity-60' : ''}`}
                  >
                    <td className="p-4">
                      <p className="text-white text-sm font-medium">{product.name}</p>
                      {product.unit_size && (
                        <p className="text-xs text-gray-500">{product.unit_size}</p>
                      )}
                    </td>
                    <td className="p-4">
                      <span className="text-gray-300 text-sm">{product.supplier_name}</span>
                    </td>
                    <td className="p-4">
                      <span className="text-gray-400 text-sm capitalize">{product.category || '-'}</span>
                    </td>
                    <td className="p-4 text-right">
                      <span className="text-white font-medium">${product.cost_price.toFixed(2)}</span>
                    </td>
                    <td className="p-4 text-center">
                      <span className="text-gray-400 text-sm">{product.unit || 'each'}</span>
                    </td>
                    <td className="p-4 text-center">
                      {product.is_mapped ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-green-500/20 text-green-400">
                          <CheckCircle className="w-3 h-3" />
                          Set
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-yellow-500/20 text-yellow-400">
                          <AlertCircle className="w-3 h-3" />
                          Unset
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => setSelectedProduct(product)}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      >
                        {product.is_mapped ? 'Edit' : 'Set'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mapping Modal */}
      {selectedProduct && (
        <MappingModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onSave={(data) => saveMutation.mutate(data)}
        />
      )}

      {/* Legend */}
      <div className="text-xs text-gray-500 flex items-center gap-4">
        <span className="flex items-center gap-1">
          <Box className="w-3 h-3" />
          Supplier unit (box, tray, etc.)
        </span>
        <span className="flex items-center gap-1">
          <Scale className="w-3 h-3" />
          Weight in kg per unit
        </span>
        <span className="flex items-center gap-1">
          <DollarSign className="w-3 h-3" />
          Cost per kg = Box price ÷ kg per box
        </span>
      </div>
    </div>
  )
}
