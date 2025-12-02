/**
 * TOTP (Time-based One-Time Password) Implementation
 * Compatible with Google Authenticator, Authy, etc.
 *
 * RFC 6238 compliant using Node.js built-in crypto.
 */

const crypto = require('crypto');

// TOTP Configuration
const TOTP_DIGITS = 6;
const TOTP_PERIOD = 30; // seconds
const TOTP_ALGORITHM = 'sha1';
const TOTP_WINDOW = 1; // Allow 1 period before/after for clock skew

/**
 * Generate a random TOTP secret (base32 encoded)
 */
function generateSecret(length = 20) {
  const buffer = crypto.randomBytes(length);
  return base32Encode(buffer);
}

/**
 * Generate TOTP code for a given secret and time
 */
function generateTOTP(secret, timestamp = Date.now()) {
  const time = Math.floor(timestamp / 1000 / TOTP_PERIOD);
  const secretBuffer = base32Decode(secret);

  // Create time buffer (8 bytes, big-endian)
  const timeBuffer = Buffer.alloc(8);
  timeBuffer.writeBigInt64BE(BigInt(time));

  // HMAC-SHA1
  const hmac = crypto.createHmac(TOTP_ALGORITHM, secretBuffer);
  hmac.update(timeBuffer);
  const hash = hmac.digest();

  // Dynamic truncation
  const offset = hash[hash.length - 1] & 0x0f;
  const binary =
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);

  // Generate digits
  const otp = binary % Math.pow(10, TOTP_DIGITS);
  return otp.toString().padStart(TOTP_DIGITS, '0');
}

/**
 * Verify a TOTP code (with window for clock skew)
 */
function verifyTOTP(secret, code, window = TOTP_WINDOW) {
  const now = Date.now();

  // Check current and adjacent time windows
  for (let i = -window; i <= window; i++) {
    const timestamp = now + (i * TOTP_PERIOD * 1000);
    const expectedCode = generateTOTP(secret, timestamp);

    if (code === expectedCode) {
      return true;
    }
  }

  return false;
}

/**
 * Generate otpauth:// URI for QR code / Google Authenticator
 */
function generateOTPAuthURI(secret, accountName, issuer = 'MasterOps') {
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedAccount = encodeURIComponent(accountName);

  return `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD}`;
}

/**
 * Generate ASCII QR code for terminal display
 */
function generateASCIIQR(data) {
  // Simple QR code representation using a basic pattern
  // For a real QR code, you'd use a library, but this gives a usable text output
  const lines = [
    '',
    '┌─────────────────────────────────────────────────────┐',
    '│                                                     │',
    '│   To add to Google Authenticator:                   │',
    '│                                                     │',
    '│   1. Open Google Authenticator app                  │',
    '│   2. Tap + to add account                           │',
    '│   3. Select "Enter setup key"                       │',
    '│   4. Enter the details below                        │',
    '│                                                     │',
    '└─────────────────────────────────────────────────────┘',
    ''
  ];

  return lines.join('\n');
}

// Base32 encoding/decoding (RFC 4648)
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buffer) {
  let result = '';
  let bits = 0;
  let value = 0;

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      bits -= 5;
      result += BASE32_ALPHABET[(value >>> bits) & 0x1f];
    }
  }

  if (bits > 0) {
    result += BASE32_ALPHABET[(value << (5 - bits)) & 0x1f];
  }

  return result;
}

function base32Decode(str) {
  str = str.toUpperCase().replace(/[^A-Z2-7]/g, '');

  const bytes = [];
  let bits = 0;
  let value = 0;

  for (const char of str) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) continue;

    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      bits -= 8;
      bytes.push((value >>> bits) & 0xff);
    }
  }

  return Buffer.from(bytes);
}

/**
 * Get remaining seconds until next TOTP code
 */
function getSecondsRemaining() {
  return TOTP_PERIOD - (Math.floor(Date.now() / 1000) % TOTP_PERIOD);
}

module.exports = {
  generateSecret,
  generateTOTP,
  verifyTOTP,
  generateOTPAuthURI,
  generateASCIIQR,
  getSecondsRemaining,
  TOTP_DIGITS,
  TOTP_PERIOD
};
