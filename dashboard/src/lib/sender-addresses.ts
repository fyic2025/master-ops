// Sender/Warehouse addresses for each business
// Used when creating shipping labels

export interface SenderAddress {
  name: string
  businessName?: string
  address1: string
  address2?: string
  city: string
  state: string
  postcode: string
  country: string
  phone: string
  email: string
}

// TODO: Update these with actual warehouse addresses
export const SENDER_ADDRESSES: Record<string, SenderAddress> = {
  teelixir: {
    name: 'Teelixir Shipping',
    businessName: 'Teelixir Pty Ltd',
    address1: '21 Ross Street',
    address2: '',
    city: 'Bayswater',
    state: 'VIC',
    postcode: '3153',
    country: 'AU',
    phone: '0411222333',
    email: 'shipping@teelixir.com.au'
  },
  boo: {
    name: 'Buy Organics Online',
    businessName: 'Buy Organics Online Pty Ltd',
    address1: '21 Ross Street',
    address2: '',
    city: 'Bayswater',
    state: 'VIC',
    postcode: '3153',
    country: 'AU',
    phone: '0411222333',
    email: 'shipping@buyorganicsonline.com.au'
  },
  elevate: {
    name: 'Elevate Wholesale',
    businessName: 'Elevate Wholesale Pty Ltd',
    address1: '21 Ross Street',
    address2: '',
    city: 'Bayswater',
    state: 'VIC',
    postcode: '3153',
    country: 'AU',
    phone: '0411222333',
    email: 'shipping@elevatewholesale.com.au'
  }
}

// Get sender address for a business
export function getSenderAddress(businessCode: string): SenderAddress | undefined {
  return SENDER_ADDRESSES[businessCode]
}
