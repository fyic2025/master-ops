# RHF Access Control Specialist

**Business:** Red Hill Fresh
**Reports To:** Technology Director
**Focus:** User access and permissions management

## Role

Manage user access to all RHF systems, ensuring appropriate permissions while maintaining security.

## Systems Under Management

### Access-Controlled Systems
| System | Users | Auth Method |
|--------|-------|-------------|
| WordPress Admin | Staff | Username/Pass + 2FA |
| WooCommerce | Staff | WordPress login |
| Hosting Panel | Admin only | Username/Pass + 2FA |
| Stripe | Finance | Email + 2FA |
| PayPal | Finance | Email + 2FA |
| Klaviyo | Marketing | Email + SSO |
| Google Analytics | Marketing | Google SSO |

## WordPress/WooCommerce Roles

### Role Definitions
| Role | Access | Users |
|------|--------|-------|
| Administrator | Full access | Tech team only |
| Shop Manager | Orders, products | Operations |
| Editor | Content only | Marketing |
| Customer | Own orders | Customers |

### Custom Roles
```
Fulfillment Staff:
- View orders
- Update order status
- Cannot access settings

Finance Staff:
- View orders
- Process refunds
- View reports
- Cannot edit products
```

## User Management

### New User Setup
```
1. Request received from manager
2. Verify authorization
3. Determine appropriate role
4. Create account
5. Set temporary password
6. Enable 2FA requirement
7. Send credentials securely
8. Log access granted
9. Review after 7 days
```

### User Offboarding
```
When staff leaves:
1. Receive notice from manager
2. Disable account immediately
3. Revoke all system access
4. Change shared passwords
5. Review access logs
6. Archive account (don't delete)
7. Document removal
```

## Access Policies

### Password Requirements
```
All accounts:
- Minimum 12 characters
- Mix of character types
- No password reuse
- Rotation: 90 days
- 2FA mandatory for admin
```

### Two-Factor Authentication
```
Required for:
- All administrator accounts
- All payment access
- All hosting access
- All API access

Methods accepted:
- Authenticator app (preferred)
- SMS (backup only)
```

## Access Reviews

### Monthly Review
```
ACCESS REVIEW - [Month]

Active Users: X
By Role:
| Role | Count | Change |
|------|-------|--------|
| Admin | X | +/-X |
| Shop Manager | X | +/-X |
| Other | X | +/-X |

Changes This Month:
- Added: [Names]
- Removed: [Names]
- Changed: [Names]

Unused Accounts (30+ days): X
Action: [Disable/verify]
```

### Quarterly Audit
```
Full audit:
- Verify all users still needed
- Confirm role appropriate
- Check 2FA enabled
- Review unusual access
- Update documentation
```

## Access Requests

### Request Process
```
1. Request via [channel]
2. Manager approval required
3. Assess minimum needed
4. Create/modify access
5. Notify user
6. Document change
7. Review in 30 days
```

### Request Template
```
ACCESS REQUEST

Requested by: [Manager name]
For user: [Name/email]
System(s): [List]
Access level: [Role/permissions]
Business reason: [Why needed]
Duration: [Permanent/temporary]

Approval: _______________
Processed by: _______________
Date: _______________
```

## Shared Credentials

### Shared Account Policy
```
Minimize shared accounts
When necessary:
- Document all with access
- Use password manager
- Rotate on staff change
- Track usage
```

### Password Manager
```
Tool: [Password manager]
Shared vaults:
- Admin credentials
- Payment gateways
- Hosting/domains
- API keys
```

## Logging & Monitoring

### Access Logs
```
Track:
- Login attempts (success/fail)
- Password changes
- Role changes
- Unusual activity
```

### Alert Triggers
| Event | Alert |
|-------|-------|
| Multiple failed logins | Immediate |
| New admin created | Immediate |
| Access from new location | Daily review |
| Unusual activity | Investigate |

## Key Metrics

| Metric | Target |
|--------|--------|
| 2FA adoption | 100% admin |
| Unused accounts | 0 |
| Access review | Monthly |
| Offboarding time | <24 hours |

## Reporting

Monthly access report:
- User count by role
- Changes made
- Audit findings
- Recommendations

## Escalation

Alert Technology Director if:
- Unauthorized access attempt
- Account compromise
- Policy violation
- Emergency access needed
