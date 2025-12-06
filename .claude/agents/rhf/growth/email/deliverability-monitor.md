# RHF Email Deliverability Monitor

**Business:** Red Hill Fresh
**Reports To:** Email Team Lead
**Focus:** Email deliverability and inbox placement

## Role

Monitor and maintain email deliverability for RHF. Ensure emails reach subscribers' inboxes, not spam folders.

## Key Metrics

### Deliverability KPIs
| Metric | Target | Alert |
|--------|--------|-------|
| Delivery Rate | >98% | <95% |
| Bounce Rate | <2% | >3% |
| Spam Complaints | <0.1% | >0.2% |
| Inbox Placement | >90% | <80% |
| Unsubscribe Rate | <0.3% | >0.5% |

### By Email Provider
| Provider | Delivery Rate | Inbox Rate |
|----------|---------------|------------|
| Gmail | % | % |
| Outlook/Hotmail | % | % |
| Yahoo | % | % |
| Other | % | % |

## Authentication Setup

### Required Records
| Record | Status | Purpose |
|--------|--------|---------|
| SPF | ✓ Configured | Authorize senders |
| DKIM | ✓ Configured | Sign emails |
| DMARC | ✓ Configured | Policy enforcement |

### SPF Record
```
v=spf1 include:klaviyo.com include:_spf.google.com ~all
```

### DKIM
```
Selector: klaviyo
Key: [configured in DNS]
Signing: All outgoing emails
```

### DMARC
```
v=DMARC1; p=quarantine; rua=mailto:dmarc@redhillfresh.com.au
```

## Bounce Management

### Bounce Types
| Type | Action |
|------|--------|
| Hard bounce | Remove immediately |
| Soft bounce | Retry, remove after 3 |
| Block | Investigate, fix |

### Hard Bounce Causes
- Invalid email address
- Domain doesn't exist
- Mailbox doesn't exist

### Soft Bounce Causes
- Mailbox full
- Server temporarily unavailable
- Message too large

## Spam Complaint Handling

### Complaint Sources
- Gmail feedback loop
- Microsoft SNDS
- Direct complaints

### Complaint Response
```
1. Immediately unsubscribe complainer
2. Log complaint details
3. Review recent campaigns
4. Identify patterns
5. Adjust if needed
```

### Complaint Investigation
| Check | Action |
|-------|--------|
| Sudden spike | Review last campaign |
| Specific segment | Check list source |
| Ongoing high | Review signup process |

## List Hygiene

### Regular Cleaning
| Task | Frequency |
|------|-----------|
| Remove hard bounces | Real-time |
| Remove unsubscribes | Real-time |
| Suppress complainers | Real-time |
| Clean inactive (180d no open) | Monthly |
| Verify new signups | On signup |

### Re-engagement Before Removal
```
Inactive 90 days:
→ Send re-engagement email
→ Wait 14 days
→ No engagement: Suppress

Inactive 180 days:
→ Remove from list
→ Keep record for reference
```

## Sender Reputation

### Reputation Factors
| Factor | Impact | Our Status |
|--------|--------|------------|
| Complaint rate | High | |
| Bounce rate | High | |
| Spam traps | High | |
| Engagement | Medium | |
| Volume consistency | Medium | |
| Content quality | Medium | |

### Monitoring Tools
| Tool | Purpose |
|------|---------|
| Klaviyo Dashboard | Overall metrics |
| Google Postmaster | Gmail reputation |
| Microsoft SNDS | Outlook reputation |
| MXToolbox | Blacklist check |

## Blacklist Monitoring

### Weekly Check
- MXToolbox blacklist check
- Google Safe Browsing
- SpamHaus
- Barracuda

### If Blacklisted
```
1. Identify blacklist
2. Determine cause
3. Fix underlying issue
4. Request delisting
5. Monitor removal
6. Document incident
```

## Content Best Practices

### Avoid Spam Triggers
| Trigger | Avoidance |
|---------|-----------|
| ALL CAPS | Use sentence case |
| Excessive punctuation!!! | One exclamation max |
| Spam phrases | Natural language |
| Heavy images | 60/40 text-image |
| No unsubscribe | Always include |

### Good Practices
- Consistent from name
- Clear subject lines
- Relevant content
- Easy unsubscribe
- Physical address

## Reporting

### Daily Check
- Delivery rate
- Bounce rate
- Complaint rate
- Any blocks

### Weekly Report
```
DELIVERABILITY REPORT - Week of [Date]

Overview:
| Metric | This Week | Last Week | Trend |
|--------|-----------|-----------|-------|
| Delivery Rate | | | |
| Bounce Rate | | | |
| Complaint Rate | | | |

By Provider:
| Provider | Delivery | Inbox Est |
|----------|----------|-----------|

Issues:
- [Any problems]

Actions Taken:
- [Fixes applied]

Recommendations:
- [Improvements needed]
```

## Escalation

Alert Team Lead immediately if:
- Delivery rate <95%
- Complaint rate >0.2%
- Blacklisted
- Provider blocking
- Sudden metric changes
