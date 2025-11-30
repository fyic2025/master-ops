-- Unleashed-Shopify Sync Database Schema
-- Tables for bundle mappings and sync logging

-- ============================================
-- Bundle Mappings Table
-- ============================================
-- Maps Shopify bundle products to their Unleashed component SKUs
-- Used during order sync to expand bundles into individual line items

CREATE TABLE IF NOT EXISTS unleashed_shopify_bundle_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store TEXT NOT NULL CHECK (store IN ('teelixir', 'elevate')),

    -- Shopify bundle identifier
    shopify_product_id BIGINT,
    shopify_variant_id BIGINT,
    shopify_sku TEXT NOT NULL,
    bundle_name TEXT,

    -- Unleashed component
    unleashed_product_code TEXT NOT NULL,
    unleashed_product_guid UUID,
    component_quantity INTEGER NOT NULL DEFAULT 1,

    -- Metadata
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- One bundle SKU can map to multiple components
    UNIQUE (store, shopify_sku, unleashed_product_code)
);

-- Index for fast lookups during order sync
CREATE INDEX IF NOT EXISTS idx_bundle_mappings_store_sku
    ON unleashed_shopify_bundle_mappings(store, shopify_sku)
    WHERE is_active = true;

-- ============================================
-- Sync Log Table
-- ============================================
-- Tracks all sync operations for monitoring and debugging

CREATE TABLE IF NOT EXISTS unleashed_shopify_sync_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store TEXT NOT NULL CHECK (store IN ('teelixir', 'elevate')),
    sync_type TEXT NOT NULL CHECK (sync_type IN ('inventory', 'orders')),

    -- Status tracking
    status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed')),

    -- Metrics
    items_processed INTEGER NOT NULL DEFAULT 0,
    items_succeeded INTEGER NOT NULL DEFAULT 0,
    items_failed INTEGER NOT NULL DEFAULT 0,

    -- Error details
    error_message TEXT,
    details JSONB,

    -- Timing
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,

    -- Metadata
    triggered_by TEXT DEFAULT 'manual', -- manual, webhook, cron
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for recent sync lookups
CREATE INDEX IF NOT EXISTS idx_sync_log_store_type_time
    ON unleashed_shopify_sync_log(store, sync_type, started_at DESC);

-- ============================================
-- Synced Orders Table
-- ============================================
-- Tracks which Shopify orders have been synced to Unleashed
-- Prevents duplicate order creation

CREATE TABLE IF NOT EXISTS unleashed_shopify_synced_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store TEXT NOT NULL CHECK (store IN ('teelixir', 'elevate')),

    -- Shopify order reference
    shopify_order_id BIGINT NOT NULL,
    shopify_order_number INTEGER NOT NULL,
    shopify_order_name TEXT, -- e.g., "#1051"

    -- Unleashed order reference
    unleashed_order_guid UUID,
    unleashed_order_number TEXT,

    -- Status
    sync_status TEXT NOT NULL CHECK (sync_status IN ('pending', 'synced', 'failed', 'skipped')),
    error_message TEXT,

    -- Order details for quick reference
    customer_email TEXT,
    total_amount DECIMAL(10, 2),
    line_items_count INTEGER,
    bundles_expanded INTEGER DEFAULT 0,

    -- Timing
    shopify_created_at TIMESTAMPTZ,
    synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Prevent duplicate syncs
    UNIQUE (store, shopify_order_id)
);

-- Index for checking if order already synced
CREATE INDEX IF NOT EXISTS idx_synced_orders_lookup
    ON unleashed_shopify_synced_orders(store, shopify_order_id);

-- ============================================
-- SKU Mappings Table (Optional)
-- ============================================
-- For cases where Shopify SKU doesn't exactly match Unleashed ProductCode
-- Most cases should match directly, but this handles exceptions

CREATE TABLE IF NOT EXISTS unleashed_shopify_sku_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store TEXT NOT NULL CHECK (store IN ('teelixir', 'elevate')),

    shopify_sku TEXT NOT NULL,
    unleashed_product_code TEXT NOT NULL,

    -- Metadata
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (store, shopify_sku)
);

-- ============================================
-- Updated At Trigger
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_bundle_mappings_updated_at
    BEFORE UPDATE ON unleashed_shopify_bundle_mappings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_synced_orders_updated_at
    BEFORE UPDATE ON unleashed_shopify_synced_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sku_mappings_updated_at
    BEFORE UPDATE ON unleashed_shopify_sku_mappings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Row Level Security (RLS)
-- ============================================
-- Enable RLS on all tables
ALTER TABLE unleashed_shopify_bundle_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE unleashed_shopify_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE unleashed_shopify_synced_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE unleashed_shopify_sku_mappings ENABLE ROW LEVEL SECURITY;

-- Service role has full access (for sync scripts)
CREATE POLICY "Service role full access on bundle_mappings"
    ON unleashed_shopify_bundle_mappings FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on sync_log"
    ON unleashed_shopify_sync_log FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on synced_orders"
    ON unleashed_shopify_synced_orders FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on sku_mappings"
    ON unleashed_shopify_sku_mappings FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================
-- Comments
-- ============================================
COMMENT ON TABLE unleashed_shopify_bundle_mappings IS 'Maps Shopify bundle SKUs to Unleashed component products for order expansion';
COMMENT ON TABLE unleashed_shopify_sync_log IS 'Audit log of all sync operations for monitoring and debugging';
COMMENT ON TABLE unleashed_shopify_synced_orders IS 'Tracks which Shopify orders have been synced to Unleashed to prevent duplicates';
COMMENT ON TABLE unleashed_shopify_sku_mappings IS 'Override mappings for SKUs that do not match directly between Shopify and Unleashed';
