# Klaviyo Replacement Plan for Buy Organics Online

**Version:** 1.0
**Date:** December 1, 2025
**Status:** Planning Complete - Ready for Implementation
**Business:** Buy Organics Online (BigCommerce)

---

## Executive Summary

This document outlines a comprehensive plan to replace Klaviyo for Buy Organics Online (BOO) with a self-hosted, cost-effective email marketing solution. The recommended approach leverages existing infrastructure (Supabase, Gmail OAuth2, n8n) combined with Listmonk as the open-source email marketing platform.

**Key Benefits:**
- Eliminates recurring Klaviyo subscription fees (~$150-500+/month depending on list size)
- Full data ownership and privacy compliance
- Integration with existing master-ops infrastructure
- Scalable to handle BOO's customer base (10,000+ customers)

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [Requirements Analysis](#2-requirements-analysis)
3. [Solution Options Comparison](#3-solution-options-comparison)
4. [Recommended Architecture](#4-recommended-architecture)
5. [Database Schema](#5-database-schema)
6. [Integration Points](#6-integration-points)
7. [Implementation Phases](#7-implementation-phases)
8. [Migration Strategy](#8-migration-strategy)
9. [Email Automation Flows](#9-email-automation-flows)
10. [Monitoring & Analytics](#10-monitoring--analytics)
11. [Risk Assessment](#11-risk-assessment)
12. [Cost Analysis](#12-cost-analysis)
13. [Success Criteria](#13-success-criteria)

---

## 1. Current State Analysis

### 1.1 Current Klaviyo Usage for BOO

| Feature | Status | Notes |
|---------|--------|-------|
| API Key in Vault | ✅ Yes | `boo/klaviyo_api_key` stored in vault |
| Active Integration Code | ⚠️ Minimal | No direct sync scripts like Teelixir |
| Newsletter Signups | ❓ Unknown | Likely forms on BigCommerce store |
| Abandoned Cart Emails | ❓ Unknown | May be configured in Klaviyo dashboard |
| Welcome Series | ❓ Unknown | May be configured in Klaviyo dashboard |
| Order Confirmations | ❓ Unknown | BigCommerce native or Klaviyo |
| Product Review Requests | ❓ Unknown | May be configured in Klaviyo dashboard |
| Segmentation | ❓ Unknown | Customer segments in Klaviyo |

### 1.2 Existing BOO Email Infrastructure

| Component | Status | Details |
|-----------|--------|---------|
| Gmail OAuth2 | ✅ Ready | `sales@buyorganicsonline.com.au` configured |
| Resend API | ✅ Ready | Fallback provider configured |
| SendGrid API | ✅ Ready | Fallback provider configured |
| n8n Webhooks | ✅ Ready | Checkout error alerts working |
| Supabase Database | ✅ Ready | `checkout_error_logs` table exists |
| BigCommerce Integration | ✅ Ready | API access for customer/order data |

### 1.3 Current Email Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     CURRENT STATE                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  BigCommerce Store                                                   │
│       │                                                              │
│       ├──────────────> Klaviyo (Primary)                            │
│       │                  - Newsletter signups                        │
│       │                  - Abandoned cart                            │
│       │                  - Welcome series                            │
│       │                  - Promotional campaigns                     │
│       │                                                              │
│       └──────────────> n8n + Gmail (Alerts Only)                    │
│                          - Checkout error alerts                     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Requirements Analysis

### 2.1 Must-Have Features (P0)

| Feature | Description | Complexity |
|---------|-------------|------------|
| Newsletter Management | Signup forms, list management, double opt-in | Medium |
| Email Campaigns | Create, schedule, send bulk campaigns | High |
| Abandoned Cart | Trigger emails when cart abandoned | High |
| Welcome Series | Multi-step new customer onboarding | Medium |
| Segmentation | Customer segments by behavior/purchase history | Medium |
| Transactional Emails | Order confirmation, shipping updates | Medium |
| Unsubscribe Management | One-click unsubscribe, compliance | Low |
| Analytics | Open rates, click rates, conversions | Medium |

### 2.2 Should-Have Features (P1)

| Feature | Description | Complexity |
|---------|-------------|------------|
| Product Review Requests | Post-purchase review emails | Medium |
| Winback Campaigns | Re-engagement for lapsed customers | Medium |
| Birthday/Anniversary | Automated celebratory emails | Low |
| Browse Abandonment | Emails for product views without purchase | High |
| Cross-sell/Upsell | Product recommendations in emails | High |
| A/B Testing | Subject line and content testing | Medium |

### 2.3 Nice-to-Have Features (P2)

| Feature | Description | Complexity |
|---------|-------------|------------|
| SMS Marketing | Text message campaigns | High |
| Predictive Analytics | AI-driven send time optimization | High |
| Dynamic Content | Real-time personalized content | High |
| Multi-language | Content in multiple languages | Medium |

### 2.4 BigCommerce-Specific Requirements

| Requirement | Details |
|-------------|---------|
| Customer Sync | Import customers from BigCommerce API |
| Order Events | Webhooks for order created, updated, shipped |
| Cart Events | Abandoned cart detection via webhooks |
| Product Data | Product catalog sync for recommendations |
| Price Rules | Discount code generation via BigCommerce API |

---

## 3. Solution Options Comparison

### 3.1 Open Source Options

| Platform | Pros | Cons | Rating |
|----------|------|------|--------|
| **Listmonk** | Fast, lightweight, Go-based, great API, battle-tested | Requires hosting, no visual builder | ⭐⭐⭐⭐⭐ |
| **Keila** | Elixir-based, privacy-focused, drag-drop editor | Smaller community, less mature | ⭐⭐⭐⭐ |
| **Mautic** | Full marketing automation, many integrations | Heavy, complex, PHP-based | ⭐⭐⭐ |
| **Sendportal** | Laravel-based, clean UI | Smaller feature set | ⭐⭐⭐ |
| **Postal** | Delivery-focused, SMTP server | Not a campaign manager | ⭐⭐ |

### 3.2 SaaS Alternatives (For Reference)

| Platform | Monthly Cost | Notes |
|----------|--------------|-------|
| Klaviyo | $150-500+ | Current - expensive at scale |
| Mailchimp | $100-350+ | Cheaper but limited automation |
| Brevo (Sendinblue) | $25-89 | Good value, less ecommerce features |
| Drip | $39-154 | Ecommerce focused, simpler |
| Omnisend | $59-249 | Good BigCommerce integration |

### 3.3 Recommendation: Listmonk + Custom Automation

**Primary Choice: Listmonk**

Reasons:
1. **Performance**: Handles millions of subscribers efficiently (Go-based)
2. **Cost**: Free, self-hosted on existing infrastructure
3. **API-First**: Excellent REST API for automation
4. **Simplicity**: Easy to maintain and customize
5. **Compliance**: GDPR-compliant, self-hosted data
6. **Integration**: Works with any SMTP provider (Gmail, SES, SendGrid)

**Architecture Approach:**
- Listmonk for email delivery, templates, and basic campaigns
- Custom automation scripts for BigCommerce-specific flows
- Supabase for tracking, analytics, and automation state
- Gmail OAuth2/SES as SMTP provider

---

## 4. Recommended Architecture

### 4.1 Target State Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          TARGET ARCHITECTURE                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  BigCommerce Store                                                           │
│       │                                                                      │
│       ├─────────> BigCommerce Webhooks                                       │
│       │              │                                                       │
│       │              ├─── customer/created ──────┐                          │
│       │              ├─── order/created ─────────┤                          │
│       │              ├─── cart/abandoned ────────┤                          │
│       │              └─── shipment/created ──────┤                          │
│       │                                          │                          │
│       │                                          ▼                          │
│       │                              ┌─────────────────────┐                │
│       │                              │   Supabase Edge     │                │
│       │                              │   Functions         │                │
│       │                              └─────────┬───────────┘                │
│       │                                        │                            │
│       │                      ┌─────────────────┼─────────────────┐          │
│       │                      │                 │                 │          │
│       │                      ▼                 ▼                 ▼          │
│       │            ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   │
│       │            │  Supabase    │   │   Listmonk   │   │   Gmail/SES  │   │
│       │            │  Database    │   │   Server     │   │   SMTP       │   │
│       │            └──────────────┘   └──────────────┘   └──────────────┘   │
│       │                   │                   │                 │           │
│       │                   │         ┌─────────┴─────────┐       │           │
│       │                   │         │                   │       │           │
│       │                   ▼         ▼                   ▼       │           │
│       │           ┌─────────────────────────────────────────────┤           │
│       │           │          BOO Customers                      │           │
│       │           │  (Newsletter, Campaigns, Automations)       │           │
│       │           └─────────────────────────────────────────────┘           │
│       │                                                                      │
│       └─────────> Newsletter Signup Forms ──────> Listmonk API              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Component Overview

| Component | Purpose | Technology |
|-----------|---------|------------|
| **Listmonk** | Email campaigns, templates, sending | Self-hosted on DigitalOcean |
| **Supabase** | Automation state, analytics, event logs | Existing infrastructure |
| **Edge Functions** | Webhook handlers, automation triggers | Supabase Edge Functions |
| **BigCommerce API** | Customer/order data, cart info | REST API |
| **Gmail/SES** | Email delivery (SMTP) | OAuth2 / SES |
| **n8n** | Complex workflows, fallback orchestration | Existing at automation.growthcohq.com |

### 4.3 Listmonk Deployment Options

**Option A: DigitalOcean Droplet (Recommended)**
```
- $6/month droplet (1GB RAM, 1 vCPU)
- PostgreSQL included
- Easy backup via DigitalOcean snapshots
- Same region as existing infrastructure
```

**Option B: Docker on Existing Server**
```yaml
# docker-compose.yml
version: "3.7"
services:
  listmonk:
    image: listmonk/listmonk:latest
    ports:
      - "9000:9000"
    environment:
      - TZ=Australia/Melbourne
    volumes:
      - ./config.toml:/listmonk/config.toml
      - ./uploads:/listmonk/uploads

  db:
    image: postgres:13
    environment:
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_USER=listmonk
      - POSTGRES_DB=listmonk
    volumes:
      - ./data:/var/lib/postgresql/data
```

**Option C: Supabase PostgreSQL (Advanced)**
```
- Use existing Supabase database
- Listmonk connects to remote PostgreSQL
- Saves additional hosting cost
```

---

## 5. Database Schema

### 5.1 Supabase Tables for BOO Email Automation

```sql
-- ============================================
-- BOO Email Marketing Schema
-- ============================================

-- Subscriber management (synced from Listmonk/BigCommerce)
CREATE TABLE boo_email_subscribers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    first_name TEXT,
    last_name TEXT,
    bigcommerce_customer_id TEXT,
    listmonk_subscriber_id INTEGER,
    status TEXT DEFAULT 'active',  -- active, unsubscribed, bounced, cleaned
    source TEXT,  -- checkout, popup, footer, import
    subscribed_at TIMESTAMPTZ DEFAULT NOW(),
    unsubscribed_at TIMESTAMPTZ,
    last_email_sent_at TIMESTAMPTZ,
    last_email_opened_at TIMESTAMPTZ,
    total_orders INTEGER DEFAULT 0,
    total_spent DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_boo_subscribers_email ON boo_email_subscribers(email);
CREATE INDEX idx_boo_subscribers_status ON boo_email_subscribers(status);
CREATE INDEX idx_boo_subscribers_bc_id ON boo_email_subscribers(bigcommerce_customer_id);

-- Automation configuration
CREATE TABLE boo_email_automation_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    automation_type TEXT UNIQUE NOT NULL,  -- welcome_series, abandoned_cart, winback, review_request
    enabled BOOLEAN DEFAULT true,
    config JSONB NOT NULL DEFAULT '{}',
    last_run_at TIMESTAMPTZ,
    last_run_result JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Automation default configs
INSERT INTO boo_email_automation_config (automation_type, config) VALUES
('welcome_series', '{
    "delay_hours": 1,
    "email_count": 3,
    "sequence": [
        {"delay_hours": 0, "template": "welcome_1", "subject": "Welcome to Buy Organics Online!"},
        {"delay_hours": 24, "template": "welcome_2", "subject": "Your Guide to Organic Living"},
        {"delay_hours": 72, "template": "welcome_3", "subject": "10% off your first order"}
    ],
    "discount_code": "WELCOME10",
    "discount_percent": 10
}'::jsonb),
('abandoned_cart', '{
    "trigger_after_hours": 1,
    "email_count": 3,
    "sequence": [
        {"delay_hours": 1, "template": "cart_1", "subject": "You left something behind!"},
        {"delay_hours": 24, "template": "cart_2", "subject": "Your cart is waiting..."},
        {"delay_hours": 72, "template": "cart_3", "subject": "Last chance: 10% off your cart", "discount_code": "CART10"}
    ],
    "exclude_if_ordered": true,
    "min_cart_value": 20
}'::jsonb),
('winback', '{
    "trigger_after_days": 90,
    "email_count": 2,
    "sequence": [
        {"delay_days": 0, "template": "winback_1", "subject": "We miss you! Here''s 15% off"},
        {"delay_days": 7, "template": "winback_2", "subject": "Last chance: Your 15% discount expires soon"}
    ],
    "discount_code": "MISSYOU15",
    "discount_percent": 15,
    "min_previous_orders": 1
}'::jsonb),
('review_request', '{
    "trigger_after_days": 14,
    "email_count": 1,
    "sequence": [
        {"delay_days": 14, "template": "review_1", "subject": "How did you like your order?"}
    ],
    "min_order_value": 30
}'::jsonb),
('birthday', '{
    "trigger_days_before": 0,
    "email_count": 1,
    "sequence": [
        {"delay_days": 0, "template": "birthday_1", "subject": "Happy Birthday! Here''s a gift from us"}
    ],
    "discount_code": "BIRTHDAY20",
    "discount_percent": 20
}'::jsonb);

-- Email automation queue
CREATE TABLE boo_email_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscriber_id UUID REFERENCES boo_email_subscribers(id),
    email TEXT NOT NULL,
    automation_type TEXT NOT NULL,
    sequence_number INTEGER DEFAULT 1,
    template_name TEXT NOT NULL,
    subject TEXT NOT NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'pending',  -- pending, sent, failed, cancelled
    sent_at TIMESTAMPTZ,
    listmonk_campaign_id INTEGER,
    error_message TEXT,
    context JSONB DEFAULT '{}',  -- cart contents, order details, etc.
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_boo_queue_scheduled ON boo_email_queue(scheduled_at) WHERE status = 'pending';
CREATE INDEX idx_boo_queue_status ON boo_email_queue(status);
CREATE INDEX idx_boo_queue_email ON boo_email_queue(email);
CREATE INDEX idx_boo_queue_automation ON boo_email_queue(automation_type);

-- Abandoned cart tracking
CREATE TABLE boo_abandoned_carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bigcommerce_cart_id TEXT UNIQUE,
    customer_email TEXT,
    customer_name TEXT,
    cart_contents JSONB NOT NULL,
    cart_value DECIMAL(10,2),
    abandoned_at TIMESTAMPTZ DEFAULT NOW(),
    recovered_at TIMESTAMPTZ,
    recovery_order_id TEXT,
    emails_sent INTEGER DEFAULT 0,
    last_email_sent_at TIMESTAMPTZ,
    status TEXT DEFAULT 'abandoned',  -- abandoned, recovered, expired
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_boo_carts_status ON boo_abandoned_carts(status);
CREATE INDEX idx_boo_carts_email ON boo_abandoned_carts(customer_email);
CREATE INDEX idx_boo_carts_abandoned ON boo_abandoned_carts(abandoned_at);

-- Email send history (for analytics)
CREATE TABLE boo_email_sends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscriber_id UUID REFERENCES boo_email_subscribers(id),
    email TEXT NOT NULL,
    campaign_type TEXT NOT NULL,  -- bulk_campaign, automation, transactional
    automation_type TEXT,  -- welcome_series, abandoned_cart, etc.
    listmonk_campaign_id INTEGER,
    subject TEXT,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    delivered_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    bounced_at TIMESTAMPTZ,
    bounce_type TEXT,  -- hard, soft
    unsubscribed_at TIMESTAMPTZ,
    spam_reported_at TIMESTAMPTZ
);

CREATE INDEX idx_boo_sends_email ON boo_email_sends(email);
CREATE INDEX idx_boo_sends_campaign ON boo_email_sends(campaign_type);
CREATE INDEX idx_boo_sends_sent ON boo_email_sends(sent_at);

-- Discount codes generated for automations
CREATE TABLE boo_automation_discounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    automation_type TEXT NOT NULL,
    discount_code TEXT UNIQUE NOT NULL,
    discount_percent INTEGER,
    bigcommerce_coupon_id TEXT,
    expires_at TIMESTAMPTZ,
    status TEXT DEFAULT 'active',  -- active, used, expired
    used_at TIMESTAMPTZ,
    order_id TEXT,
    order_total DECIMAL(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_boo_discounts_code ON boo_automation_discounts(discount_code);
CREATE INDEX idx_boo_discounts_email ON boo_automation_discounts(email);
CREATE INDEX idx_boo_discounts_status ON boo_automation_discounts(status);

-- Segmentation rules
CREATE TABLE boo_email_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    rules JSONB NOT NULL,  -- {"total_orders": {"gte": 3}, "total_spent": {"gte": 200}}
    listmonk_list_id INTEGER,
    subscriber_count INTEGER DEFAULT 0,
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default segments
INSERT INTO boo_email_segments (name, description, rules) VALUES
('vip_customers', 'Customers with 5+ orders or $500+ spent',
 '{"or": [{"total_orders": {"gte": 5}}, {"total_spent": {"gte": 500}}]}'::jsonb),
('new_customers', 'Customers with first order in last 30 days',
 '{"total_orders": {"eq": 1}, "first_order_days_ago": {"lte": 30}}'::jsonb),
('at_risk', 'Customers with no order in 60-90 days',
 '{"last_order_days_ago": {"gte": 60, "lte": 90}}'::jsonb),
('lapsed', 'Customers with no order in 90+ days',
 '{"last_order_days_ago": {"gte": 90}}'::jsonb),
('high_aov', 'Customers with average order value > $100',
 '{"average_order_value": {"gte": 100}}'::jsonb);

-- ============================================
-- Views for Analytics & Reporting
-- ============================================

-- Email campaign performance
CREATE OR REPLACE VIEW boo_email_campaign_stats AS
SELECT
    campaign_type,
    automation_type,
    DATE_TRUNC('day', sent_at) as send_date,
    COUNT(*) as total_sent,
    COUNT(delivered_at) as delivered,
    COUNT(opened_at) as opened,
    COUNT(clicked_at) as clicked,
    COUNT(bounced_at) as bounced,
    COUNT(unsubscribed_at) as unsubscribed,
    ROUND(COUNT(opened_at)::numeric / NULLIF(COUNT(delivered_at), 0) * 100, 2) as open_rate,
    ROUND(COUNT(clicked_at)::numeric / NULLIF(COUNT(opened_at), 0) * 100, 2) as click_rate,
    ROUND(COUNT(bounced_at)::numeric / NULLIF(COUNT(*), 0) * 100, 2) as bounce_rate
FROM boo_email_sends
GROUP BY campaign_type, automation_type, DATE_TRUNC('day', sent_at);

-- Abandoned cart recovery stats
CREATE OR REPLACE VIEW boo_cart_recovery_stats AS
SELECT
    DATE_TRUNC('week', abandoned_at) as week,
    COUNT(*) as total_abandoned,
    COUNT(CASE WHEN status = 'recovered' THEN 1 END) as recovered,
    SUM(CASE WHEN status = 'abandoned' THEN cart_value END) as lost_value,
    SUM(CASE WHEN status = 'recovered' THEN cart_value END) as recovered_value,
    ROUND(COUNT(CASE WHEN status = 'recovered' THEN 1 END)::numeric /
          NULLIF(COUNT(*), 0) * 100, 2) as recovery_rate
FROM boo_abandoned_carts
GROUP BY DATE_TRUNC('week', abandoned_at);

-- Automation discount performance
CREATE OR REPLACE VIEW boo_discount_performance AS
SELECT
    automation_type,
    COUNT(*) as total_generated,
    COUNT(CASE WHEN status = 'used' THEN 1 END) as used,
    SUM(order_total) as total_revenue,
    ROUND(COUNT(CASE WHEN status = 'used' THEN 1 END)::numeric /
          NULLIF(COUNT(*), 0) * 100, 2) as redemption_rate,
    ROUND(AVG(CASE WHEN status = 'used' THEN order_total END), 2) as avg_order_value
FROM boo_automation_discounts
GROUP BY automation_type;

-- Subscriber growth over time
CREATE OR REPLACE VIEW boo_subscriber_growth AS
SELECT
    DATE_TRUNC('week', subscribed_at) as week,
    COUNT(*) as new_subscribers,
    COUNT(CASE WHEN source = 'checkout' THEN 1 END) as from_checkout,
    COUNT(CASE WHEN source = 'popup' THEN 1 END) as from_popup,
    COUNT(CASE WHEN source = 'footer' THEN 1 END) as from_footer,
    COUNT(CASE WHEN source = 'import' THEN 1 END) as from_import
FROM boo_email_subscribers
GROUP BY DATE_TRUNC('week', subscribed_at);

-- ============================================
-- Functions for Automation
-- ============================================

-- Function to queue automation email
CREATE OR REPLACE FUNCTION boo_queue_automation_email(
    p_email TEXT,
    p_automation_type TEXT,
    p_sequence_number INTEGER,
    p_delay_hours INTEGER,
    p_context JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    v_config JSONB;
    v_sequence JSONB;
    v_subscriber_id UUID;
    v_queue_id UUID;
BEGIN
    -- Get automation config
    SELECT config INTO v_config
    FROM boo_email_automation_config
    WHERE automation_type = p_automation_type AND enabled = true;

    IF v_config IS NULL THEN
        RAISE EXCEPTION 'Automation % not found or disabled', p_automation_type;
    END IF;

    -- Get sequence step
    v_sequence := v_config->'sequence'->(p_sequence_number - 1);

    IF v_sequence IS NULL THEN
        RETURN NULL;  -- No more sequence steps
    END IF;

    -- Get subscriber ID
    SELECT id INTO v_subscriber_id
    FROM boo_email_subscribers
    WHERE email = p_email AND status = 'active';

    -- Insert into queue
    INSERT INTO boo_email_queue (
        subscriber_id,
        email,
        automation_type,
        sequence_number,
        template_name,
        subject,
        scheduled_at,
        context
    ) VALUES (
        v_subscriber_id,
        p_email,
        p_automation_type,
        p_sequence_number,
        v_sequence->>'template',
        v_sequence->>'subject',
        NOW() + (p_delay_hours || ' hours')::INTERVAL,
        p_context
    ) RETURNING id INTO v_queue_id;

    RETURN v_queue_id;
END;
$$ LANGUAGE plpgsql;

-- Function to process email queue
CREATE OR REPLACE FUNCTION boo_get_pending_emails(p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
    queue_id UUID,
    email TEXT,
    automation_type TEXT,
    sequence_number INTEGER,
    template_name TEXT,
    subject TEXT,
    context JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        q.id as queue_id,
        q.email,
        q.automation_type,
        q.sequence_number,
        q.template_name,
        q.subject,
        q.context
    FROM boo_email_queue q
    WHERE q.status = 'pending'
      AND q.scheduled_at <= NOW()
      AND EXISTS (
          SELECT 1 FROM boo_email_subscribers s
          WHERE s.email = q.email AND s.status = 'active'
      )
    ORDER BY q.scheduled_at
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED;
END;
$$ LANGUAGE plpgsql;

-- Function to mark email as sent
CREATE OR REPLACE FUNCTION boo_mark_email_sent(
    p_queue_id UUID,
    p_listmonk_campaign_id INTEGER DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    UPDATE boo_email_queue
    SET status = 'sent',
        sent_at = NOW(),
        listmonk_campaign_id = p_listmonk_campaign_id
    WHERE id = p_queue_id;

    -- Update subscriber last email sent
    UPDATE boo_email_subscribers s
    SET last_email_sent_at = NOW()
    FROM boo_email_queue q
    WHERE q.id = p_queue_id AND s.email = q.email;
END;
$$ LANGUAGE plpgsql;

-- Function to check and expire old discount codes
CREATE OR REPLACE FUNCTION boo_expire_discount_codes()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE boo_automation_discounts
    SET status = 'expired'
    WHERE status = 'active' AND expires_at < NOW();

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- RLS Policies
-- ============================================

ALTER TABLE boo_email_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE boo_email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE boo_abandoned_carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE boo_email_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE boo_automation_discounts ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role full access" ON boo_email_subscribers FOR ALL USING (true);
CREATE POLICY "Service role full access" ON boo_email_queue FOR ALL USING (true);
CREATE POLICY "Service role full access" ON boo_abandoned_carts FOR ALL USING (true);
CREATE POLICY "Service role full access" ON boo_email_sends FOR ALL USING (true);
CREATE POLICY "Service role full access" ON boo_automation_discounts FOR ALL USING (true);
```

---

## 6. Integration Points

### 6.1 BigCommerce Webhooks

| Webhook | Purpose | Handler |
|---------|---------|---------|
| `store/customer/created` | Add to subscribers | `/functions/boo-customer-created` |
| `store/customer/updated` | Update subscriber data | `/functions/boo-customer-updated` |
| `store/order/created` | Trigger review request, update stats | `/functions/boo-order-created` |
| `store/order/statusUpdated` | Shipped notification | `/functions/boo-order-status` |
| `store/cart/abandoned` | Trigger abandoned cart flow | `/functions/boo-cart-abandoned` |

### 6.2 BigCommerce Webhook Setup

```bash
# Create webhooks via BigCommerce API
curl -X POST "https://api.bigcommerce.com/stores/{store_hash}/v3/hooks" \
  -H "X-Auth-Token: {access_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "scope": "store/customer/created",
    "destination": "https://your-project.supabase.co/functions/v1/boo-customer-created",
    "is_active": true,
    "headers": {
      "X-Webhook-Secret": "your-secret"
    }
  }'
```

### 6.3 Listmonk API Integration

```typescript
// shared/libs/integrations/listmonk/client.ts

interface ListmonkConfig {
  baseUrl: string;
  username: string;
  password: string;
}

class ListmonkClient {
  private config: ListmonkConfig;
  private authHeader: string;

  constructor(config: ListmonkConfig) {
    this.config = config;
    this.authHeader = `Basic ${Buffer.from(`${config.username}:${config.password}`).toString('base64')}`;
  }

  // Create subscriber
  async createSubscriber(data: {
    email: string;
    name: string;
    status: 'enabled' | 'disabled' | 'blocklisted';
    lists: number[];
    attribs?: Record<string, any>;
  }): Promise<{ id: number }> {
    const response = await fetch(`${this.config.baseUrl}/api/subscribers`, {
      method: 'POST',
      headers: {
        'Authorization': this.authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return response.json();
  }

  // Send transactional email
  async sendTransactional(data: {
    subscriber_email: string;
    template_id: number;
    data: Record<string, any>;
  }): Promise<void> {
    await fetch(`${this.config.baseUrl}/api/tx`, {
      method: 'POST',
      headers: {
        'Authorization': this.authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
  }

  // Create campaign
  async createCampaign(data: {
    name: string;
    subject: string;
    lists: number[];
    type: 'regular' | 'optin';
    content_type: 'richtext' | 'html' | 'plain' | 'markdown';
    body: string;
    template_id?: number;
    send_at?: string;
  }): Promise<{ id: number }> {
    const response = await fetch(`${this.config.baseUrl}/api/campaigns`, {
      method: 'POST',
      headers: {
        'Authorization': this.authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return response.json();
  }

  // Get campaign stats
  async getCampaignStats(campaignId: number): Promise<{
    sent: number;
    views: number;
    clicks: number;
    bounces: number;
  }> {
    const response = await fetch(`${this.config.baseUrl}/api/campaigns/${campaignId}`, {
      headers: { 'Authorization': this.authHeader }
    });
    const data = await response.json();
    return {
      sent: data.data.sent,
      views: data.data.views,
      clicks: data.data.clicks,
      bounces: data.data.bounces
    };
  }
}

export const listmonk = new ListmonkClient({
  baseUrl: process.env.LISTMONK_URL!,
  username: process.env.LISTMONK_USERNAME!,
  password: process.env.LISTMONK_PASSWORD!
});
```

### 6.4 BigCommerce API Integration

```typescript
// shared/libs/integrations/bigcommerce/client.ts

interface BigCommerceConfig {
  storeHash: string;
  accessToken: string;
}

class BigCommerceClient {
  private config: BigCommerceConfig;
  private baseUrl: string;

  constructor(config: BigCommerceConfig) {
    this.config = config;
    this.baseUrl = `https://api.bigcommerce.com/stores/${config.storeHash}/v3`;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'X-Auth-Token': this.config.accessToken,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    return response.json();
  }

  // Get all customers
  async getCustomers(params?: {
    limit?: number;
    page?: number;
    date_created_min?: string;
  }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request(`/customers?${query}`);
  }

  // Get customer by email
  async getCustomerByEmail(email: string) {
    return this.request(`/customers?email:in=${encodeURIComponent(email)}`);
  }

  // Get abandoned carts
  async getAbandonedCarts(params?: {
    limit?: number;
    min_date_created?: string;
  }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request(`/abandoned-carts?${query}`);
  }

  // Get cart contents
  async getCartContents(cartId: string) {
    return this.request(`/carts/${cartId}?include=line_items`);
  }

  // Create coupon
  async createCoupon(data: {
    name: string;
    type: 'per_item_discount' | 'percentage_discount' | 'per_total_discount';
    amount: string;
    code: string;
    enabled: boolean;
    applies_to: { entity: 'categories' | 'products'; ids: number[] };
    max_uses?: number;
    max_uses_per_customer?: number;
    restricted_to?: { emails: string[] };
  }) {
    return this.request('/coupons', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Get orders
  async getOrders(params?: {
    customer_id?: number;
    min_date_created?: string;
    status_id?: number;
  }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request(`/orders?${query}`);
  }
}

export const bigcommerce = new BigCommerceClient({
  storeHash: process.env.BOO_BC_STORE_HASH!,
  accessToken: process.env.BOO_BC_ACCESS_TOKEN!
});
```

---

## 7. Implementation Phases

### Phase 1: Infrastructure Setup (Week 1-2)

| Task | Description | Owner | Status |
|------|-------------|-------|--------|
| 1.1 | Deploy Listmonk instance on DigitalOcean | DevOps | Pending |
| 1.2 | Configure SMTP (Gmail OAuth2 or SES) | DevOps | Pending |
| 1.3 | Apply Supabase database schema | DevOps | Pending |
| 1.4 | Create Listmonk API wrapper library | Dev | Pending |
| 1.5 | Create BigCommerce API wrapper library | Dev | Pending |
| 1.6 | Set up webhook endpoints in Supabase | Dev | Pending |

### Phase 2: Core Automations (Week 3-4)

| Task | Description | Owner | Status |
|------|-------------|-------|--------|
| 2.1 | Implement welcome series automation | Dev | Pending |
| 2.2 | Implement abandoned cart flow | Dev | Pending |
| 2.3 | Create email templates in Listmonk | Design | Pending |
| 2.4 | Set up BigCommerce webhooks | Dev | Pending |
| 2.5 | Build email queue processor | Dev | Pending |
| 2.6 | Create discount code generation | Dev | Pending |

### Phase 3: Migration & Testing (Week 5-6)

| Task | Description | Owner | Status |
|------|-------------|-------|--------|
| 3.1 | Export subscribers from Klaviyo | Admin | Pending |
| 3.2 | Import subscribers to Listmonk | Dev | Pending |
| 3.3 | Sync with BigCommerce customers | Dev | Pending |
| 3.4 | Test all automation flows | QA | Pending |
| 3.5 | A/B test subject lines | Marketing | Pending |
| 3.6 | Monitor deliverability metrics | Dev | Pending |

### Phase 4: Cutover & Optimization (Week 7-8)

| Task | Description | Owner | Status |
|------|-------------|-------|--------|
| 4.1 | Disable Klaviyo integrations | Admin | Pending |
| 4.2 | Update newsletter signup forms | Dev | Pending |
| 4.3 | Launch first campaign on new system | Marketing | Pending |
| 4.4 | Set up monitoring dashboards | Dev | Pending |
| 4.5 | Document runbooks and procedures | Dev | Pending |
| 4.6 | Cancel Klaviyo subscription | Admin | Pending |

---

## 8. Migration Strategy

### 8.1 Data Migration Plan

```
Klaviyo Export → Clean/Dedupe → Listmonk Import → Supabase Sync
```

**Step 1: Export from Klaviyo**
```bash
# Via Klaviyo API
curl -X GET "https://a.klaviyo.com/api/profiles/" \
  -H "Authorization: Klaviyo-API-Key ${BOO_KLAVIYO_API_KEY}" \
  -H "revision: 2024-10-15" \
  > klaviyo-profiles-export.json
```

**Step 2: Transform Data**
```typescript
// scripts/migrate-klaviyo-to-listmonk.ts
interface KlaviyoProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  created: string;
  updated: string;
  $consent: string[];
}

interface ListmonkSubscriber {
  email: string;
  name: string;
  status: 'enabled' | 'disabled' | 'blocklisted';
  lists: number[];
  attribs: Record<string, any>;
}

function transformProfile(profile: KlaviyoProfile): ListmonkSubscriber {
  const hasConsent = profile.$consent?.includes('email') ?? false;
  return {
    email: profile.email,
    name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
    status: hasConsent ? 'enabled' : 'disabled',
    lists: [1],  // Main newsletter list
    attribs: {
      klaviyo_id: profile.id,
      migrated_at: new Date().toISOString()
    }
  };
}
```

**Step 3: Import to Listmonk**
```bash
# Via Listmonk API bulk import
curl -X POST "${LISTMONK_URL}/api/subscribers" \
  -H "Authorization: Basic ${LISTMONK_AUTH}" \
  -H "Content-Type: application/json" \
  -d @listmonk-import.json
```

### 8.2 Segment Migration Mapping

| Klaviyo Segment | Listmonk Equivalent | Migration Method |
|-----------------|---------------------|------------------|
| All Subscribers | Main List | Direct import |
| Engaged (30d) | Tag: engaged-30d | Query + tag |
| VIP Customers | List: VIP | BigCommerce order data |
| Unengaged | Tag: unengaged | Query + tag |
| Suppressed | Blocklist status | Import to blocklist |

### 8.3 Form Migration

| Current Form | New Implementation |
|--------------|-------------------|
| Footer signup | Listmonk embedded form |
| Popup (Privy/Klaviyo) | Custom JS → Listmonk API |
| Checkout opt-in | BigCommerce webhook → Listmonk |

---

## 9. Email Automation Flows

### 9.1 Welcome Series Flow

```
Customer Created/Newsletter Signup
         │
         ▼
    ┌─────────────────────────────────────┐
    │ Email 1: Welcome (Immediate)        │
    │ Subject: "Welcome to BOO!"          │
    │ Content: Brand intro, shop guide    │
    └─────────────────────────────────────┘
         │
         │ 24 hours
         ▼
    ┌─────────────────────────────────────┐
    │ Email 2: Education (Day 1)          │
    │ Subject: "Your Guide to Organic"    │
    │ Content: Benefits, popular products │
    └─────────────────────────────────────┘
         │
         │ 72 hours
         ▼
    ┌─────────────────────────────────────┐
    │ Email 3: Incentive (Day 3)          │
    │ Subject: "10% off your first order" │
    │ Content: WELCOME10 discount code    │
    └─────────────────────────────────────┘
```

### 9.2 Abandoned Cart Flow

```
Cart Abandoned (1 hour no activity)
         │
         ▼
    ┌─────────────────────────────────────┐
    │ Check: Has customer ordered?        │
    │ If yes → Cancel flow               │
    └─────────────────────────────────────┘
         │ No
         ▼
    ┌─────────────────────────────────────┐
    │ Email 1: Reminder (1 hour)          │
    │ Subject: "You left something behind"│
    │ Content: Cart items, return link    │
    └─────────────────────────────────────┘
         │
         │ 24 hours - Check if ordered
         ▼
    ┌─────────────────────────────────────┐
    │ Email 2: Social Proof (Day 1)       │
    │ Subject: "Your cart is waiting..."  │
    │ Content: Reviews, trust badges      │
    └─────────────────────────────────────┘
         │
         │ 72 hours - Check if ordered
         ▼
    ┌─────────────────────────────────────┐
    │ Email 3: Discount (Day 3)           │
    │ Subject: "10% off your cart"        │
    │ Content: CART10 unique code         │
    └─────────────────────────────────────┘
```

### 9.3 Winback Flow

```
Customer No Order > 90 Days
         │
         ▼
    ┌─────────────────────────────────────┐
    │ Check: Has previous order?          │
    │ If no → Don't qualify              │
    └─────────────────────────────────────┘
         │ Yes
         ▼
    ┌─────────────────────────────────────┐
    │ Email 1: We Miss You (Day 0)        │
    │ Subject: "We miss you! 15% off"     │
    │ Content: MISSYOU15 unique code      │
    └─────────────────────────────────────┘
         │
         │ 7 days - Check if ordered
         ▼
    ┌─────────────────────────────────────┐
    │ Email 2: Last Chance (Day 7)        │
    │ Subject: "Discount expires soon"    │
    │ Content: Urgency, same code         │
    └─────────────────────────────────────┘
```

### 9.4 Review Request Flow

```
Order Delivered (14 days post-ship)
         │
         ▼
    ┌─────────────────────────────────────┐
    │ Check: Order value > $30?           │
    │ If no → Skip                       │
    └─────────────────────────────────────┘
         │ Yes
         ▼
    ┌─────────────────────────────────────┐
    │ Email 1: Review Request             │
    │ Subject: "How was your order?"      │
    │ Content: Product review links       │
    └─────────────────────────────────────┘
```

---

## 10. Monitoring & Analytics

### 10.1 Key Metrics to Track

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Email Deliverability | >98% | <95% |
| Open Rate | >20% | <15% |
| Click Rate | >3% | <2% |
| Bounce Rate | <2% | >5% |
| Unsubscribe Rate | <0.5% | >1% |
| Spam Complaint Rate | <0.1% | >0.1% |
| Cart Recovery Rate | >10% | <5% |
| Welcome Series Completion | >70% | <50% |

### 10.2 Dashboard Queries

```sql
-- Daily email performance summary
SELECT
    DATE_TRUNC('day', sent_at) as date,
    campaign_type,
    COUNT(*) as sent,
    ROUND(AVG(CASE WHEN opened_at IS NOT NULL THEN 1 ELSE 0 END) * 100, 1) as open_rate,
    ROUND(AVG(CASE WHEN clicked_at IS NOT NULL THEN 1 ELSE 0 END) * 100, 1) as click_rate
FROM boo_email_sends
WHERE sent_at > NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', sent_at), campaign_type
ORDER BY date DESC, campaign_type;

-- Abandoned cart recovery this month
SELECT
    COUNT(*) as total_abandoned,
    SUM(cart_value) as total_abandoned_value,
    COUNT(CASE WHEN status = 'recovered' THEN 1 END) as recovered,
    SUM(CASE WHEN status = 'recovered' THEN cart_value END) as recovered_value,
    ROUND(COUNT(CASE WHEN status = 'recovered' THEN 1 END)::numeric / COUNT(*) * 100, 1) as recovery_rate
FROM boo_abandoned_carts
WHERE abandoned_at > DATE_TRUNC('month', NOW());

-- Automation discount performance
SELECT
    automation_type,
    COUNT(*) as codes_generated,
    COUNT(CASE WHEN status = 'used' THEN 1 END) as codes_used,
    SUM(CASE WHEN status = 'used' THEN order_total END) as revenue_generated,
    ROUND(COUNT(CASE WHEN status = 'used' THEN 1 END)::numeric / COUNT(*) * 100, 1) as redemption_rate
FROM boo_automation_discounts
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY automation_type;
```

### 10.3 Alerting Rules

| Alert | Condition | Action |
|-------|-----------|--------|
| High bounce rate | Bounce rate > 5% in 24h | Pause campaigns, investigate |
| Spam complaints | Any spam complaint | Review email, check suppression |
| Delivery failure | >10% failed in 1h | Check SMTP, restart service |
| Queue backup | >1000 pending emails | Scale processing, alert |
| Listmonk down | Health check failed | Restart service, failover |

---

## 11. Risk Assessment

### 11.1 Risk Matrix

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Email deliverability issues | Medium | High | Warm up IP, monitor reputation |
| Migration data loss | Low | High | Multiple backups, verification |
| Listmonk downtime | Low | Medium | Docker auto-restart, monitoring |
| BigCommerce webhook failures | Medium | Medium | Retry logic, dead letter queue |
| Gmail OAuth token expiry | Medium | Medium | Auto-refresh, alerts on expiry |
| Subscriber complaints | Low | Medium | Double opt-in, easy unsubscribe |

### 11.2 Rollback Plan

**If migration fails:**
1. Re-enable Klaviyo webhooks
2. Keep Listmonk running in parallel for testing
3. Sync any new subscribers back to Klaviyo
4. Investigate and fix issues before retry

**Point of no return:**
- After 30 days successful operation on new system
- All Klaviyo data exported and archived
- No active Klaviyo campaigns running

---

## 12. Cost Analysis

### 12.1 Current Costs (Klaviyo)

| Item | Monthly Cost | Annual Cost |
|------|--------------|-------------|
| Klaviyo subscription (5,000 contacts) | ~$100 | ~$1,200 |
| Klaviyo subscription (10,000 contacts) | ~$175 | ~$2,100 |
| Klaviyo subscription (25,000 contacts) | ~$400 | ~$4,800 |

### 12.2 New System Costs

| Item | Monthly Cost | Annual Cost |
|------|--------------|-------------|
| DigitalOcean Droplet (1GB) | $6 | $72 |
| Amazon SES (10,000 emails) | ~$1 | ~$12 |
| Amazon SES (50,000 emails) | ~$5 | ~$60 |
| Domain/SSL | $0 (existing) | $0 |
| **Total (10k emails/month)** | **~$7** | **~$84** |
| **Total (50k emails/month)** | **~$11** | **~$132** |

### 12.3 Savings Projection

| Scenario | Klaviyo Cost | New System | Annual Savings |
|----------|--------------|------------|----------------|
| 5,000 contacts | $1,200/yr | $84/yr | **$1,116** |
| 10,000 contacts | $2,100/yr | $132/yr | **$1,968** |
| 25,000 contacts | $4,800/yr | $180/yr | **$4,620** |

---

## 13. Success Criteria

### 13.1 Launch Criteria

- [ ] All automations functional (welcome, cart, winback, review)
- [ ] Email deliverability > 95%
- [ ] Bounce rate < 3%
- [ ] All Klaviyo subscribers migrated
- [ ] BigCommerce webhooks connected
- [ ] Monitoring dashboards live
- [ ] Runbooks documented

### 13.2 30-Day Success Metrics

| Metric | Target |
|--------|--------|
| Email deliverability | >98% |
| Open rate | Within 2% of Klaviyo baseline |
| Click rate | Within 1% of Klaviyo baseline |
| Cart recovery rate | >8% |
| System uptime | >99.5% |
| Support tickets | <5 related to email |

### 13.3 90-Day Success Metrics

| Metric | Target |
|--------|--------|
| Email list growth | +5% |
| Revenue from email | Match or exceed Klaviyo period |
| Cost savings | >80% vs Klaviyo |
| Automation ROI | Positive from discounts |

---

## Appendix A: Environment Variables

```bash
# Listmonk
LISTMONK_URL=https://listmonk.buyorganicsonline.com.au
LISTMONK_USERNAME=admin
LISTMONK_PASSWORD=<vault: boo/listmonk_password>

# BigCommerce
BOO_BC_STORE_HASH=<vault: boo/bc_store_hash>
BOO_BC_ACCESS_TOKEN=<vault: boo/bc_access_token>
BOO_BC_CLIENT_SECRET=<vault: boo/bc_client_secret>

# Gmail OAuth2
BOO_GMAIL_CLIENT_ID=<vault: boo/gmail_client_id>
BOO_GMAIL_CLIENT_SECRET=<vault: boo/gmail_client_secret>
BOO_GMAIL_REFRESH_TOKEN=<vault: boo/gmail_refresh_token>

# Amazon SES (alternative SMTP)
AWS_SES_ACCESS_KEY=<vault: boo/ses_access_key>
AWS_SES_SECRET_KEY=<vault: boo/ses_secret_key>
AWS_SES_REGION=ap-southeast-2

# Webhook Security
BOO_WEBHOOK_SECRET=<vault: boo/webhook_secret>

# Supabase
SUPABASE_URL=https://qcvfxxsnqvdfmpbcgdni.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<vault: supabase_service_role_key>
```

---

## Appendix B: File Structure

```
buy-organics-online/
├── KLAVIYO-REPLACEMENT-PLAN.md          # This document
├── email-marketing/
│   ├── scripts/
│   │   ├── sync-bigcommerce-customers.ts    # Customer sync
│   │   ├── process-email-queue.ts           # Queue processor
│   │   ├── generate-discount-code.ts        # Coupon generator
│   │   ├── migrate-klaviyo-subscribers.ts   # Migration script
│   │   └── check-automation-health.ts       # Health checks
│   ├── templates/
│   │   ├── welcome-1.html
│   │   ├── welcome-2.html
│   │   ├── welcome-3.html
│   │   ├── cart-1.html
│   │   ├── cart-2.html
│   │   ├── cart-3.html
│   │   ├── winback-1.html
│   │   ├── winback-2.html
│   │   └── review-1.html
│   └── config/
│       └── automation-config.json

shared/libs/integrations/
├── listmonk/
│   └── client.ts
└── bigcommerce/
    └── client.ts

infra/supabase/migrations/
└── 20251201_boo_email_marketing.sql

dashboard/src/app/api/
└── webhooks/
    └── boo/
        ├── customer-created/route.ts
        ├── order-created/route.ts
        └── cart-abandoned/route.ts
```

---

## Appendix C: Listmonk Configuration

```toml
# config.toml for Listmonk
[app]
address = "0.0.0.0:9000"
admin_username = "admin"
admin_password = ""  # Set via environment

[db]
host = "db"
port = 5432
user = "listmonk"
password = ""  # Set via environment
database = "listmonk"
ssl_mode = "disable"

[smtp.buy-organics]
enabled = true
host = "smtp.gmail.com"
port = 587
auth_protocol = "login"
username = "sales@buyorganicsonline.com.au"
password = ""  # OAuth2 access token
tls_enabled = true
tls_skip_verify = false
max_conns = 10
retries = 3
idle_timeout = "15s"
wait_timeout = "10s"
```

---

## Appendix D: Quick Start Commands

```bash
# Deploy Listmonk
cd /home/user/master-ops/infra/listmonk
docker-compose up -d

# Apply database schema
psql $SUPABASE_URL -f infra/supabase/migrations/20251201_boo_email_marketing.sql

# Migrate Klaviyo subscribers
npx tsx buy-organics-online/email-marketing/scripts/migrate-klaviyo-subscribers.ts

# Sync BigCommerce customers
npx tsx buy-organics-online/email-marketing/scripts/sync-bigcommerce-customers.ts

# Start queue processor (cron)
npx tsx buy-organics-online/email-marketing/scripts/process-email-queue.ts

# Health check
npx tsx buy-organics-online/email-marketing/scripts/check-automation-health.ts
```

---

**Document Revision History**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-01 | Claude | Initial comprehensive plan |

---

*This plan was generated as part of the master-ops email marketing optimization initiative.*
