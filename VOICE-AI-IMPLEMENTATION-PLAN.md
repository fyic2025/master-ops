# Voice AI Integration Plan

**Created:** 2024-12-04
**Updated:** 2024-12-04 (Ultra-Low Latency Revision)
**Status:** Planning
**Target:** Dashboard integration with Voice AI tab
**Location:** Melbourne, Australia

---

## Executive Summary

This document outlines a step-by-step implementation plan for integrating Voice AI capabilities into the master-ops dashboard. The focus is on:
- **Ultra-low latency** (<200ms response time - human conversation speed)
- **Lowest cost** (~$0.03-0.05/minute target vs industry standard $0.10/minute)
- **Highest quality** (natural-sounding voices)
- **Both inbound and outbound** call capabilities
- **Australian infrastructure** (Sydney PoP for Melbourne calls)

---

## ⚡ CRITICAL: Ultra-Low Latency Requirements

### Why 500ms is Too Slow

| Latency | Experience |
|---------|------------|
| **150-200ms** | Human conversation speed (natural) |
| **232ms** | GPT-4o average response time |
| **300ms** | Noticeable but acceptable |
| **500ms** | Feels laggy, unnatural |
| **800ms+** | Frustrating, robotic |

**ITU-T Recommendation:** 100-150ms one-way latency for interactive voice.

### Australia-Specific Challenge

Network latency from Melbourne to:
- US West Coast: ~150-180ms
- US East Coast: ~200-250ms
- Singapore: ~80-100ms
- Sydney: ~10-20ms

**Solution:** Use infrastructure with Australian presence.

---

## 🏆 RECOMMENDED: Telnyx Full-Stack Voice AI (Sydney)

### Why Telnyx is the Best Choice for Australia

**Telnyx deployed GPUs in Sydney in October 2025** specifically for Voice AI:
- Sub-200ms round-trip time (RTT)
- GPU inference co-located with telephony PoP
- Zero external API calls (everything on private network)
- Australian data sovereignty compliance
- Licensed carrier in Australia

### Architecture

```
Melbourne User ──[10-20ms]──▶ Telnyx Sydney PoP
                                    │
                              ┌─────┴─────┐
                              │ Co-located │
                              │   GPUs     │
                              ├───────────┤
                              │ STT (50ms)│
                              │ LLM (80ms)│
                              │ TTS (40ms)│
                              └─────┬─────┘
                                    │
                              Total: <200ms RTT
```

### Telnyx Pricing (Estimated)

| Component | Cost |
|-----------|------|
| Voice AI Agent | ~$0.05-0.08/min (bundled) |
| Australian Phone Number | ~$5-10/month |
| Inbound calls | ~$0.015/min |
| Outbound calls (AU) | ~$0.02/min |

**Contact Telnyx for exact AU pricing and volume discounts.**

---

## 🚀 ALTERNATIVE: OpenAI Realtime API (GPT-4o Voice)

### Why Consider OpenAI Realtime API

OpenAI's Realtime API provides **speech-to-speech** in a single model:
- **232ms average latency** (matches human response time)
- **<200ms** with gpt-4o-realtime-preview-2024-12-17
- No separate STT/LLM/TTS - single unified model
- Natural voice with emotional range
- WebSocket connection (low overhead)

### Pricing (December 2024 - 60% Reduction)

| Model | Audio Input | Audio Output | Cached Input |
|-------|-------------|--------------|--------------|
| gpt-4o-realtime | $40/1M tokens | $80/1M tokens | $2.50/1M |
| gpt-4o-mini-realtime | $10/1M tokens | $20/1M tokens | $0.30/1M |
| gpt-realtime (newest) | $32/1M tokens | $64/1M tokens | $0.40/1M |

**Estimated per-minute cost:** ~$0.08-0.12/min (higher than Telnyx but simpler)

### Latency Consideration for Australia

OpenAI uses global edge infrastructure, but primary inference is US-based.
- Expect ~250-350ms total latency from Melbourne
- Still acceptable, but not as fast as Telnyx Sydney

---

## 🔬 FUTURE: Moshi (Self-Hosted Ultra-Low Latency)

### What is Moshi?

