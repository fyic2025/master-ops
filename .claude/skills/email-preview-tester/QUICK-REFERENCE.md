# Email Preview Tester - Quick Reference

## Litmus API Quick Commands

```bash
# Test email across clients
npx tsx scripts/preview-tester.ts test <html_file>

# Get spam score
npx tsx scripts/preview-tester.ts spam <html_file>

# Generate preview URLs
npx tsx scripts/preview-tester.ts previews <html_file>
```

## Priority Email Clients

### Desktop
- Outlook 2019/2021 (Windows)
- Apple Mail (macOS)
- Outlook for Mac

### Webmail
- Gmail (Chrome)
- Outlook.com
- Yahoo Mail

### Mobile
- Apple Mail (iOS)
- Gmail App (iOS/Android)
- Outlook App (iOS/Android)

## Common Compatibility Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Layout breaks | CSS not inline | Use inline styles |
| Images broken | Missing alt text | Add alt attributes |
| Font fallback | Custom fonts | Add web-safe fallback |
| Button not clickable | CSS button styling | Use table-based button |
| Dark mode issues | Background colors | Add dark mode styles |

## Spam Score Factors

### Positive (Lower Score)
- Plain text version included
- Unsubscribe link present
- Physical address in footer
- Balance of text to images
- SPF/DKIM/DMARC configured

### Negative (Higher Score)
- ALL CAPS in subject
- Excessive exclamation marks!!!
- Spam trigger words (free, urgent, act now)
- Too many images, not enough text
- Missing unsubscribe

## Spam Trigger Words to Avoid

```
act now, click here, free, urgent, limited time,
congratulations, winner, cash, cheap, guarantee,
no obligation, order now, special promotion
```

## Accessibility Checklist

- [ ] All images have alt text
- [ ] Link text is descriptive (not "click here")
- [ ] Color contrast ratio >= 4.5:1
- [ ] Font size >= 14px for body
- [ ] Table has role="presentation"
- [ ] Language attribute on HTML tag

## Dark Mode CSS

```html
<!-- Gmail App dark mode -->
@media (prefers-color-scheme: dark) {
  .dark-bg { background-color: #1a1a1a !important; }
  .dark-text { color: #ffffff !important; }
}

<!-- Outlook dark mode -->
[data-ogsb] .dark-bg { background-color: #1a1a1a !important; }
```

## Quick Validation

```typescript
// Validate HTML structure
const result = await tester.validateHTML(htmlContent);
// Returns: { valid: boolean, errors: string[], warnings: string[] }

// Check spam score
const spam = await tester.checkSpamScore(htmlContent);
// Returns: { score: number, maxScore: 10, issues: string[] }
```
