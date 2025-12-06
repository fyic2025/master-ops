/**
 * Standardized Product Enrichment Schema
 *
 * Unified structure for supplier data that feeds into:
 * - BigCommerce product updates
 * - SEO content generation
 * - Product page enhancements
 */

// Standardized enrichment fields we want to capture
const ENRICHMENT_SCHEMA = {
    // === DIETARY FLAGS ===
    dietary: {
        is_vegan: { type: 'boolean', sources: ['uhp.vegan', 'manual'] },
        is_vegetarian: { type: 'boolean', sources: ['uhp.vegetarian', 'manual'] },
        is_gluten_free: { type: 'boolean', sources: ['uhp.gluten_free', 'manual'] },
        is_dairy_free: { type: 'boolean', sources: ['uhp.dairy_free', 'manual'] },
        is_organic: { type: 'boolean', sources: ['uhp.organic', 'manual'] },
        is_certified_organic: { type: 'boolean', sources: ['uhp.certified_organic', 'manual'] },
        is_raw: { type: 'boolean', sources: ['manual'] },
        is_keto: { type: 'boolean', sources: ['manual'] },
        is_paleo: { type: 'boolean', sources: ['manual'] },
        is_sugar_free: { type: 'boolean', sources: ['manual'] },
        is_nut_free: { type: 'boolean', sources: ['manual'] },
        is_soy_free: { type: 'boolean', sources: ['manual'] }
    },

    // === CONTENT ===
    content: {
        ingredients: { type: 'text', sources: ['uhp.ingredients', 'manual'] },
        short_description: { type: 'text', sources: ['manual', 'ai_generated'] },
        usage_instructions: { type: 'text', sources: ['manual', 'ai_generated'] },
        warnings: { type: 'text', sources: ['manual'] },
        storage_instructions: { type: 'text', sources: ['manual'] }
    },

    // === IMAGES ===
    images: {
        primary_image: { type: 'url', sources: ['uhp.image1', 'kadac.image_url'] },
        secondary_images: { type: 'url[]', sources: ['uhp.image2', 'uhp.image3'] },
        nutrition_panel: { type: 'url', sources: ['uhp.image2', 'manual'] }
    },

    // === CLASSIFICATION ===
    classification: {
        supplier_category: { type: 'string', sources: ['uhp.category', 'kadac.category'] },
        suggested_bc_categories: { type: 'number[]', sources: ['ai_classified'] },
        product_type: { type: 'string', sources: ['ai_classified'] } // supplement, food, personal_care, etc.
    },

    // === DIMENSIONS ===
    dimensions: {
        weight_kg: { type: 'number', sources: ['uhp.weight', 'kadac.weight'] },
        width_mm: { type: 'number', sources: ['uhp.width'] },
        height_mm: { type: 'number', sources: ['uhp.height'] },
        length_mm: { type: 'number', sources: ['uhp.length'] }
    },

    // === SUPPLIER INFO ===
    supplier: {
        supplier_name: { type: 'string', required: true },
        supplier_sku: { type: 'string', required: true },
        cost_price: { type: 'number', sources: ['all'] },
        rrp: { type: 'number', sources: ['all'] },
        stock_level: { type: 'number', sources: ['all'] },
        moq: { type: 'number', sources: ['uhp.moq', 'kadac.per_carton'] },
        is_active: { type: 'boolean', sources: ['uhp.is_active', 'oborne.obsolete'] },
        on_deal: { type: 'boolean', sources: ['uhp.on_deal'] },
        is_clearance: { type: 'boolean', sources: ['uhp.clearance'] }
    },

    // === META ===
    meta: {
        enrichment_source: { type: 'string' }, // which supplier provided most data
        enrichment_score: { type: 'number' }, // 0-100 completeness
        last_enriched_at: { type: 'datetime' },
        enrichment_version: { type: 'number' }
    }
};

/**
 * Map UHP raw data to standardized schema
 */
