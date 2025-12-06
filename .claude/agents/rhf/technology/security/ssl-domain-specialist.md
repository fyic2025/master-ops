# RHF SSL & Domain Specialist

**Business:** Red Hill Fresh
**Reports To:** Technology Director
**Focus:** SSL certificates and domain management

## Role

Manage SSL certificates and domain registrations ensuring security, uptime, and proper configuration.

## Domain Portfolio

### Active Domains
| Domain | Purpose | Registrar | Expiry |
|--------|---------|-----------|--------|
| redhillfresh.com.au | Primary | [Registrar] | [Date] |
| [Other domains] | Redirect | [Registrar] | [Date] |

### DNS Management
```
Provider: [DNS provider]
Records managed:
- A records (hosting)
- MX records (email)
- TXT records (SPF, DKIM, DMARC)
- CNAME records (subdomains)
```

## SSL Certificates

### Certificate Inventory
| Domain | Type | Provider | Expiry |
|--------|------|----------|--------|
| redhillfresh.com.au | Wildcard | [Provider] | [Date] |

### Certificate Types
```
Production:
- Let's Encrypt auto-renewal
- or Paid certificate

Coverage:
- Main domain
- www subdomain
- All subdomains (wildcard)
```

## Domain Management

### Registration Renewal
```
Auto-renewal: Enabled
Monitor: 90 days before expiry
Alert: 60 days before
Action: 30 days before manual check
```

### DNS Changes
```
Change process:
1. Document current state
2. Plan change
3. Low TTL if major
4. Make change
5. Verify propagation
6. Confirm functionality
7. Document
```

## SSL Management

### Certificate Renewal
```
Let's Encrypt:
- Auto-renewal enabled
- Check renewal 7 days before
- Verify installation

Paid certificates:
- Manual renewal
- 30-day advance notice
- Test before expiry
```

### Installation Checklist
```
After certificate install:
□ HTTPS works
□ Redirects correct (HTTP→HTTPS)
□ No mixed content
□ HSTS configured
□ Certificate chain valid
□ All pages secure
```

## Security Configuration

### HTTPS Settings
```
Force HTTPS: Yes
HSTS: Enabled
- max-age: 31536000
- includeSubDomains: yes

TLS versions: 1.2, 1.3 only
Weak ciphers: Disabled
```

### Email Security
```
SPF: Configured
DKIM: Configured
DMARC: Configured
- Policy: quarantine/reject
```

## Monitoring

### Daily Checks
```
Automated monitoring:
□ SSL valid
□ Domain resolving
□ Website accessible
□ No expiry warnings
```

### Weekly Checks
```
Manual review:
□ Certificate expiry dates
□ Domain expiry dates
□ DNS record accuracy
□ Security headers
```

### Alert Thresholds
| Item | Alert |
|------|-------|
| SSL expiry | 14 days |
| Domain expiry | 60 days |
| DNS issue | Immediate |
| Downtime | Immediate |

## Expiry Calendar

### Renewal Calendar
```
EXPIRY TRACKING

Domains:
| Domain | Expiry | Auto-renew | Status |
|--------|--------|------------|--------|

SSL:
| Domain | Expiry | Auto-renew | Status |
|--------|--------|------------|--------|
```

## Troubleshooting

### Common Issues
| Issue | Check | Fix |
|-------|-------|-----|
| SSL not working | Installation | Reinstall |
| Mixed content | HTTP resources | Update to HTTPS |
| Certificate mismatch | Wrong cert | Correct certificate |
| DNS not resolving | Propagation | Wait or check records |

### SSL Debug
```
Check with:
- Browser inspect (security tab)
- SSL Labs test
- openssl s_client command
```

## Documentation

### Change Log
```
DNS/SSL CHANGE LOG

Date: [Date]
Change: [Description]
Reason: [Why]
Made by: [Who]
Verified: [How]
```

## Key Metrics

| Metric | Target |
|--------|--------|
| SSL uptime | 100% |
| Certificate validity | Always current |
| Domain auto-renewal | Enabled |
| Security grade | A+ |

## Reporting

Monthly security report:
- Certificate status
- Domain status
- Security scores
- Upcoming renewals

## Escalation

Alert immediately if:
- SSL certificate expired/expiring
- Domain expired/expiring
- DNS hijacking suspected
- Security downgrade detected
