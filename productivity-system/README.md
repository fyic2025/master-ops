# Productivity System - Business OS Department

> **Strategic execution engine ensuring daily work drives business growth through ACRA framework alignment**

## Quick Start

### Morning Ritual (5 minutes)
1. Review yesterday's log (if exists)
2. Run daily planning: Use `plan-day` skill
3. Execute top 3 ACRA-aligned tasks

### Evening Ritual (5 minutes)
1. Run end-of-day assessment: Use `assess-day` skill
2. Log results automatically saved
3. Review tomorrow's course correction

### Weekly Review (15 minutes)
1. Run pattern analysis: Use `view-patterns` skill
2. Check for 3+ day anti-patterns
3. Strategic realignment if needed

## Skills Available

| Skill | Purpose | When to Use |
|-------|---------|-------------|
| `plan-day` | Brutal prioritization with ACRA framework | Every morning before work starts |
| `assess-day` | Honest productivity audit + logging | Every evening before shutdown |
| `view-patterns` | Multi-day trend analysis | Weekly review or when feeling drift |
| `acra-check` | Quick alignment validation | Before starting any task |

## System Architecture

```
productivity-system/
├── CLAUDE.md              # System definition & workflows
├── README.md              # This file (quick reference)
├── skills/
│   ├── plan-day.md        # Morning planning skill
│   ├── assess-day.md      # Evening assessment skill
│   ├── view-patterns.md   # Pattern analysis skill
│   └── acra-check.md      # Quick ACRA check skill
└── logs/
    ├── README.md          # Logging documentation
    ├── TEMPLATE.md        # Daily log template
    └── YYYY-MM-DD.md      # Daily logs (auto-created)
```

## ACRA Framework (Core Concept)

Every task must serve one of these purposes:

| Category | Purpose | Examples |
|----------|---------|----------|
| **Attract** | Bring new customers | Ads, content, lead gen, SEO |
| **Convert** | Turn prospects into buyers | Sales, checkout optimization, offers |
| **Retain** | Keep customers active | Delivery, service, engagement campaigns |
| **Ascend** | Increase customer value | Upsells, cross-sells, premium tiers |

**If a task doesn't fit ACRA** → It's either:
- Infrastructure (tool building, optimization)
- Time sink (busy work, avoidance)
- Strategic drift (urgent but not important)

## Anti-Patterns Detected

### 🔴 Infrastructure Theater
**Symptoms**: Building tools instead of using existing ones, premature optimization, "perfect system" syndrome

**Detection**: >20% time on infrastructure, no customer-facing work

**Fix**: Kill infrastructure projects, use "good enough" tools, ship over perfect

### 🔴 Strategic Drift
**Symptoms**: Urgency trumping importance, reactive mode, no ACRA work

**Detection**: ACRA score <5 for 2+ days, planned vs actual misalignment

**Fix**: Force 100% ACRA work tomorrow, identify real blocker

### 🔴 Time Sink Spiral
**Symptoms**: Email, meetings, admin creep, context switching

**Detection**: Time sinks >15%, multiple businesses daily

**Fix**: Time-box admin to 30min, single-business focus days

## Business Context (Your Setup)

### RedHillFresh.com.au
- **Operational Days**: Thursday-Friday (delivery operations)
- **ACRA Focus**: Retain (fulfill orders), Attract (grow customer base)
- **Goal**: Autonomous operations requiring minimal intervention

### AI Automation Projects
- **Strategic Days**: Monday-Wednesday
- **ACRA Focus**: Attract (demos, content), Convert (productize services)
- **Goal**: Build systems that attract and convert autonomously

### Pattern to Watch
**Business Context Switching**: If changing business focus daily → Red flag
**Optimal**: Dedicated business focus blocks (multi-day sprints)

## Success Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Daily ACRA alignment score | >7/10 | Track via logs |
| Strategic work time | >50% | Track via logs |
| Infrastructure work time | <20% | Track via logs |
| 3+ day anti-pattern alerts | 0 | Check via `view-patterns` |
| Week-over-week time sink reduction | -5% | Weekly review |

## Workflows

### Daily Planning Workflow
```mermaid
Morning → Review Yesterday's Log → Detect Patterns →
Brutal Prioritization → Top 3 ACRA Tasks → Execute
```

### Daily Assessment Workflow
```mermaid
Evening → List Actual Work → Calculate Time Breakdown →
ACRA Scoring → Pattern Detection → Log Creation →
Tomorrow's Course Correction
```

### Weekly Review Workflow
```mermaid
Week End → Load 7 Days of Logs → Trend Analysis →
Pattern Frequency Check → Red Alert Detection →
Strategic Recommendations → Realignment
```

## Integration with Business OS

### Inputs from Other Departments
- **Strategic Planning**: Quarterly goals inform ACRA priorities
- **Project Management**: Active projects feed into daily planning
- **Finance**: Revenue targets validate ACRA alignment

### Outputs to Other Departments
- **Time Tracking**: Daily logs provide time allocation data
- **Strategic Planning**: Pattern detection informs strategy pivots
- **Operations**: Operational vs strategic balance metrics

## Best Practices

### DO
- ✅ Run morning planning EVERY day
- ✅ Log end-of-day EVERY day
- ✅ Be brutally honest in assessments
- ✅ Kill infrastructure theater immediately
- ✅ Focus on single business per day
- ✅ Ship over perfect

### DON'T
- ❌ Skip logging (breaks pattern detection)
- ❌ Inflate ACRA scores (defeats purpose)
- ❌ Build tools without customer impact
- ❌ Research without execution deadline
- ❌ Switch businesses mid-day
- ❌ Optimize before shipping

## Troubleshooting

### "I keep scoring low on ACRA alignment"
→ Run `acra-check` before starting any task
→ Kill all non-ACRA work from todo list
→ Force tomorrow to be 100% Attract or Convert work

### "I see same pattern 3+ days in a row"
→ This is RED ALERT - emergency intervention needed
→ Stop current work immediately
→ Identify root cause (avoidance? unclear priorities?)
→ Force opposite behavior tomorrow

### "I don't have time for daily logging"
→ Logging takes 5 minutes and saves hours of drift
→ Pattern: Saying "no time" = Already drifting
→ Fix: 5min morning + 5min evening is non-negotiable

### "Infrastructure work IS important"
→ True, but only if it unblocks ACRA work TODAY
→ Test: "If I don't do this, will customer notice?"
→ If answer is "no" → It can wait until you're growing

## Next Steps

1. **Today**: Run `plan-day` skill for your first daily plan
2. **Tonight**: Run `assess-day` skill to create first log
3. **In 7 days**: Run `view-patterns` skill for first trend analysis
4. **Adjust**: Let system reveal your patterns, then optimize

## Support

- Full documentation: [CLAUDE.md](CLAUDE.md)
- Logging details: [logs/README.md](logs/README.md)
- Template reference: [logs/TEMPLATE.md](logs/TEMPLATE.md)

---

**Remember**: This system's job is to keep you honest and aligned with business growth. Trust the brutal feedback.