function mapUHPToStandard(uhpProduct) {
    const meta = uhpProduct.metadata || {};
    const raw = meta.raw_data || {};

    return {
        dietary: {
            is_vegan: meta.vegan === 'Y' || raw.Vegan === 'Y',
            is_vegetarian: meta.vegetarian === 'Y' || raw.Vegetarian === 'Y',
            is_gluten_free: meta.gluten_free === 'Y' || raw.GlutenFree === 'Y',
            is_dairy_free: meta.dairy_free === 'Y' || raw.DairyFree === 'Y',
            is_organic: meta.organic === 'Y' || raw.Organic === 'Y',
            is_certified_organic: meta.certified_organic === 'Y' || raw.CertifiedOrganic === 'Y',
            is_raw: false,
            is_keto: false,
            is_paleo: false,
            is_sugar_free: false,
            is_nut_free: false,
            is_soy_free: false
        },
        content: {
            ingredients: meta.ingredients || raw.Ingredients || null,
            short_description: null,
            usage_instructions: null,
            warnings: null,
            storage_instructions: null
        },
        images: {
            primary_image: meta.image1 || raw.Image1 || null,
            secondary_images: [
                meta.image2 || raw.Image2,
                raw.Image3
            ].filter(Boolean),
            nutrition_panel: meta.image2 || raw.Image2 || null
        },
        classification: {
            supplier_category: uhpProduct.category || raw.Categories || null,
            suggested_bc_categories: [],
            product_type: null
        },
        dimensions: {
            weight_kg: parseFloat(raw['U.Weight (kg)']) || null,
            width_mm: parseFloat(raw['U.Width (mm)']) || null,
            height_mm: parseFloat(raw['U.Height (mm)']) || null,
            length_mm: parseFloat(raw['U.Length (mm)']) || null
        },
        supplier: {
            supplier_name: 'uhp',
            supplier_sku: uhpProduct.supplier_sku,
            cost_price: uhpProduct.cost_price,
            rrp: uhpProduct.rrp,
            stock_level: uhpProduct.stock_level,
            moq: uhpProduct.moq,
            is_active: meta.is_active === 'Y' || raw.IsActive === 'Y',
            on_deal: meta.on_deal === 'Y' || raw.OnDeal === 'Y',
            is_clearance: meta.clearance === 'Y' || raw.Clearance === 'Y'
        },
        meta: {
            enrichment_source: 'uhp',
            enrichment_score: calculateEnrichmentScore('uhp', uhpProduct),
            last_enriched_at: new Date().toISOString(),
            enrichment_version: 1
        }
    };
}

/**
 * Map Kadac raw data to standardized schema
 */
function mapKadacToStandard(kadacProduct) {
    const meta = kadacProduct.metadata || {};
    const raw = meta.raw_data || {};

    return {
        dietary: {
            is_vegan: false,
            is_vegetarian: false,
            is_gluten_free: false,
            is_dairy_free: false,
            is_organic: false, // Could detect from product name
            is_certified_organic: false,
            is_raw: false,
            is_keto: false,
            is_paleo: false,
            is_sugar_free: false,
            is_nut_free: false,
            is_soy_free: false
        },
        content: {
            ingredients: null,
            short_description: null,
            usage_instructions: null,
            warnings: null,
            storage_instructions: null
        },
        images: {
            primary_image: meta.image_url || raw.imageurl || null,
            secondary_images: [],
            nutrition_panel: null
        },
        classification: {
            supplier_category: kadacProduct.category || null,
            suggested_bc_categories: [],
            product_type: null
        },
        dimensions: {
            weight_kg: null,
            width_mm: null,
            height_mm: null,
            length_mm: null
        },
        supplier: {
            supplier_name: 'kadac',
            supplier_sku: kadacProduct.supplier_sku,
            cost_price: kadacProduct.cost_price,
            rrp: kadacProduct.rrp,
            stock_level: kadacProduct.stock_level,
            moq: meta.per_carton || null,
            is_active: meta.stock_status_raw === 'available',
            on_deal: false,
            is_clearance: false
        },
        meta: {
            enrichment_source: 'kadac',
            enrichment_score: calculateEnrichmentScore('kadac', kadacProduct),
            last_enriched_at: new Date().toISOString(),
            enrichment_version: 1
        }
    };
}

/**
 * Map Oborne raw data to standardized schema
 */
function mapOborneToStandard(oborneProduct) {
    const meta = oborneProduct.metadata || {};

    return {
        dietary: {
            is_vegan: false,
            is_vegetarian: false,
            is_gluten_free: false,
            is_dairy_free: false,
            is_organic: false,
            is_certified_organic: false,
            is_raw: false,
            is_keto: false,
            is_paleo: false,
            is_sugar_free: false,
            is_nut_free: false,
            is_soy_free: false
        },
        content: {
            ingredients: null,
            short_description: null,
            usage_instructions: null,
            warnings: null,
            storage_instructions: null
        },
        images: {
            primary_image: null,
            secondary_images: [],
            nutrition_panel: null
        },
        classification: {
            supplier_category: null,
            suggested_bc_categories: [],
            product_type: null
        },
        dimensions: {
            weight_kg: parseFloat(meta.weight) || null,
            width_mm: null,
            height_mm: null,
            length_mm: null
        },
        supplier: {
            supplier_name: 'oborne',
            supplier_sku: oborneProduct.supplier_sku,
            cost_price: oborneProduct.cost_price,
            rrp: oborneProduct.rrp,
            stock_level: oborneProduct.stock_level,
            moq: null,
            is_active: meta.obsolete !== 'S',
            on_deal: false,
            is_clearance: false
        },
        meta: {
            enrichment_source: 'oborne',
            enrichment_score: calculateEnrichmentScore('oborne', oborneProduct),
            last_enriched_at: new Date().toISOString(),
            enrichment_version: 1
        }
    };
}

