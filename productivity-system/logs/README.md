# Productivity System Logs

## Purpose
Track daily work across all projects to detect patterns, measure ACRA alignment, and prevent strategic drift.

## Log Structure

Each day gets a file: `YYYY-MM-DD.md`

### Daily Log Template
```markdown
# Daily Log - [Date]

## Business Context
- Primary Focus: [RedHillFresh | AI Automation | Other]
- Day Type: [Operational | Strategic | Mixed]

## Planned (Morning)
- [ ] Task 1
- [ ] Task 2
- [ ] Task 3

## Completed (Actual)
- [✓] Activity 1 - [Time: Xh] - [Business: Name]
- [✓] Activity 2 - [Time: Xh] - [Business: Name]

## Time Breakdown
| Category | Hours | Percentage |
|----------|-------|------------|
| Strategic (ACRA) | X.Xh | XX% |
| Operational | X.Xh | XX% |
| Infrastructure | X.Xh | XX% |
| Time Sinks | X.Xh | XX% |
| **TOTAL** | **8.0h** | **100%** |

## ACRA Alignment

**Score**: X/10

### By Category
- **Attract** (New Customers): [Activities or None]
- **Convert** (Prospects → Buyers): [Activities or None]
- **Retain** (Customer Activity): [Activities or None]
- **Ascend** (Increase Value): [Activities or None]

## Pattern Analysis

**Detected**: [Pattern Name]
- Status: 🟢 On Track | 🟡 Warning | 🔴 Critical
- Description: [What's happening]
- Trend: [1st day | 2nd day | 3+ days]

### Specific Patterns
- [ ] Infrastructure Theater
- [ ] Strategic Drift
- [ ] Time Sink Spiral
- [ ] Context Switching
- [ ] Avoidance Behavior

## Wins
- [Real business impact achieved]

## Losses
- [Time wasted or strategic drift]

## Tomorrow's Course Correction
➡️ [Specific action to improve ACRA alignment]

## Notes
[Additional context, blockers, insights]
```

## Pattern Tracking

### Infrastructure Theater
**Symptoms**: Building tools, researching best practices, optimizing systems
**Instead of**: Using existing tools, executing with "good enough", shipping
**Track**: Days in a row, total hours spent

### Strategic Drift
**Symptoms**: Urgent tasks trumping important, reactive mode, no customer work
**Instead of**: Planned ACRA-aligned work, proactive execution
**Track**: ACRA alignment score trend

### Time Sink Spiral
**Symptoms**: Email, meetings, admin, context switching
**Instead of**: Deep work blocks on strategic priorities
**Track**: Hours in time sinks category

## Weekly Rollup

Every Sunday or Monday, create: `YYYY-WXX-weekly.md`

Aggregate:
- Total time by category
- Average ACRA score
- Patterns detected (frequency)
- Strategic drift incidents
- Course corrections that worked

## Monthly Analysis

Every month end, create: `YYYY-MM-monthly.md`

Review:
- Pattern trends over 4 weeks
- ACRA category distribution
- Time allocation changes
- Strategic alignment progress
- System improvements needed

## File Naming Convention
- Daily: `2025-11-21.md`
- Weekly: `2025-W47-weekly.md`
- Monthly: `2025-11-monthly.md`

## Usage

### Create Today's Log
```bash
# The assess-day skill creates this automatically
```

### View Last 7 Days
```bash
powershell -Command "Get-ChildItem -Filter '*.md' | Where-Object {$_.Name -match '^\d{4}-\d{2}-\d{2}\.md$'} | Sort-Object Name -Descending | Select-Object -First 7"
```

### Search for Pattern
```bash
# Find all days with infrastructure theater
powershell -Command "Select-String -Path '*.md' -Pattern 'Infrastructure Theater'"
```

## Integration Points
- **Daily Planning**: Reads yesterday's log for pattern detection
- **End-of-Day**: Creates today's log
- **Weekly Review**: Aggregates 7 days of logs
- **Pattern Analysis**: Scans multiple logs for trends
