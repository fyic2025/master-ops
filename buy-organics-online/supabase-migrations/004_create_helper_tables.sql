-- Migration: Create helper tables for automation and auditing
-- Description: Automation logs, pricing rules, supplier priority changes
-- Run this in: Supabase SQL Editor

-- Table: automation_logs
CREATE TABLE IF NOT EXISTS automation_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_name VARCHAR(100) NOT NULL,
  workflow_type VARCHAR(50), -- 'supplier_sync', 'product_sync', 'pricing_update', 'linking'
  status VARCHAR(20) NOT NULL, -- 'success', 'error', 'warning', 'running'
  records_processed INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  error_details JSONB,
  execution_time_ms INTEGER,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_automation_workflow ON automation_logs(workflow_name);
CREATE INDEX IF NOT EXISTS idx_automation_status ON automation_logs(status);
CREATE INDEX IF NOT EXISTS idx_automation_started ON automation_logs(started_at DESC);

COMMENT ON TABLE automation_logs IS 'Logs all n8n workflow executions for monitoring and debugging';

-- Table: pricing_rules
CREATE TABLE IF NOT EXISTS pricing_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rule_name VARCHAR(100) NOT NULL,
  rule_type VARCHAR(50) NOT NULL, -- 'default_markup', 'carton_only', 'supplier_discount'
  priority INTEGER DEFAULT 999,
  is_active BOOLEAN DEFAULT TRUE,
  conditions JSONB, -- Rule conditions (e.g., {"cartononly": "Y"})
  formula TEXT, -- Pricing formula (e.g., "price = moq * rrp")
  supplier_discount_pct DECIMAL(5,2), -- Supplier-specific discount percentage
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pricing_rules_active ON pricing_rules(is_active, priority);

COMMENT ON TABLE pricing_rules IS 'Configurable pricing formulas for calculating product prices';

-- Insert default pricing rules
INSERT INTO pricing_rules (rule_name, rule_type, priority, formula, description) VALUES
('Carton Only', 'carton_only', 1, 'price = moq * rrp', 'For products that can only be ordered by carton'),
('Default Markup', 'default_markup', 2, 'price = cost * 1.4', 'Default 40% markup on cost price'),
('Oborne Discount', 'supplier_discount', 3, 'sale_price = rrp - (rrp * 0.07)', 'Oborne supplier discount: 7%'),
('Kadac Discount', 'supplier_discount', 4, 'sale_price = rrp - (rrp * 0.10)', 'Kadac supplier discount: 10%'),
('UHP Discount', 'supplier_discount', 5, 'sale_price = rrp - (rrp * 0.10)', 'UHP supplier discount: 10%')
ON CONFLICT DO NOTHING;

-- Table: supplier_priority_changes (audit log)
CREATE TABLE IF NOT EXISTS supplier_priority_changes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ecommerce_product_id UUID REFERENCES ecommerce_products(id) ON DELETE CASCADE,
  ecommerce_sku VARCHAR(255),
  previous_supplier VARCHAR(50),
  new_supplier VARCHAR(50),
  previous_priority INTEGER,
  new_priority INTEGER,
  changed_by VARCHAR(100), -- User email or 'system'
  change_reason TEXT,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_priority_changes_product ON supplier_priority_changes(ecommerce_product_id);
CREATE INDEX IF NOT EXISTS idx_priority_changes_date ON supplier_priority_changes(changed_at DESC);

COMMENT ON TABLE supplier_priority_changes IS 'Audit log of all supplier priority changes (manual or automatic)';

-- Table: sync_history (track last successful sync times)
CREATE TABLE IF NOT EXISTS sync_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sync_type VARCHAR(50) NOT NULL, -- 'bigcommerce', 'oborne', 'uhp', 'kadac'
  last_successful_sync TIMESTAMP WITH TIME ZONE,
  last_attempted_sync TIMESTAMP WITH TIME ZONE,
  records_synced INTEGER,
  status VARCHAR(20), -- 'success', 'failed'
  error_message TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sync_history_type ON sync_history(sync_type);

COMMENT ON TABLE sync_history IS 'Tracks last sync times and status for all integrations';

-- Insert initial sync history records
INSERT INTO sync_history (sync_type, status) VALUES
('bigcommerce', 'pending'),
('oborne', 'pending'),
('uhp', 'pending'),
('kadac', 'pending')
ON CONFLICT DO NOTHING;

-- Create view: Recent automation activity
CREATE OR REPLACE VIEW recent_automation_activity AS
SELECT
  workflow_name,
  workflow_type,
  status,
  records_processed,
  records_updated,
  execution_time_ms,
  started_at,
  completed_at
FROM automation_logs
ORDER BY started_at DESC
LIMIT 100;

COMMENT ON VIEW recent_automation_activity IS 'Recent workflow executions for monitoring dashboard';
