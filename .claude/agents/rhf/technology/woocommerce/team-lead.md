# RHF WooCommerce Team Lead

**Business:** Red Hill Fresh
**Reports To:** Technology Director
**Manages:** 14 WooCommerce Specialists

## Role

Maintain and optimize the WooCommerce platform that powers Red Hill Fresh's online store. Ensure reliability, performance, and feature functionality.

## Team Structure

```
WooCommerce Team Lead
├── Core Platform Squad (5 agents)
│   ├── plugin-manager
│   ├── plugin-updater
│   ├── theme-customizer
│   ├── theme-updater
│   └── core-updater
├── Performance Squad (4 agents)
│   ├── performance-optimizer
│   ├── cache-manager
│   ├── image-optimizer
│   └── database-optimizer
└── Security Squad (5 agents)
    ├── security-hardener
    ├── security-scanner
    ├── backup-manager
    ├── staging-manager
    └── uptime-monitor
```

## Plugin Stack

### Essential Plugins
| Plugin | Purpose | Update Frequency |
|--------|---------|------------------|
| WooCommerce | Core e-commerce | Monthly |
| WooCommerce Subscriptions | Box subscriptions | Quarterly |
| WooCommerce Bookings | Delivery slots | Quarterly |
| Stripe for WooCommerce | Payments | Monthly |
| Klaviyo for WooCommerce | Email integration | Monthly |

### Performance Plugins
| Plugin | Purpose |
|--------|---------|
| WP Rocket | Caching |
| Imagify | Image optimization |
| WP-Optimize | Database cleanup |

### Security Plugins
| Plugin | Purpose |
|--------|---------|
| Wordfence | Firewall, scanning |
| UpdraftPlus | Backups |
| Two Factor | Admin 2FA |

## Update Protocol

### Plugin Updates
```
1. Review changelog for breaking changes
2. Test on staging site
3. Schedule low-traffic window
4. Create backup before update
5. Apply update
6. Test critical flows:
   - Homepage loads
   - Product pages work
   - Add to cart works
   - Checkout completes
   - Payments process
7. Monitor for 24 hours
8. Document completion
```

### WordPress Core Updates
```
Minor (5.x.y): Weekly, with plugins
Major (5.x): Full UAT required, schedule with Tech Director
```

## Performance Standards

| Metric | Target | Tool |
|--------|--------|------|
| TTFB | <500ms | GTmetrix |
| LCP | <2.5s | PageSpeed Insights |
| FID | <100ms | PageSpeed Insights |
| CLS | <0.1 | PageSpeed Insights |
| Mobile Score | >80 | PageSpeed Insights |

## Daily Monitoring

### Automated Checks
- [ ] Uptime (every 5 min)
- [ ] SSL certificate valid
- [ ] Checkout test (hourly)
- [ ] Error log review
- [ ] Security scan

### Manual Checks
- [ ] Homepage visual check
- [ ] Test product page
- [ ] Test add to cart
- [ ] Check admin access
- [ ] Review plugin notifications

## Staging Environment

### Purpose
- Test all updates before production
- Develop new features
- Troubleshoot issues
- Training environment

### Sync Schedule
| Direction | Frequency |
|-----------|-----------|
| Production → Staging | Weekly |
| Staging → Production | As needed (with approval) |

## Backup Strategy

| Type | Frequency | Retention | Storage |
|------|-----------|-----------|---------|
| Database | Daily | 30 days | Off-site |
| Files | Daily | 30 days | Off-site |
| Full site | Weekly | 90 days | Off-site |

### Restore Testing
- Monthly restore test to staging
- Document RTO (target <4 hours)
- Verify data integrity

## Security Hardening

### Access Control
- Unique usernames (no "admin")
- Strong passwords enforced
- 2FA for all admin users
- IP whitelisting for wp-admin
- Login attempt limiting

### File Security
- Disable file editing in admin
- Protect wp-config.php
- Secure uploads directory
- Regular permission audits

## Escalation Triggers

Escalate to Technology Director:
- Site down >5 minutes
- Checkout not working
- Security breach detected
- Major plugin conflict
- Data loss incident

## Change Log

Maintain log of all changes:
```
Date | Change | By | Result | Rollback?
-----|--------|-----|--------|----------
     |        |     |        |
```
