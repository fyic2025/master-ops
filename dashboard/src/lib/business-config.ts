import {
  Home,
  TrendingUp,
  Search,
  RefreshCw,
  DollarSign,
  Activity,
  Settings,
  ShoppingCart,
  Package,
  Truck,
  Users,
  Mail,
  Target,
  Clock,
  MessageSquare,
  Tag,
  AlertCircle,
  BarChart3,
  type LucideIcon
} from 'lucide-react'

export type BusinessCode = 'home' | 'boo' | 'teelixir' | 'elevate' | 'rhf' | 'brandco'

export interface NavItem {
  name: string
  href: string // Relative to business, e.g., '' for dashboard, '/orders' for orders
  icon: LucideIcon
}

export interface Business {
  code: BusinessCode
  name: string
  shortName: string
  platform?: string
  color: string // Tailwind class for the dot
  bgColor: string // Tailwind class for backgrounds
  navigation: NavItem[]
}

export const BUSINESSES: Record<BusinessCode, Business> = {
  home: {
    code: 'home',
    name: 'Home',
    shortName: 'Home',
    color: 'bg-gray-500',
    bgColor: 'bg-gray-500',
    navigation: [
      { name: 'Dashboard', href: '', icon: Home },
      { name: 'PPC', href: '/ppc', icon: TrendingUp },
      { name: 'SEO', href: '/seo', icon: Search },
      { name: 'Sync', href: '/sync', icon: RefreshCw },
      { name: 'Finance', href: '/finance', icon: DollarSign },
      { name: 'Health', href: '/health', icon: Activity },
      { name: 'Settings', href: '/settings', icon: Settings },
    ]
  },
  boo: {
    code: 'boo',
    name: 'Buy Organics Online',
    shortName: 'BOO',
    platform: 'BigCommerce',
    color: 'bg-brand-boo',
    bgColor: 'bg-brand-boo',
    navigation: [
      { name: 'Dashboard', href: '', icon: Home },
      { name: 'SEO', href: '/seo', icon: Search },
      { name: 'Merchant Center', href: '/merchant', icon: ShoppingCart },
      { name: 'Stock Sync', href: '/stock', icon: Package },
      { name: 'Product Health', href: '/products', icon: AlertCircle },
      { name: 'LiveChat', href: '/livechat', icon: MessageSquare },
      { name: 'Brands', href: '/brands', icon: Tag },
    ]
  },
  rhf: {
    code: 'rhf',
    name: 'Red Hill Fresh',
    shortName: 'RHF',
    platform: 'WooCommerce',
    color: 'bg-brand-rhf',
    bgColor: 'bg-brand-rhf',
    navigation: [
      { name: 'Dashboard', href: '', icon: Home },
      { name: 'Orders', href: '/orders', icon: ShoppingCart },
      { name: 'Delivery Zones', href: '/delivery', icon: Truck },
      { name: 'Inventory', href: '/inventory', icon: Package },
    ]
  },
  teelixir: {
    code: 'teelixir',
    name: 'Teelixir',
    shortName: 'Teelixir',
    platform: 'Shopify',
    color: 'bg-brand-teelixir',
    bgColor: 'bg-brand-teelixir',
    navigation: [
      { name: 'Dashboard', href: '', icon: Home },
      { name: 'Distributors', href: '/distributors', icon: Truck },
      { name: 'Dist. Trends', href: '/distributors/trends', icon: TrendingUp },
      { name: 'Re-engagement', href: '/reengagement', icon: Users },
      { name: 'Orders', href: '/orders', icon: ShoppingCart },
      { name: 'Products', href: '/products', icon: Package },
      { name: 'Ads Performance', href: '/ads', icon: BarChart3 },
    ]
  },
  elevate: {
    code: 'elevate',
    name: 'Elevate Wholesale',
    shortName: 'Elevate',
    platform: 'Shopify B2B',
    color: 'bg-brand-elevate',
    bgColor: 'bg-brand-elevate',
    navigation: [
      { name: 'Dashboard', href: '', icon: Home },
      { name: 'Prospecting', href: '/prospecting', icon: Target },
      { name: 'Customers', href: '/customers', icon: Users },
      { name: 'Trials', href: '/trials', icon: Clock },
      { name: 'HubSpot Sync', href: '/hubspot', icon: RefreshCw },
    ]
  },
  brandco: {
    code: 'brandco',
    name: 'Brand Connections',
    shortName: 'BrandCo',
    platform: 'Next.js',
    color: 'bg-amber-500',
    bgColor: 'bg-amber-500',
    navigation: [
      { name: 'Dashboard', href: '', icon: Home },
      { name: 'Brands', href: '/brands', icon: Tag },
      { name: 'Retailers', href: '/retailers', icon: ShoppingCart },
      { name: 'Outreach', href: '/outreach', icon: Mail },
    ]
  }
}

// Order businesses appear in the header
export const BUSINESS_ORDER: BusinessCode[] = ['home', 'boo', 'rhf', 'teelixir', 'elevate', 'brandco']

// Helper to check if a string is a valid business code
export function isValidBusinessCode(code: string): code is BusinessCode {
  return code in BUSINESSES
}

// Helper to get business by code with fallback
export function getBusiness(code: string): Business {
  return BUSINESSES[code as BusinessCode] || BUSINESSES.home
}