[Moshi by Kyutai Labs](https://github.com/kyutai-labs/moshi) is an open-source speech-to-speech model:
- **160ms theoretical latency** (200ms practical)
- Full-duplex conversation (can listen while speaking)
- Open-source (MIT license)
- Can be self-hosted on Australian infrastructure

### Self-Hosted Architecture

```
Melbourne User ──▶ DigitalOcean Sydney Droplet
                        │
                   ┌────┴────┐
                   │  Moshi  │  (GPU: ~$300-500/month)
                   │  7B     │
                   │ params  │
                   └────┬────┘
                        │
                   160-200ms RTT
```

**Pros:** Lowest latency possible, full control, no per-minute costs
**Cons:** Requires GPU infrastructure (~$300-500/month), more complex setup

---

## 📊 Provider Comparison Summary (Australia Focus)

| Provider | Latency (Melbourne) | Cost/Min | Setup Complexity | Best For |
|----------|---------------------|----------|------------------|----------|
| **Telnyx Sydney** ⭐ | <200ms | ~$0.05-0.08 | Low | Production, low latency |
| OpenAI Realtime | ~250-350ms | ~$0.08-0.12 | Medium | Simplicity, quality |
| Retell AI | ~620ms | $0.07 | Low | No-code, compliance |
| Moshi (self-hosted) | <200ms | ~$0.02 + hosting | High | Maximum control |
| DIY Stack (US) | ~400-600ms | ~$0.03 | High | Cost optimization |

**Recommendation:** Start with **Telnyx Sydney** for best latency/cost balance in Australia.

---

## Part 1: Provider Analysis & Cost Comparison

### All-In-One Platforms (Managed)

| Provider | Base Cost/Min | Total Cost/Min | Latency | Pros | Cons |
|----------|--------------|----------------|---------|------|------|
| **Retell AI** | $0.07 | $0.07-0.15 | <500ms | No-code, HIPAA compliant, transparent pricing | Mid-range cost |
| **Vapi AI** | $0.05 | $0.10-0.33 | <500ms | Scalable (1M+ concurrent), multilingual | Hidden costs, complex pricing |
| **Bland AI** | $0.09 | $0.09-0.15 | 800ms | Enterprise features | Poor latency, requires coding |
| **Synthflow** | $0.08 | $0.08 | <400ms | All-inclusive, GPT-4 included | Subscription model |
| **SignalWire** | $0.16 | $0.16-0.17 | Low | Enterprise-grade, includes everything | Higher cost |

**Verdict:** All-in-one platforms are convenient but expensive ($0.07-0.16/min). None meet the $0.03/min target.

### Self-Hosted / DIY Stack (Recommended)

Building your own stack with best-in-class components:

| Component | Provider | Cost | Notes |
|-----------|----------|------|-------|
| **STT (Speech-to-Text)** | Deepgram Nova-3 | $0.0043/min | Best accuracy, lowest latency |
| **LLM** | GPT-4o-mini | ~$0.01-0.02/min | Fast, cheap, smart enough for calls |
| **TTS (Text-to-Speech)** | Cartesia Sonic | ~$0.005-0.01/min | Fast, natural, cheaper than ElevenLabs |
| **Telephony** | Telnyx | ~$0.01/min | SIP trunking, AU presence, low latency |
| **Orchestration** | Pipecat (self-hosted) | $0 | Open-source, Python |

**Total DIY Cost: ~$0.025-0.045/min** ✅ Meets target!

### Component Deep Dive

#### Speech-to-Text (STT)

| Provider | Cost/Min | Latency | Accuracy | Notes |
|----------|----------|---------|----------|-------|
| **Deepgram Nova-3** | $0.0043 | <300ms | 90%+ | Best value, streaming support |
| Whisper (OpenAI) | $0.006 | ~1s | 85-90% | Good but slower |
| AssemblyAI | $0.012 | ~500ms | 88% | More expensive |
| Google STT | $0.016 | ~400ms | 85% | Enterprise pricing |

**Winner: Deepgram Nova-3** - Best latency, accuracy, and price

#### Text-to-Speech (TTS)

| Provider | Cost/Char | ~Cost/Min | Latency | Quality | Notes |
|----------|-----------|-----------|---------|---------|-------|
| **Cartesia Sonic** | $0.000038 | ~$0.005 | <100ms | Excellent | Best for real-time |
| Deepgram Aura | $0.000003 | ~$0.003 | <150ms | Good | Cheapest option |
| ElevenLabs | $0.00010 | ~$0.10 | <200ms | Premium | Too expensive |
| OpenAI TTS | $0.000015 | ~$0.015 | ~300ms | Good | Mid-range |
| PlayHT | $0.000030 | ~$0.03 | <150ms | Good | Good alternative |

**Winner: Cartesia Sonic or Deepgram Aura** - Sub-$0.01/min with excellent quality

#### LLM for Conversation

| Provider | Input/1K | Output/1K | ~Cost/Min | Latency | Notes |
|----------|----------|-----------|-----------|---------|-------|
| **GPT-4o-mini** | $0.00015 | $0.0006 | ~$0.01-0.02 | <500ms | Best balance |
| Claude Haiku | $0.00025 | $0.00125 | ~$0.02-0.03 | <500ms | Good alternative |
| Groq Llama-3.1-8B | Free tier | Free tier | ~$0.001 | <100ms | Fastest, free tier available |
| Cerebras | $0.00010 | $0.00010 | ~$0.005 | <100ms | Ultra-fast inference |

**Winner: GPT-4o-mini** for quality, **Groq** for speed and cost

#### Telephony (SIP Trunking)

| Provider | Inbound/Min | Outbound/Min | AU Support | Notes |
|----------|-------------|--------------|------------|-------|
| **Telnyx** | $0.0085 | $0.013 | Sydney PoP | Best for AU, low latency |
| Twilio | $0.0085 | $0.013 | Yes | More expensive, widely used |
| Vonage | $0.0099 | $0.015 | Yes | Enterprise focused |
| Plivo | $0.0085 | $0.012 | Yes | Good alternative |

**Winner: Telnyx** - Sydney presence, 30% cheaper than Twilio

---

## Part 2: Recommended Architecture

### Option A: Ultra-Low Cost (~$0.025-0.03/min) ⭐ RECOMMENDED

```
┌─────────────────────────────────────────────────────────────────┐
│                        PHONE CALL                                │
│                    (Telnyx SIP Trunk)                           │
│                      ~$0.01/min                                 │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PIPECAT / LIVEKIT                            │
│              (Self-hosted on DigitalOcean)                      │
│                   ~$60/month droplet                            │
│                                                                 │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    │
│   │   Deepgram   │───▶│  Groq/GPT4o  │───▶│   Cartesia   │    │
│   │   Nova-3     │    │    mini      │    │    Sonic     │    │
│   │   STT        │    │    LLM       │    │    TTS       │    │
│   │ $0.0043/min  │    │  $0.01/min   │    │  $0.005/min  │    │
│   └──────────────┘    └──────────────┘    └──────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SUPABASE                                    │
│            (Call logs, transcripts, analytics)                   │
└─────────────────────────────────────────────────────────────────┘
```

**Total: ~$0.025-0.03/min + $60/month hosting**

### Option B: Managed Platform (~$0.07/min)

Use **Retell AI** for simplicity:
- No infrastructure to manage
- Built-in analytics
- Quick setup (hours vs days)
- Still competitive pricing

### Option C: Hybrid (Best of Both)

- Use **Retell AI** for initial MVP and testing
- Build **DIY stack** in parallel for production scale
- Switch to DIY when call volume justifies development cost

---

## Part 3: Dashboard Integration Plan

### Navigation Addition

Add to `dashboard/src/lib/business-config.ts`:

```typescript
// In the 'elevate' business navigation (most relevant for B2B outreach)
{ name: 'Voice AI', href: '/voice-ai', icon: Phone }

// Or in 'home' for global access
{ name: 'Voice AI', href: '/voice-ai', icon: Phone }
```

### Database Schema

```sql
-- voice_ai_campaigns
CREATE TABLE voice_ai_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('inbound', 'outbound')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  script_prompt TEXT,
  voice_id TEXT,
  phone_number TEXT,
  total_calls INTEGER DEFAULT 0,
  successful_calls INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- voice_ai_calls
CREATE TABLE voice_ai_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES voice_ai_campaigns(id),
  business TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  status TEXT DEFAULT 'pending',
  from_number TEXT,
  to_number TEXT,
  duration_seconds INTEGER,
  cost_cents DECIMAL(10,4),
  transcript TEXT,
  summary TEXT,
  sentiment TEXT,
  outcome TEXT,
  recording_url TEXT,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- voice_ai_contacts (for outbound campaigns)
CREATE TABLE voice_ai_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES voice_ai_campaigns(id),
  name TEXT,
  phone TEXT NOT NULL,
  company TEXT,
  email TEXT,
  status TEXT DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  last_call_id UUID REFERENCES voice_ai_calls(id),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- voice_ai_scripts (reusable conversation scripts)
CREATE TABLE voice_ai_scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  system_prompt TEXT NOT NULL,
  first_message TEXT,
  voice_id TEXT DEFAULT 'natural-female-1',
  language TEXT DEFAULT 'en-AU',
  is_template BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### API Routes Structure

```
dashboard/src/app/api/voice-ai/
├── campaigns/
│   ├── route.ts              # GET all, POST new campaign
│   └── [id]/
│       ├── route.ts          # GET, PUT, DELETE campaign
│       ├── start/route.ts    # POST start campaign
│       ├── pause/route.ts    # POST pause campaign
│       └── stats/route.ts    # GET campaign statistics
├── calls/
│   ├── route.ts              # GET all calls, POST manual call
│   └── [id]/
│       ├── route.ts          # GET call details
│       └── transcript/route.ts
├── scripts/
│   ├── route.ts              # GET, POST scripts
│   └── [id]/route.ts         # GET, PUT, DELETE script
├── contacts/
│   ├── route.ts              # GET, POST contacts
│   ├── import/route.ts       # POST bulk import
│   └── [id]/route.ts         # GET, PUT, DELETE contact
├── webhooks/
│   └── telnyx/route.ts       # Webhook handler for call events
├── config/route.ts           # GET/PUT voice AI configuration
└── stats/route.ts            # GET overall statistics
```

### Frontend Components

```
dashboard/src/app/(dashboard)/[business]/voice-ai/
├── page.tsx                  # Main Voice AI dashboard
├── campaigns/
│   ├── page.tsx              # Campaign list
│   └── [id]/page.tsx         # Campaign detail
├── calls/
│   ├── page.tsx              # Call history
│   └── [id]/page.tsx         # Call detail with transcript
├── scripts/page.tsx          # Script management
└── settings/page.tsx         # Voice AI settings

dashboard/src/components/voice-ai/
├── CampaignCard.tsx          # Campaign summary card
├── CallLogTable.tsx          # Calls list table
├── CallDetailDrawer.tsx      # Call detail slide-out
├── TranscriptViewer.tsx      # Transcript display
├── ScriptEditor.tsx          # Script/prompt editor
├── VoiceSelector.tsx         # Voice selection dropdown
├── PhoneNumberInput.tsx      # Phone number formatting
├── CampaignStats.tsx         # Campaign analytics
├── LiveCallMonitor.tsx       # Real-time call monitoring
└── CostEstimator.tsx         # Cost calculator widget
```

---

## Part 4: Step-by-Step Implementation Guide

### Phase 1: Foundation (Day 1-2)

#### Step 1.1: Create Database Tables
```bash
# Run migration on Supabase
# Location: supabase/migrations/voice_ai_tables.sql
```

#### Step 1.2: Add Navigation Entry
Edit `dashboard/src/lib/business-config.ts`:
```typescript
import { Phone } from 'lucide-react'

// Add to elevate navigation (or home for global)
{ name: 'Voice AI', href: '/voice-ai', icon: Phone }
```

#### Step 1.3: Create Basic Page Structure
```bash
# Create directories
mkdir -p dashboard/src/app/\(dashboard\)/\[business\]/voice-ai
mkdir -p dashboard/src/components/voice-ai
mkdir -p dashboard/src/app/api/voice-ai
```

### Phase 2: Provider Setup (Day 2-3)

#### Step 2.1: Telnyx Account Setup
1. Sign up at https://telnyx.com
2. Purchase Australian phone number (+61)
3. Configure SIP trunk
4. Set up webhook URL: `https://ops.growthcohq.com/api/voice-ai/webhooks/telnyx`
5. Store credentials in Supabase vault:
   ```bash
   node creds.js set global telnyx_api_key <key>
   node creds.js set global telnyx_phone_number <number>
   ```

#### Step 2.2: Deepgram Setup
1. Sign up at https://deepgram.com
2. Get API key ($200 free credits included)
3. Enable Nova-3 model
4. Store credentials:
   ```bash
   node creds.js set global deepgram_api_key <key>
   ```

#### Step 2.3: LLM Setup (Choose One)
**Option A: OpenAI GPT-4o-mini**
```bash
node creds.js set global openai_api_key <key>
```

**Option B: Groq (Fastest, has free tier)**
```bash
node creds.js set global groq_api_key <key>
```

#### Step 2.4: TTS Setup (Choose One)
**Option A: Cartesia Sonic (Best quality/cost)**
```bash
node creds.js set global cartesia_api_key <key>
```

**Option B: Deepgram Aura (Cheapest)**
- Use same Deepgram API key

### Phase 3: Backend Implementation (Day 3-5)

#### Step 3.1: Core Voice AI Service
Create `dashboard/src/lib/voice-ai/`:
```
voice-ai/
├── index.ts              # Main exports
├── telnyx.ts             # Telnyx SIP integration
├── deepgram.ts           # STT service
├── llm.ts                # LLM service (OpenAI/Groq)
├── tts.ts                # TTS service (Cartesia/Deepgram)
├── call-handler.ts       # Call orchestration
├── transcript.ts         # Transcript processing
└── types.ts              # TypeScript types
```

#### Step 3.2: Implement API Routes
Priority order:
1. `/api/voice-ai/config` - Configuration management
2. `/api/voice-ai/webhooks/telnyx` - Handle incoming calls
3. `/api/voice-ai/calls` - Call CRUD operations
4. `/api/voice-ai/campaigns` - Campaign management
5. `/api/voice-ai/scripts` - Script management

#### Step 3.3: Real-Time Call Handling
For lowest latency, use WebSocket connection:
```typescript
// Telnyx -> Webhook -> STT (Deepgram streaming) -> LLM -> TTS -> Telnyx
```

### Phase 4: Frontend Implementation (Day 5-7)

#### Step 4.1: Main Dashboard Page
```tsx
// dashboard/src/app/(dashboard)/[business]/voice-ai/page.tsx
// - Overview stats (calls today, cost, success rate)
// - Recent calls table
// - Active campaigns
// - Quick actions (new call, new campaign)
```

#### Step 4.2: Campaign Management
```tsx
// Campaigns list with:
// - Status filter (active, paused, draft)
// - Quick stats per campaign
// - Start/pause buttons
// - Edit campaign modal
```

#### Step 4.3: Call History & Detail
```tsx
// Call history table with:
// - Direction (in/out icons)
// - Duration
// - Cost
// - Outcome
// - Click to expand transcript
```

#### Step 4.4: Script Editor
```tsx
// Script editor with:
// - System prompt textarea
// - First message input
// - Voice selector dropdown
// - Test call button
```

### Phase 5: Testing & Optimization (Day 7-8)

#### Step 5.1: Test Calls
1. Make test inbound call
2. Make test outbound call
3. Verify transcript accuracy
4. Check latency (<500ms)
5. Validate cost tracking

#### Step 5.2: Optimize Latency
- Enable Deepgram streaming STT
- Use Groq for faster LLM inference
- Pre-warm TTS connections
- Use Telnyx Sydney PoP for AU calls

#### Step 5.3: Cost Monitoring
- Implement real-time cost tracking
- Set up alerts for unusual spending
- Create daily cost reports

---

## Part 5: Voice Quality & Latency Optimization

### Voice Quality Checklist

1. **Use High-Quality TTS**
   - Cartesia Sonic: Natural prosody, emotional range
   - ElevenLabs: Premium but expensive (fallback for VIP calls)

2. **Audio Settings**
   - Sample rate: 16kHz minimum, 24kHz preferred
   - Codec: Opus or PCMU for best quality
   - Enable noise cancellation

3. **Script Quality**
   - Use natural language, avoid robotic phrases
   - Include appropriate pauses
   - Handle interruptions gracefully

### Latency Optimization

| Component | Target | How to Achieve |
|-----------|--------|----------------|
| Network | <50ms | Use Telnyx Sydney PoP |
| STT | <300ms | Deepgram streaming mode |
| LLM | <200ms | Groq or GPT-4o-mini |
| TTS | <100ms | Cartesia Sonic streaming |
| **Total** | **<650ms** | All components optimized |

### Architecture for Low Latency

```
User speaks → [50ms] → Telnyx → [10ms] →
Deepgram streaming → [300ms] → Partial transcript →
LLM (start generating before user finishes) → [200ms] →
Cartesia streaming → [100ms] → Audio chunks →
Telnyx → [50ms] → User hears response

Total: ~500-700ms end-to-end
```

---

## Part 6: Cost Analysis & Projections

### Per-Call Cost Breakdown (5-minute average call)

| Component | Rate | 5-min Cost |
|-----------|------|------------|
| Telnyx (telephony) | $0.013/min | $0.065 |
| Deepgram (STT) | $0.0043/min | $0.022 |
| GPT-4o-mini (LLM) | ~$0.015/min | $0.075 |
| Cartesia (TTS) | ~$0.005/min | $0.025 |
| **Total** | **~$0.037/min** | **$0.187** |

### Monthly Cost Projections

| Volume | Calls/Month | Minutes | Monthly Cost |
|--------|-------------|---------|--------------|
| Low | 100 | 500 | $18.50 |
| Medium | 500 | 2,500 | $92.50 |
| High | 2,000 | 10,000 | $370 |
| Enterprise | 10,000 | 50,000 | $1,850 |

**Plus hosting:** ~$60/month for DigitalOcean droplet

### Cost Comparison vs Managed Platforms

| Scenario | DIY ($0.037/min) | Retell ($0.07/min) | Vapi ($0.10/min) |
|----------|------------------|---------------------|-------------------|
| 500 min/month | $18.50 | $35 | $50 |
| 2,500 min/month | $92.50 | $175 | $250 |
| 10,000 min/month | $370 | $700 | $1,000 |

**Savings: 47-63% compared to managed platforms**

---

## Part 7: Use Cases by Business

### Elevate Wholesale (B2B Outreach) - Priority 1

**Outbound Campaigns:**
- Cold call new leads from Apify scrapes
- Follow up on trial accounts
- Re-engage dormant wholesale customers
- Appointment setting for sales calls

**Script Example:**
```
"Hi, this is Emma from Elevate Wholesale. I'm calling because I noticed
you recently signed up for a trial account. I wanted to check in and
see if you had any questions about our wholesale organic products.
Do you have a moment to chat?"
```

### Buy Organics Online (Customer Service) - Priority 2

**Inbound Support:**
- Order status inquiries
- Product availability
- Return/refund requests
- General questions

**Outbound:**
- Order confirmation calls
- Delivery delay notifications
- Back-in-stock notifications

### Teelixir (High-Touch Sales) - Priority 3

**Outbound:**
- Follow up on large orders
- VIP customer outreach
- Distributor relationship calls

---

## Part 8: File Structure Summary

```
master-ops/
├── dashboard/
│   ├── src/
│   │   ├── app/
│   │   │   ├── (dashboard)/
│   │   │   │   └── [business]/
│   │   │   │       └── voice-ai/
│   │   │   │           ├── page.tsx           # Main dashboard
│   │   │   │           ├── campaigns/
│   │   │   │           │   └── page.tsx
│   │   │   │           ├── calls/
│   │   │   │           │   └── page.tsx
│   │   │   │           ├── scripts/
│   │   │   │           │   └── page.tsx
│   │   │   │           └── settings/
│   │   │   │               └── page.tsx
│   │   │   └── api/
│   │   │       └── voice-ai/
│   │   │           ├── campaigns/
│   │   │           ├── calls/
│   │   │           ├── scripts/
│   │   │           ├── contacts/
│   │   │           ├── webhooks/
│   │   │           ├── config/
│   │   │           └── stats/
│   │   ├── components/
│   │   │   └── voice-ai/
│   │   │       ├── CampaignCard.tsx
│   │   │       ├── CallLogTable.tsx
│   │   │       ├── TranscriptViewer.tsx
│   │   │       └── ...
│   │   └── lib/
│   │       └── voice-ai/
│   │           ├── index.ts
│   │           ├── telnyx.ts
│   │           ├── deepgram.ts
│   │           ├── llm.ts
│   │           ├── tts.ts
│   │           └── types.ts
│   └── ...
├── supabase/
│   └── migrations/
│       └── YYYYMMDD_voice_ai_tables.sql
└── VOICE-AI-IMPLEMENTATION-PLAN.md   # This document
```

---

## Part 9: Quick Start Checklist (Ultra-Low Latency Focus)

### 🎯 OPTION A: Fastest Setup - Telnyx Voice AI Agents (Recommended)

**Total Time: 2-4 hours to first call**

#### Step 1: Telnyx Account Setup (30 min)
- [ ] Sign up at https://telnyx.com
- [ ] Verify identity (required for AU numbers)
- [ ] Navigate to **Voice AI Agents** section
- [ ] Request access to Sydney GPU infrastructure
- [ ] Purchase Australian phone number (+61)
  - Local: 1300 number (~$10/month)
  - Or mobile: +61 4xx (~$5/month)

#### Step 2: Configure Voice AI Agent (30 min)
- [ ] Create new Voice AI Agent in Telnyx portal
- [ ] Select **Sydney** as the region (critical for latency!)
- [ ] Configure:
  - System prompt (what the AI should do)
  - First message (greeting)
  - Voice selection
  - Call handling rules

#### Step 3: Test Inbound Call (15 min)
- [ ] Call your Telnyx number from mobile
- [ ] Verify <200ms latency (should feel instant)
- [ ] Test conversation flow
- [ ] Check transcript in Telnyx dashboard

#### Step 4: Dashboard Integration (2-3 hours)
- [ ] Store Telnyx API key: `node creds.js set global telnyx_api_key <key>`
- [ ] Create database tables (see schema below)
- [ ] Add Voice AI navigation to dashboard
- [ ] Create webhook endpoint for call events
- [ ] Build basic UI for call logs

---

### 🔧 OPTION B: OpenAI Realtime API (Alternative)

**Total Time: 3-5 hours to first call**

#### Step 1: OpenAI Setup (15 min)
- [ ] Ensure you have OpenAI API access
- [ ] Enable Realtime API (may require waitlist)
- [ ] Note: ~250-350ms latency from Melbourne (acceptable)

#### Step 2: Telephony Setup (30 min)
- [ ] Sign up for Telnyx (for phone numbers only)
- [ ] Or use Twilio for SIP trunking
- [ ] Configure SIP trunk to your server

#### Step 3: Build WebSocket Bridge (2-3 hours)
- [ ] Create server to bridge Telnyx SIP ↔ OpenAI WebSocket
- [ ] Use LiveKit or Pipecat for orchestration
- [ ] Deploy to DigitalOcean Sydney for lowest latency

---

### 📋 Credential Storage

```bash
# Telnyx (required)
node creds.js set global telnyx_api_key <your-telnyx-api-key>
node creds.js set global telnyx_phone_number +61xxxxxxxxx

# OpenAI Realtime (if using Option B)
node creds.js set global openai_api_key <your-openai-key>

# Optional: Deepgram for custom STT
node creds.js set global deepgram_api_key <your-deepgram-key>
```

---

### 🗄️ Database Setup (Quick Version)

Run this migration:

```sql
-- Minimal tables for MVP
CREATE TABLE voice_ai_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business TEXT NOT NULL DEFAULT 'elevate',
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  status TEXT DEFAULT 'completed',
  from_number TEXT,
  to_number TEXT,
  duration_seconds INTEGER,
  cost_cents DECIMAL(10,4),
  transcript TEXT,
  summary TEXT,
  outcome TEXT,
  telnyx_call_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_voice_calls_business ON voice_ai_calls(business);
CREATE INDEX idx_voice_calls_created ON voice_ai_calls(created_at DESC);
```

---

### 🖥️ Dashboard Navigation Update

Add to `dashboard/src/lib/business-config.ts`:

```typescript
import { Phone } from 'lucide-react'

// Add to elevate navigation (line ~132)
{ name: 'Voice AI', href: '/voice-ai', icon: Phone }

// Or add to home navigation for global access (line ~56)
{ name: 'Voice AI', href: '/voice-ai', icon: Phone }
```

---

### 📞 Test Your First Call

Once Telnyx is configured:

1. **Call your Telnyx number** from your mobile
2. **Listen for response** - should be <1 second
3. **Have a conversation** - test the AI's responses
4. **Check the transcript** in Telnyx dashboard
5. **Verify webhook** receives call data

Expected latency from Melbourne:
- **Telnyx Sydney:** ~150-200ms (feels instant)
- **OpenAI Realtime:** ~250-350ms (slight delay, acceptable)
- **Retell/Vapi:** ~500-800ms (noticeable lag)

---

## Part 10: Resources & References

### Provider Documentation
- [Telnyx Voice API](https://telnyx.com/docs/voice)
- [Deepgram Documentation](https://developers.deepgram.com/)
- [Cartesia Sonic API](https://docs.cartesia.ai/)
- [OpenAI API](https://platform.openai.com/docs)
- [Groq API](https://console.groq.com/docs)

### Open Source Frameworks
- [Pipecat](https://github.com/pipecat-ai/pipecat) - Python voice AI framework
- [LiveKit Agents](https://github.com/livekit/agents) - Real-time voice agents

### Cost Calculators
- [Compare Voice AI](https://comparevoiceai.com/)
- [Softcery Calculator](https://softcery.com/ai-voice-agents-calculator)
- [RaftLabs Calculator](https://www.raftlabs.com/voice-ai-calculator/)

### Research Sources
- [Best AI Voice Agents 2025](https://getvoip.com/blog/ai-voice-agents/)
- [Retell vs Vapi Comparison](https://www.retellai.com/blog/retell-vs-vapi)
- [Voice AI Cost Analysis](https://dev.to/cloudx/how-much-does-it-really-cost-to-run-a-voice-ai-agent-at-scale-8en)
- [Telnyx Australia](https://telnyx.com/australia)
- [Telnyx Sydney GPU Deployment](https://telnyx.com/resources/sydney-gpu-deployment)
- [Deepgram Pricing](https://deepgram.com/pricing)
- [OpenAI Realtime API](https://openai.com/index/introducing-the-realtime-api/)
- [Moshi by Kyutai](https://github.com/kyutai-labs/moshi)

---

## Conclusion (Updated for Ultra-Low Latency)

### Primary Recommendation: Telnyx Voice AI (Sydney)

For Melbourne-based operations requiring **human-like conversation speed**:

| Metric | Target | Telnyx Sydney |
|--------|--------|---------------|
| **Latency** | <200ms | ✅ <200ms RTT |
| **Cost** | <$0.10/min | ✅ ~$0.05-0.08/min |
| **Voice Quality** | Natural | ✅ High quality |
| **Setup Time** | Same day | ✅ 2-4 hours |

**Why Telnyx wins for Australia:**
1. **GPUs co-located in Sydney** - No cross-Pacific latency
2. **Full-stack solution** - No stitching together providers
3. **Sub-200ms RTT** - Matches human conversation speed
4. **Licensed AU carrier** - Compliant, reliable numbers
5. **Competitive pricing** - ~$0.05-0.08/min bundled

### Alternative: OpenAI Realtime API

For simpler setup with slightly higher latency (~250-350ms from Melbourne):
- Single model handles STT + LLM + TTS
- ~$0.08-0.12/min
- Excellent voice quality and emotional range

### Future Option: Self-Hosted Moshi

For maximum control and lowest latency (<160ms):
- Open-source speech-to-speech model
- Requires GPU hosting (~$300-500/month)
- Can deploy on Sydney infrastructure

---

## Quick Decision Matrix

| If you want... | Choose |
|----------------|--------|
| **Fastest setup + lowest latency** | Telnyx Voice AI (Sydney) |
| **Simplest integration** | OpenAI Realtime API |
| **Cheapest at scale** | DIY Stack (Deepgram + Groq + Cartesia) |
| **Maximum control** | Self-hosted Moshi |

---

**Next Step:** Sign up for Telnyx, request Sydney region access, and make your first test call today. The dashboard integration can follow once the core voice system is proven.
