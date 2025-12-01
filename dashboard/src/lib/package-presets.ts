// Package dimension presets for shipping labels
// All dimensions in centimeters

export interface PackagePreset {
  id: string
  name: string
  length: number  // cm
  width: number   // cm
  height: number  // cm
  maxWeight?: number  // grams
  category: 'satchel' | 'box' | 'custom'
}

export const PACKAGE_PRESETS: PackagePreset[] = [
  // AusPost Satchels
  { id: 'satchel-500g', name: 'Small Satchel (500g)', length: 22, width: 33, height: 5, maxWeight: 500, category: 'satchel' },
  { id: 'satchel-1kg', name: 'Medium Satchel (1kg)', length: 25, width: 38, height: 8, maxWeight: 1000, category: 'satchel' },
  { id: 'satchel-3kg', name: 'Large Satchel (3kg)', length: 35, width: 45, height: 10, maxWeight: 3000, category: 'satchel' },
  { id: 'satchel-5kg', name: 'XL Satchel (5kg)', length: 40, width: 50, height: 12, maxWeight: 5000, category: 'satchel' },

  // Standard Boxes
  { id: 'box-small', name: 'Small Box', length: 20, width: 15, height: 10, category: 'box' },
  { id: 'box-medium', name: 'Medium Box', length: 30, width: 25, height: 15, category: 'box' },
  { id: 'box-large', name: 'Large Box', length: 40, width: 30, height: 20, category: 'box' },
  { id: 'box-xlarge', name: 'XL Box', length: 50, width: 40, height: 30, category: 'box' },

  // Custom
  { id: 'custom', name: 'Custom Dimensions', length: 0, width: 0, height: 0, category: 'custom' },
]

// Get preset by ID
export function getPackagePreset(id: string): PackagePreset | undefined {
  return PACKAGE_PRESETS.find(p => p.id === id)
}

// Get presets by category
export function getPresetsByCategory(category: PackagePreset['category']): PackagePreset[] {
  return PACKAGE_PRESETS.filter(p => p.category === category)
}

// Suggest package based on weight
export function suggestPackage(weightGrams: number): PackagePreset {
  const satchels = getPresetsByCategory('satchel')
  for (const satchel of satchels) {
    if (satchel.maxWeight && weightGrams <= satchel.maxWeight) {
      return satchel
    }
  }
  // Default to medium box for heavier items
  return PACKAGE_PRESETS.find(p => p.id === 'box-medium')!
}
