# Master-Ops Credentials Vault

**Password-protected credentials that sync between local and remote.**

## The Problem

- Credentials stored in `.env` files are gitignored (for security)
- This means credentials don't sync between local and remote
- Manually copying credentials is error-prone and frustrating
- The Supabase vault requires credentials to access it (chicken-and-egg)

## The Solution

An **encrypted vault file** that:
- Uses AES-256-GCM encryption with your master password
- Is **safe to commit to git** (it's encrypted!)
- Works anywhere - decrypt with the same password locally or remotely
- Eliminates manual credential copying

## Quick Start

### 1. Initialize the Vault

```bash
# From repo root
node vault.js init
```

This will:
- Ask you to create a master password
- Optionally import your existing .env credentials
- Create `credentials.vault.enc` (encrypted, safe to commit)

### 2. Add Credentials

```bash
# Add individual credentials
node vault.js add SUPABASE_URL=https://xxx.supabase.co
node vault.js add SUPABASE_SERVICE_ROLE_KEY=eyJ...
node vault.js add BIGCOMMERCE_BOO_ACCESS_TOKEN=abc123
```

### 3. Unlock for Local Development

```bash
# Decrypt vault to .env
node vault.js unlock
```

This exports credentials to `.env` for local use.

### 4. Lock Changes Back

After editing `.env`, encrypt changes back to the vault:

```bash
node vault.js lock
```

### 5. Commit the Vault

```bash
git add credentials.vault.enc
git commit -m "Update encrypted credentials vault"
git push
```

## Commands

| Command | Description |
|---------|-------------|
| `init` | Create a new vault (interactive) |
| `unlock` | Decrypt vault and export to .env |
| `lock` | Encrypt .env back to vault |
| `show` | Show decrypted credentials |
| `add KEY=VALUE` | Add or update a credential |
| `remove KEY` | Remove a credential |
| `change-password` | Change the master password |
| `verify` | Verify vault can be decrypted |
| `run CMD [ARGS]` | Run command with vault credentials |

## Workflow Examples

### Setting Up a New Machine

```bash
git clone <repo>
cd master-ops
node vault.js unlock  # Enter your master password
# Now .env contains your credentials
```

### Adding New Credentials

```bash
# Method 1: Add directly
node vault.js add NEW_API_KEY=xyz123

# Method 2: Edit .env then lock
echo "NEW_API_KEY=xyz123" >> .env
node vault.js lock
```

### Running Scripts with Credentials

```bash
# Load credentials and run a script
node vault.js run node scripts/sync-data.js

# Or unlock first, then run normally
node vault.js unlock
node scripts/sync-data.js
```

## Security Details

- **Encryption**: AES-256-GCM (authenticated encryption)
- **Key Derivation**: PBKDF2 with 100,000 iterations
- **Salt**: Random 32 bytes per encryption
- **IV**: Random 16 bytes per encryption

The encrypted vault contains:
```
salt (32 bytes) + iv (16 bytes) + authTag (16 bytes) + ciphertext
```

## Important Notes

1. **Remember your password!** - If you forget it, credentials cannot be recovered
2. **The vault file is safe to commit** - It's encrypted with strong encryption
3. **The .env file is NOT safe to commit** - It contains plaintext secrets
4. **Use a strong password** - Minimum 8 characters, recommend 16+

## Troubleshooting

### "Invalid password or corrupted vault"
- Check you're using the correct password
- Ensure the vault file wasn't manually modified

### "Vault file not found"
- Run `node vault.js init` to create a new vault
- Check you're in the repo root directory

### ".env file not found" (when locking)
- Run `node vault.js unlock` first, or add credentials with `node vault.js add`

## File Locations

| File | Location | Git Status |
|------|----------|------------|
| Encrypted vault | `credentials.vault.enc` | **Tracked** (safe) |
| Decrypted env | `.env` | **Ignored** (contains secrets) |
| CLI tool | `infra/credentials-vault/vault-cli.js` | Tracked |
| Crypto module | `infra/credentials-vault/vault-crypto.js` | Tracked |
