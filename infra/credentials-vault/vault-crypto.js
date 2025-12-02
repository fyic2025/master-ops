/**
 * Secure Credentials Vault - Encryption Module
 *
 * Uses AES-256-GCM encryption with PBKDF2 key derivation.
 * This file can be safely committed to git as it contains no secrets.
 *
 * The encrypted vault file (credentials.vault.enc) CAN be committed
 * because it requires your master password to decrypt.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const SALT_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const PBKDF2_ITERATIONS = 100000; // High iteration count for security

/**
 * Derive encryption key from password using PBKDF2
 */
function deriveKey(password, salt) {
  return crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha512');
}

/**
 * Encrypt data with password
 * Returns: salt + iv + authTag + encryptedData (all base64 encoded together)
 */
function encrypt(plaintext, password) {
  // Generate random salt and IV
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);

  // Derive key from password
  const key = deriveKey(password, salt);

  // Create cipher and encrypt
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final()
  ]);

  // Get authentication tag
  const authTag = cipher.getAuthTag();

  // Combine all components: salt + iv + authTag + encrypted
  const combined = Buffer.concat([salt, iv, authTag, encrypted]);

  return combined.toString('base64');
}

/**
 * Decrypt data with password
 */
function decrypt(encryptedData, password) {
  // Decode from base64
  const combined = Buffer.from(encryptedData, 'base64');

  // Extract components
  const salt = combined.subarray(0, SALT_LENGTH);
  const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const authTag = combined.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);

  // Derive key from password
  const key = deriveKey(password, salt);

  // Create decipher and decrypt
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  try {
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);
    return decrypted.toString('utf8');
  } catch (error) {
    if (error.message.includes('Unsupported state') || error.message.includes('auth')) {
      throw new Error('Invalid password or corrupted vault');
    }
    throw error;
  }
}

/**
 * Encrypt credentials object to vault file
 * @param {Object} credentials - The credentials to encrypt
 * @param {string} password - The master password
 * @param {string} vaultPath - Path to vault file
 * @param {Object} options - Optional settings (e.g., { totpSecret: '...' })
 */
function encryptToVault(credentials, password, vaultPath, options = {}) {
  const json = JSON.stringify(credentials, null, 2);
  const encrypted = encrypt(json, password);

  // Preserve existing 2FA config if not specified
  let totpSecret = options.totpSecret;
  if (totpSecret === undefined && fs.existsSync(vaultPath)) {
    const existing = getVaultMetadata(vaultPath);
    totpSecret = existing.totpSecret;
  }

  // Build header
  const headerLines = [
    '# Master-Ops Encrypted Credentials Vault',
    '# This file is safe to commit to git - it requires your master password to decrypt',
    '# DO NOT share your master password',
    `# Created: ${new Date().toISOString()}`,
    '# Algorithm: AES-256-GCM with PBKDF2 key derivation',
  ];

  // Add 2FA config if enabled
  if (totpSecret) {
    headerLines.push(`# 2FA: enabled`);
    headerLines.push(`# TOTP-Secret: ${totpSecret}`);
  } else {
    headerLines.push('# 2FA: disabled');
  }

  headerLines.push('');
  headerLines.push(encrypted);

  const vaultContent = headerLines.join('\n');
  fs.writeFileSync(vaultPath, vaultContent, 'utf8');
  return true;
}

/**
 * Decrypt vault file to credentials object
 */
function decryptFromVault(password, vaultPath) {
  if (!fs.existsSync(vaultPath)) {
    throw new Error(`Vault file not found: ${vaultPath}`);
  }

  const content = fs.readFileSync(vaultPath, 'utf8');

  // Extract encrypted data (skip comment lines)
  const lines = content.split('\n').filter(line => !line.startsWith('#') && line.trim());
  const encryptedData = lines.join('');

  if (!encryptedData) {
    throw new Error('Vault file is empty or corrupted');
  }

  const json = decrypt(encryptedData, password);
  return JSON.parse(json);
}

/**
 * Check if vault exists
 */
function vaultExists(vaultPath) {
  return fs.existsSync(vaultPath);
}

/**
 * Get vault metadata (2FA config, etc.) from header
 */
function getVaultMetadata(vaultPath) {
  if (!fs.existsSync(vaultPath)) {
    return { twoFactorEnabled: false, totpSecret: null };
  }

  const content = fs.readFileSync(vaultPath, 'utf8');
  const lines = content.split('\n');

  let twoFactorEnabled = false;
  let totpSecret = null;

  for (const line of lines) {
    if (line.startsWith('# 2FA: enabled')) {
      twoFactorEnabled = true;
    } else if (line.startsWith('# TOTP-Secret: ')) {
      totpSecret = line.replace('# TOTP-Secret: ', '').trim();
    }
  }

  return { twoFactorEnabled, totpSecret };
}

/**
 * Update vault 2FA settings
 */
function setVault2FA(vaultPath, password, totpSecret) {
  // First decrypt existing credentials
  const credentials = decryptFromVault(password, vaultPath);

  // Re-encrypt with new 2FA setting
  encryptToVault(credentials, password, vaultPath, { totpSecret });

  return true;
}

/**
 * Export credentials to .env format
 */
function exportToEnv(credentials, envPath) {
  const lines = [];

  function flattenObject(obj, prefix = '') {
    for (const [key, value] of Object.entries(obj)) {
      const envKey = prefix ? `${prefix}_${key}` : key;

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        flattenObject(value, envKey);
      } else {
        // Quote values that contain special characters
        const stringValue = String(value);
        const needsQuotes = stringValue.includes(' ') || stringValue.includes('=') || stringValue.includes('#');
        lines.push(`${envKey.toUpperCase()}=${needsQuotes ? `"${stringValue}"` : stringValue}`);
      }
    }
  }

  flattenObject(credentials);
  fs.writeFileSync(envPath, lines.join('\n') + '\n', 'utf8');
  return lines.length;
}

/**
 * Load credentials into process.env
 */
function loadToEnvironment(credentials) {
  function flattenObject(obj, prefix = '') {
    for (const [key, value] of Object.entries(obj)) {
      const envKey = prefix ? `${prefix}_${key}` : key;

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        flattenObject(value, envKey);
      } else {
        process.env[envKey.toUpperCase()] = String(value);
      }
    }
  }

  flattenObject(credentials);
}

module.exports = {
  encrypt,
  decrypt,
  encryptToVault,
  decryptFromVault,
  vaultExists,
  getVaultMetadata,
  setVault2FA,
  exportToEnv,
  loadToEnvironment,
  ALGORITHM,
  PBKDF2_ITERATIONS
};
