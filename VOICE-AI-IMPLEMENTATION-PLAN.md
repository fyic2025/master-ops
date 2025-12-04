# Voice AI Integration Plan

**Created:** 2024-12-04
**Status:** Planning
**Target:** Dashboard integration with Voice AI tab

---

## Executive Summary

This document outlines a step-by-step implementation plan for integrating Voice AI capabilities into the master-ops dashboard. The focus is on:
- **Lowest cost** (~$0.03/minute target vs industry standard $0.10/minute)
- **Lowest latency** (<500ms response time)
- **Highest quality** (natural-sounding voices)
- **Both inbound and outbound** call capabilities

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

## Part 9: Quick Start Checklist

### Tomorrow's Implementation Steps

- [ ] **Hour 1-2:** Sign up for accounts
  - [ ] Telnyx (get API key, buy AU number)
  - [ ] Deepgram (get API key, $200 free credit)
  - [ ] Cartesia (get API key) OR use Deepgram Aura
  - [ ] OpenAI (if not already have) OR Groq (free tier)

- [ ] **Hour 2-3:** Store credentials
  - [ ] `node creds.js set global telnyx_api_key <key>`
  - [ ] `node creds.js set global deepgram_api_key <key>`
  - [ ] `node creds.js set global cartesia_api_key <key>`
  - [ ] `node creds.js set global groq_api_key <key>`

- [ ] **Hour 3-4:** Database setup
  - [ ] Run voice_ai_tables.sql migration
  - [ ] Verify tables created

- [ ] **Hour 4-6:** Add navigation & page structure
  - [ ] Add Voice AI to business-config.ts
  - [ ] Create voice-ai page directory
  - [ ] Create basic page.tsx with placeholder UI

- [ ] **Hour 6-8:** First API route
  - [ ] Create `/api/voice-ai/config/route.ts`
  - [ ] Create `/api/voice-ai/webhooks/telnyx/route.ts`
  - [ ] Test webhook receives data

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
- [Deepgram Pricing](https://deepgram.com/pricing)

---

## Conclusion

The recommended approach achieves the target of **~$0.03/minute** through:

1. **Deepgram Nova-3** for STT ($0.0043/min) - Industry-leading accuracy and speed
2. **Groq or GPT-4o-mini** for LLM (~$0.01-0.02/min) - Fast, affordable inference
3. **Cartesia Sonic** for TTS (~$0.005/min) - Natural voices at low cost
4. **Telnyx** for telephony (~$0.01/min) - Sydney PoP for low AU latency
5. **Pipecat** for orchestration ($0) - Open-source, flexible

This is **47-63% cheaper** than managed platforms while maintaining:
- **<500ms latency** (natural conversation feel)
- **High voice quality** (Cartesia's natural TTS)
- **Full control** over the experience

The dashboard integration follows the same patterns as AWS Migration, making it familiar and consistent with the existing UI.