/**
 * Calculate enrichment score (0-100)
 */
function calculateEnrichmentScore(source, product) {
    let score = 0;
    const meta = product.metadata || {};

    // Base scores by source capability
    if (source === 'uhp') {
        score += 20; // Has rich data potential

        // Dietary flags (+30 max)
        if (meta.vegan) score += 5;
        if (meta.gluten_free) score += 5;
        if (meta.dairy_free) score += 5;
        if (meta.vegetarian) score += 5;
        if (meta.organic || meta.certified_organic) score += 10;

        // Content (+30 max)
        if (meta.ingredients) score += 20;
        if (meta.image1) score += 5;
        if (meta.image2) score += 5;

        // Classification (+20 max)
        if (product.category) score += 20;

    } else if (source === 'kadac') {
        score += 10; // Has some data

        // Images (+20)
        if (meta.image_url) score += 20;

        // Stock info (+10)
        if (meta.stock_status_raw) score += 10;

    } else if (source === 'oborne') {
        score += 5; // Minimal data

        // Basic info only
        if (product.barcode) score += 5;
        if (product.brand) score += 5;
    }

    return Math.min(100, score);
}

/**
 * Map any supplier product to standard format
 */
function mapToStandard(product) {
    const supplier = (product.supplier_name || '').toLowerCase();

    if (supplier === 'uhp') {
        return mapUHPToStandard(product);
    } else if (supplier === 'kadac') {
        return mapKadacToStandard(product);
    } else if (supplier === 'oborne') {
        return mapOborneToStandard(product);
    }

    // Generic fallback
    return {
        dietary: {},
        content: {},
        images: { primary_image: null, secondary_images: [] },
        classification: {},
        dimensions: {},
        supplier: {
            supplier_name: supplier,
            supplier_sku: product.supplier_sku,
            cost_price: product.cost_price,
            rrp: product.rrp
        },
        meta: {
            enrichment_source: supplier,
            enrichment_score: 0,
            last_enriched_at: new Date().toISOString()
        }
    };
}

/**
 * Generate dietary badges HTML for product page
 */
function generateDietaryBadges(enrichedData) {
    const badges = [];
    const d = enrichedData.dietary || {};

    if (d.is_vegan) badges.push({ label: 'Vegan', icon: '🌱', class: 'badge-vegan' });
    if (d.is_vegetarian && !d.is_vegan) badges.push({ label: 'Vegetarian', icon: '🥬', class: 'badge-vegetarian' });
    if (d.is_gluten_free) badges.push({ label: 'Gluten Free', icon: '🌾', class: 'badge-gf' });
    if (d.is_dairy_free) badges.push({ label: 'Dairy Free', icon: '🥛', class: 'badge-df' });
    if (d.is_certified_organic) badges.push({ label: 'Certified Organic', icon: '✓', class: 'badge-organic' });
    else if (d.is_organic) badges.push({ label: 'Organic', icon: '🌿', class: 'badge-organic' });
    if (d.is_raw) badges.push({ label: 'Raw', icon: '🥗', class: 'badge-raw' });
    if (d.is_keto) badges.push({ label: 'Keto', icon: '🥑', class: 'badge-keto' });
    if (d.is_paleo) badges.push({ label: 'Paleo', icon: '🍖', class: 'badge-paleo' });

    return badges;
}

/**
 * Generate schema.org JSON-LD for product
 */
function generateSchemaOrg(product, enrichedData) {
    const schema = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        sku: product.sku,
        brand: {
            '@type': 'Brand',
            name: product.brand
        }
    };

    // Add dietary info as additionalProperty
    const dietary = enrichedData.dietary || {};
    const properties = [];

    if (dietary.is_vegan) properties.push({ '@type': 'PropertyValue', name: 'Vegan', value: 'Yes' });
    if (dietary.is_gluten_free) properties.push({ '@type': 'PropertyValue', name: 'Gluten-Free', value: 'Yes' });
    if (dietary.is_dairy_free) properties.push({ '@type': 'PropertyValue', name: 'Dairy-Free', value: 'Yes' });
    if (dietary.is_organic) properties.push({ '@type': 'PropertyValue', name: 'Organic', value: 'Yes' });

    if (properties.length > 0) {
        schema.additionalProperty = properties;
    }

    // Add ingredients if available
    if (enrichedData.content?.ingredients) {
        schema.description = enrichedData.content.ingredients;
    }

    return schema;
}

module.exports = {
    ENRICHMENT_SCHEMA,
    mapToStandard,
    mapUHPToStandard,
    mapKadacToStandard,
    mapOborneToStandard,
    calculateEnrichmentScore,
    generateDietaryBadges,
    generateSchemaOrg
};
