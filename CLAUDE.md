# Master-Ops Project Guidelines

## FILE ORGANIZATION RULES (MANDATORY)

**These rules MUST be followed on every occasion. No exceptions.**

---

### 1. NEVER Create Files at Root Level

Before creating ANY file, determine the correct location:

| File Type | Location | Example |
|-----------|----------|---------|
| One-off/debug scripts | `temp/` (gitignored) | `temp/test-api.ts` |
| BOO business code | `buy-organics-online/scripts/` | |
| Teelixir business code | `teelixir/scripts/` | |
| Elevate business code | `elevate-wholesale/scripts/` | |
| Red Hill Fresh code | `red-hill-fresh/scripts/` | |
| Shared libraries | `shared/libs/` | |
| Reusable tests | `scripts/tests/` | |
| Utility scripts | `scripts/utilities/` | |
| Documentation | `docs/` | |
| Data files (CSV, JSON) | `data/` | |

---

### 2. ALWAYS ASK Before Creating New Files

When creating a new file, ALWAYS:
1. **State the intended location** before writing
2. **Ask for confirmation** if unsure which project/folder
3. **Explain why** this location is appropriate

Example prompt to user:
> "I'll create this script at `teelixir/scripts/sync-inventory.ts` since it's Teelixir-specific. Is that correct?"

---

### 3. Temporary/One-Off Scripts

For ANY script that is:
- Debugging or testing something
- A one-time fix
- Exploratory/investigative
- Not intended for reuse

**MUST go in `temp/` folder** (gitignored, not committed)

After the task is complete:
- Delete the temp script OR
- If it should be kept, ask user where to move it permanently

---

### 4. File Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Scripts | `kebab-case.ts` | `sync-inventory.ts` |
| Tests | `*.test.ts` | `inventory.test.ts` |
| Configs | `*.config.ts` | `vitest.config.ts` |
| Documentation | `UPPER-CASE.md` | `README.md` |

---

### 5. Business Folder Structure

Each business folder should follow this structure:
```
{business}/
├── docs/           # Business-specific documentation
├── scripts/        # Business-specific scripts
├── supabase/       # Database migrations (if applicable)
└── README.md       # Business overview
```

---

### 6. Before Committing

Verify:
- [ ] No new files at repository root (except configs)
- [ ] Temporary scripts are in `temp/` or deleted
- [ ] Files are in the correct business/project folder
- [ ] No hardcoded credentials (use vault or env vars)

---

## CREDENTIALS & SECURITY

- **NEVER** hardcode API keys, tokens, or passwords
- Use `creds.js` vault system or environment variables
- See `SECURITY-ACTION-REQUIRED.md` for current issues

---

## PROJECT STRUCTURE

```
master-ops/
├── buy-organics-online/    # BOO business
├── teelixir/               # Teelixir business
├── elevate-wholesale/      # Elevate business
├── red-hill-fresh/         # Red Hill Fresh business
├── shared/                 # Shared libraries (imports)
├── scripts/                # Cross-business scripts
│   ├── tests/              # Reusable test scripts
│   ├── utilities/          # Utility scripts
│   └── ...
├── docs/                   # Documentation
├── data/                   # Data files
├── archive/                # Archived/deprecated code
├── temp/                   # Temporary scripts (gitignored)
└── infra/                  # Infrastructure configs
```

---

## QUESTIONS TO ASK

When uncertain about file placement, ask:

1. "Which business does this relate to?" → business folder
2. "Will this be reused?" → No = `temp/`, Yes = appropriate scripts folder
3. "Is this shared across businesses?" → `shared/libs/` or `scripts/`
4. "Is this documentation?" → `docs/`
5. "Is this data?" → `data/`

---

**Organization is the key. Follow these rules on every occasion.**
