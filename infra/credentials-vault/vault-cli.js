#!/usr/bin/env node
/**
 * Master-Ops Credentials Vault CLI
 *
 * Password-protected credentials that sync between local and remote.
 *
 * Usage:
 *   node vault-cli.js init          - Create new vault (interactive)
 *   node vault-cli.js unlock        - Decrypt vault and export to .env
 *   node vault-cli.js lock          - Encrypt .env back to vault
 *   node vault-cli.js show          - Show decrypted credentials (careful!)
 *   node vault-cli.js add KEY=VALUE - Add/update a credential
 *   node vault-cli.js remove KEY    - Remove a credential
 *   node vault-cli.js change-password - Change the master password
 *   node vault-cli.js verify        - Verify vault can be decrypted
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const {
  encryptToVault,
  decryptFromVault,
  vaultExists,
  getVaultMetadata,
  setVault2FA,
  exportToEnv,
  loadToEnvironment
} = require('./vault-crypto');

const {
  generateSecret,
  generateTOTP,
  verifyTOTP,
  generateOTPAuthURI,
  getSecondsRemaining
} = require('./totp');

// Paths
const ROOT_DIR = path.resolve(__dirname, '../..');
const VAULT_PATH = path.join(ROOT_DIR, 'credentials.vault.enc');
const ENV_PATH = path.join(ROOT_DIR, '.env');
const ENV_TEMPLATE_PATH = path.join(ROOT_DIR, '.env.template');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logError(message) {
  console.error(`${colors.red}Error: ${message}${colors.reset}`);
}

function logSuccess(message) {
  console.log(`${colors.green}${message}${colors.reset}`);
}

function logWarning(message) {
  console.log(`${colors.yellow}Warning: ${message}${colors.reset}`);
}

/**
 * Prompt for password (hidden input)
 */
async function promptPassword(prompt = 'Master Password: ', confirm = false) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  // Enable raw mode for hidden input
  const getPassword = (promptText) => new Promise((resolve) => {
    // Use muted output for password
    process.stdout.write(promptText);

    let password = '';

    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    const onData = (char) => {
      char = char.toString();

      switch (char) {
        case '\n':
        case '\r':
        case '\u0004': // Ctrl+D
          if (process.stdin.isTTY) {
            process.stdin.setRawMode(false);
          }
          process.stdin.pause();
          process.stdin.removeListener('data', onData);
          console.log(); // New line after password
          resolve(password);
          break;
        case '\u0003': // Ctrl+C
          process.exit(1);
          break;
        case '\u007F': // Backspace
          if (password.length > 0) {
            password = password.slice(0, -1);
            process.stdout.write('\b \b');
          }
          break;
        default:
          password += char;
          process.stdout.write('*');
          break;
      }
    };

    process.stdin.on('data', onData);
  });

  const password = await getPassword(prompt);

  if (confirm) {
    const confirmPassword = await getPassword('Confirm Password: ');
    if (password !== confirmPassword) {
      throw new Error('Passwords do not match');
    }
  }

  rl.close();
  return password;
}

/**
 * Simple prompt for input
 */
async function promptInput(prompt) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Verify 2FA code if enabled on vault
 * Returns true if 2FA is not enabled or code is valid
 */
async function verify2FAIfEnabled() {
  const metadata = getVaultMetadata(VAULT_PATH);

  if (!metadata.twoFactorEnabled || !metadata.totpSecret) {
    return true; // 2FA not enabled, skip
  }

  const code = await promptInput('Enter 6-digit code from Google Authenticator: ');

  if (!code || code.length !== 6 || !/^\d+$/.test(code)) {
    logError('Invalid code format. Must be 6 digits.');
    return false;
  }

  if (!verifyTOTP(metadata.totpSecret, code)) {
    logError('Invalid 2FA code. Please try again.');
    return false;
  }

  return true;
}

/**
 * Parse .env file to object
 */
function parseEnvFile(envPath) {
  if (!fs.existsSync(envPath)) {
    return {};
  }

  const content = fs.readFileSync(envPath, 'utf8');
  const result = {};

  for (const line of content.split('\n')) {
    const trimmed = line.trim();

    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      let [, key, value] = match;

      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      result[key] = value;
    }
  }

  return result;
}

/**
 * Initialize a new vault
 */
async function initVault() {
  log('\n=== Master-Ops Credentials Vault Setup ===\n', 'cyan');

  if (vaultExists(VAULT_PATH)) {
    const overwrite = await promptInput('Vault already exists. Overwrite? (yes/no): ');
    if (overwrite.toLowerCase() !== 'yes') {
      log('Aborted.', 'yellow');
      return;
    }
  }

  log('Create a strong master password. This password will be required to access your credentials.', 'dim');
  log('IMPORTANT: If you forget this password, your credentials cannot be recovered!\n', 'yellow');

  const password = await promptPassword('Create Master Password: ', true);

  if (password.length < 8) {
    logError('Password must be at least 8 characters');
    return;
  }

  // Check for existing .env or template
  let initialCredentials = {};

  if (fs.existsSync(ENV_PATH)) {
    const useExisting = await promptInput('\nFound existing .env file. Import credentials from it? (yes/no): ');
    if (useExisting.toLowerCase() === 'yes') {
      initialCredentials = parseEnvFile(ENV_PATH);
      log(`Imported ${Object.keys(initialCredentials).length} credentials from .env`, 'green');
    }
  } else if (fs.existsSync(ENV_TEMPLATE_PATH)) {
    log('\nNo .env found, but template exists. You can add credentials later with:', 'dim');
    log('  node vault-cli.js add KEY=VALUE', 'cyan');
  }

  // Create the vault
  try {
    encryptToVault(initialCredentials, password, VAULT_PATH);
    logSuccess('\nVault created successfully!');
    log(`Vault file: ${VAULT_PATH}`, 'dim');
    log('\nThis encrypted file is SAFE to commit to git.', 'green');
    log('Your credentials are protected by your master password.\n', 'dim');

    log('Next steps:', 'cyan');
    log('  1. Add credentials: node vault-cli.js add SUPABASE_URL=https://...', 'dim');
    log('  2. Unlock vault:    node vault-cli.js unlock', 'dim');
    log('  3. Commit to git:   git add credentials.vault.enc', 'dim');
  } catch (error) {
    logError(`Failed to create vault: ${error.message}`);
  }
}

/**
 * Unlock vault and export to .env
 */
async function unlockVault() {
  log('\n=== Unlock Credentials Vault ===\n', 'cyan');

  if (!vaultExists(VAULT_PATH)) {
    logError('No vault found. Create one with: node vault-cli.js init');
    return;
  }

  // Check 2FA first
  if (!await verify2FAIfEnabled()) {
    return;
  }

  const password = await promptPassword();

  try {
    const credentials = decryptFromVault(password, VAULT_PATH);
    const count = Object.keys(credentials).length;

    if (count === 0) {
      logWarning('Vault is empty. Add credentials with: node vault-cli.js add KEY=VALUE');
      return;
    }

    // Export to .env
    exportToEnv(credentials, ENV_PATH);
    logSuccess(`\nUnlocked! Exported ${count} credentials to .env`);
    log(`\nRemember: .env is gitignored and won't sync.`, 'dim');
    log(`The vault file (credentials.vault.enc) contains your encrypted credentials.`, 'dim');
  } catch (error) {
    logError(error.message);
  }
}

/**
 * Lock (encrypt) .env back to vault
 */
async function lockVault() {
  log('\n=== Lock Credentials to Vault ===\n', 'cyan');

  if (!fs.existsSync(ENV_PATH)) {
    logError('No .env file found. Nothing to lock.');
    return;
  }

  // Check 2FA first if vault exists
  if (vaultExists(VAULT_PATH) && !await verify2FAIfEnabled()) {
    return;
  }

  const password = await promptPassword();

  // Verify password against existing vault if it exists
  if (vaultExists(VAULT_PATH)) {
    try {
      decryptFromVault(password, VAULT_PATH);
    } catch (error) {
      logError('Invalid password. Cannot update vault.');
      return;
    }
  }

  try {
    const credentials = parseEnvFile(ENV_PATH);
    const count = Object.keys(credentials).length;

    encryptToVault(credentials, password, VAULT_PATH);
    logSuccess(`\nLocked! Encrypted ${count} credentials to vault.`);
    log(`\nVault file updated: ${VAULT_PATH}`, 'dim');
    log(`You can safely commit this file to git.`, 'green');
  } catch (error) {
    logError(`Failed to lock vault: ${error.message}`);
  }
}

/**
 * Show decrypted credentials
 */
async function showCredentials() {
  log('\n=== Show Credentials (SENSITIVE!) ===\n', 'yellow');

  if (!vaultExists(VAULT_PATH)) {
    logError('No vault found.');
    return;
  }

  const confirm = await promptInput('This will display sensitive credentials. Continue? (yes/no): ');
  if (confirm.toLowerCase() !== 'yes') {
    log('Aborted.', 'dim');
    return;
  }

  // Check 2FA first
  if (!await verify2FAIfEnabled()) {
    return;
  }

  const password = await promptPassword();

  try {
    const credentials = decryptFromVault(password, VAULT_PATH);

    console.log('\n--- Credentials ---\n');
    for (const [key, value] of Object.entries(credentials)) {
      // Mask long values (likely secrets)
      const displayValue = value.length > 20
        ? value.substring(0, 8) + '...' + value.substring(value.length - 4)
        : value;
      console.log(`${colors.cyan}${key}${colors.reset}=${displayValue}`);
    }
    console.log('\n--- End ---\n');

  } catch (error) {
    logError(error.message);
  }
}

/**
 * Add or update a credential
 */
async function addCredential(keyValue) {
  if (!keyValue || !keyValue.includes('=')) {
    logError('Usage: node vault-cli.js add KEY=VALUE');
    return;
  }

  const [key, ...valueParts] = keyValue.split('=');
  const value = valueParts.join('='); // Handle values containing =

  if (!key || !value) {
    logError('Invalid format. Use: KEY=VALUE');
    return;
  }

  log(`\n=== Add Credential: ${key} ===\n`, 'cyan');

  // Check 2FA first if vault exists
  if (vaultExists(VAULT_PATH) && !await verify2FAIfEnabled()) {
    return;
  }

  const password = await promptPassword();

  try {
    let credentials = {};

    if (vaultExists(VAULT_PATH)) {
      credentials = decryptFromVault(password, VAULT_PATH);
    }

    const isUpdate = key in credentials;
    credentials[key] = value;

    encryptToVault(credentials, password, VAULT_PATH);
    logSuccess(`\n${isUpdate ? 'Updated' : 'Added'} credential: ${key}`);

  } catch (error) {
    logError(error.message);
  }
}

/**
 * Remove a credential
 */
async function removeCredential(key) {
  if (!key) {
    logError('Usage: node vault-cli.js remove KEY');
    return;
  }

  log(`\n=== Remove Credential: ${key} ===\n`, 'cyan');

  if (!vaultExists(VAULT_PATH)) {
    logError('No vault found.');
    return;
  }

  // Check 2FA first
  if (!await verify2FAIfEnabled()) {
    return;
  }

  const password = await promptPassword();

  try {
    const credentials = decryptFromVault(password, VAULT_PATH);

    if (!(key in credentials)) {
      logWarning(`Credential '${key}' not found in vault.`);
      return;
    }

    delete credentials[key];
    encryptToVault(credentials, password, VAULT_PATH);
    logSuccess(`\nRemoved credential: ${key}`);

  } catch (error) {
    logError(error.message);
  }
}

/**
 * Change the master password
 */
async function changePassword() {
  log('\n=== Change Master Password ===\n', 'cyan');

  if (!vaultExists(VAULT_PATH)) {
    logError('No vault found.');
    return;
  }

  log('Enter your current password first.\n', 'dim');
  const currentPassword = await promptPassword('Current Password: ');

  let credentials;
  try {
    credentials = decryptFromVault(currentPassword, VAULT_PATH);
  } catch (error) {
    logError('Invalid current password.');
    return;
  }

  log('\nNow create your new password.\n', 'dim');
  const newPassword = await promptPassword('New Password: ', true);

  if (newPassword.length < 8) {
    logError('Password must be at least 8 characters');
    return;
  }

  try {
    encryptToVault(credentials, newPassword, VAULT_PATH);
    logSuccess('\nPassword changed successfully!');
    log('Remember to use your new password to unlock the vault.', 'dim');
  } catch (error) {
    logError(`Failed to change password: ${error.message}`);
  }
}

/**
 * Verify vault can be decrypted
 */
async function verifyVault() {
  log('\n=== Verify Vault ===\n', 'cyan');

  if (!vaultExists(VAULT_PATH)) {
    logError('No vault found.');
    return;
  }

  // Show 2FA status
  const metadata = getVaultMetadata(VAULT_PATH);
  log(`2FA Status: ${metadata.twoFactorEnabled ? 'Enabled' : 'Disabled'}`, metadata.twoFactorEnabled ? 'green' : 'dim');

  // Check 2FA first
  if (!await verify2FAIfEnabled()) {
    return;
  }

  const password = await promptPassword();

  try {
    const credentials = decryptFromVault(password, VAULT_PATH);
    const count = Object.keys(credentials).length;

    logSuccess('\nVault verified successfully!');
    log(`Contains ${count} credentials.`, 'dim');

    // List credential keys (not values)
    if (count > 0) {
      log('\nCredential keys:', 'cyan');
      for (const key of Object.keys(credentials)) {
        log(`  - ${key}`, 'dim');
      }
    }

  } catch (error) {
    logError(error.message);
  }
}

/**
 * Setup 2FA (Google Authenticator)
 */
async function setup2FA() {
  log('\n=== Setup 2FA (Google Authenticator) ===\n', 'cyan');

  if (!vaultExists(VAULT_PATH)) {
    logError('No vault found. Create one with: node vault-cli.js init');
    return;
  }

  const metadata = getVaultMetadata(VAULT_PATH);
  if (metadata.twoFactorEnabled) {
    logWarning('2FA is already enabled on this vault.');
    const confirm = await promptInput('Do you want to reset 2FA? This will invalidate your current authenticator. (yes/no): ');
    if (confirm.toLowerCase() !== 'yes') {
      log('Aborted.', 'dim');
      return;
    }
  }

  log('First, verify your password to enable 2FA.\n', 'dim');
  const password = await promptPassword();

  // Verify password works
  try {
    decryptFromVault(password, VAULT_PATH);
  } catch (error) {
    logError('Invalid password.');
    return;
  }

  // Generate new TOTP secret
  const secret = generateSecret();
  const uri = generateOTPAuthURI(secret, 'MasterOps-Vault', 'MasterOps');

  log('\n┌─────────────────────────────────────────────────────────┐', 'cyan');
  log('│            Setup Google Authenticator                   │', 'cyan');
  log('├─────────────────────────────────────────────────────────┤', 'cyan');
  log('│                                                         │', 'cyan');
  log('│  1. Open Google Authenticator on your phone             │', 'cyan');
  log('│  2. Tap the + button to add a new account               │', 'cyan');
  log('│  3. Select "Enter a setup key"                          │', 'cyan');
  log('│  4. Enter these details:                                │', 'cyan');
  log('│                                                         │', 'cyan');
  log(`│     Account name: ${colors.yellow}MasterOps-Vault${colors.cyan}                     │`, 'cyan');
  log(`│     Your key:     ${colors.yellow}${secret}${colors.cyan}     │`, 'cyan');
  log('│     Type of key:  Time-based                            │', 'cyan');
  log('│                                                         │', 'cyan');
  log('└─────────────────────────────────────────────────────────┘', 'cyan');

  log('\n  Or scan this URI with a QR code scanner:\n', 'dim');
  log(`  ${colors.dim}${uri}${colors.reset}\n`);

  // Verify the user can generate a code
  log('Now verify 2FA is working by entering a code from the app.\n', 'yellow');
  const code = await promptInput('Enter 6-digit code: ');

  if (!verifyTOTP(secret, code)) {
    logError('Invalid code. 2FA setup aborted. Please try again.');
    return;
  }

  // Save the TOTP secret to the vault
  try {
    setVault2FA(VAULT_PATH, password, secret);
    logSuccess('\n2FA enabled successfully!');
    log('From now on, you will need your password AND a code from Google Authenticator.', 'dim');
    log('\nIMPORTANT: Save your setup key somewhere safe in case you lose your phone!', 'yellow');
    log(`Setup key: ${secret}`, 'dim');
  } catch (error) {
    logError(`Failed to enable 2FA: ${error.message}`);
  }
}

/**
 * Disable 2FA
 */
async function disable2FA() {
  log('\n=== Disable 2FA ===\n', 'cyan');

  if (!vaultExists(VAULT_PATH)) {
    logError('No vault found.');
    return;
  }

  const metadata = getVaultMetadata(VAULT_PATH);
  if (!metadata.twoFactorEnabled) {
    log('2FA is not enabled on this vault.', 'dim');
    return;
  }

  log('To disable 2FA, you need to verify your identity.\n', 'dim');

  // Verify 2FA code first
  if (!await verify2FAIfEnabled()) {
    return;
  }

  // Then verify password
  const password = await promptPassword();

  try {
    decryptFromVault(password, VAULT_PATH);
  } catch (error) {
    logError('Invalid password.');
    return;
  }

  const confirm = await promptInput('\nAre you sure you want to disable 2FA? (yes/no): ');
  if (confirm.toLowerCase() !== 'yes') {
    log('Aborted.', 'dim');
    return;
  }

  try {
    setVault2FA(VAULT_PATH, password, null);
    logSuccess('\n2FA has been disabled.');
    log('Your vault is now protected by password only.', 'dim');
  } catch (error) {
    logError(`Failed to disable 2FA: ${error.message}`);
  }
}

/**
 * Load vault credentials into environment and run a command
 */
async function runWithCredentials(args) {
  if (!vaultExists(VAULT_PATH)) {
    logError('No vault found. Create one with: node vault-cli.js init');
    process.exit(1);
  }

  const password = process.env.VAULT_PASSWORD || await promptPassword();

  try {
    const credentials = decryptFromVault(password, VAULT_PATH);
    loadToEnvironment(credentials);

    // Run the command
    const { spawn } = require('child_process');
    const [cmd, ...cmdArgs] = args;

    const child = spawn(cmd, cmdArgs, {
      stdio: 'inherit',
      env: process.env
    });

    child.on('exit', (code) => {
      process.exit(code);
    });

  } catch (error) {
    logError(error.message);
    process.exit(1);
  }
}

/**
 * Show help
 */
function showHelp() {
  log(`
${colors.cyan}Master-Ops Credentials Vault${colors.reset}
${colors.dim}Password-protected credentials that sync between local and remote${colors.reset}

${colors.yellow}Commands:${colors.reset}
  ${colors.green}init${colors.reset}              Create a new vault (interactive)
  ${colors.green}unlock${colors.reset}            Decrypt vault and export to .env
  ${colors.green}lock${colors.reset}              Encrypt .env back to vault
  ${colors.green}show${colors.reset}              Show decrypted credentials
  ${colors.green}add KEY=VALUE${colors.reset}     Add or update a credential
  ${colors.green}remove KEY${colors.reset}        Remove a credential
  ${colors.green}change-password${colors.reset}   Change the master password
  ${colors.green}verify${colors.reset}            Verify vault can be decrypted
  ${colors.green}setup-2fa${colors.reset}         Enable Google Authenticator 2FA
  ${colors.green}disable-2fa${colors.reset}       Disable 2FA
  ${colors.green}run CMD [ARGS]${colors.reset}    Run command with vault credentials in environment

${colors.yellow}Examples:${colors.reset}
  ${colors.dim}# Create a new vault${colors.reset}
  node vault-cli.js init

  ${colors.dim}# Add Supabase credentials${colors.reset}
  node vault-cli.js add SUPABASE_URL=https://xxx.supabase.co
  node vault-cli.js add SUPABASE_SERVICE_ROLE_KEY=eyJ...

  ${colors.dim}# Unlock vault to .env for local development${colors.reset}
  node vault-cli.js unlock

  ${colors.dim}# After editing .env, lock changes back to vault${colors.reset}
  node vault-cli.js lock

  ${colors.dim}# Run a script with vault credentials${colors.reset}
  node vault-cli.js run node my-script.js

${colors.yellow}How it works:${colors.reset}
  1. Your credentials are encrypted with AES-256-GCM using your master password
  2. The encrypted vault file (credentials.vault.enc) is SAFE to commit to git
  3. Clone repo anywhere, run 'unlock' with your password, and you have your credentials
  4. The .env file is gitignored - only the encrypted vault syncs

${colors.yellow}Security:${colors.reset}
  - AES-256-GCM encryption (authenticated encryption)
  - PBKDF2 key derivation with 100,000 iterations
  - Random salt and IV for each encryption
  - No plaintext secrets in git

${colors.red}WARNING:${colors.reset} If you forget your master password, your credentials CANNOT be recovered!
`);
}

// Main
async function main() {
  const args = process.argv.slice(2);
  const command = args[0]?.toLowerCase();

  try {
    switch (command) {
      case 'init':
        await initVault();
        break;
      case 'unlock':
        await unlockVault();
        break;
      case 'lock':
        await lockVault();
        break;
      case 'show':
        await showCredentials();
        break;
      case 'add':
        await addCredential(args[1]);
        break;
      case 'remove':
        await removeCredential(args[1]);
        break;
      case 'change-password':
        await changePassword();
        break;
      case 'verify':
        await verifyVault();
        break;
      case 'setup-2fa':
      case '2fa':
        await setup2FA();
        break;
      case 'disable-2fa':
        await disable2FA();
        break;
      case 'run':
        await runWithCredentials(args.slice(1));
        break;
      case 'help':
      case '--help':
      case '-h':
      case undefined:
        showHelp();
        break;
      default:
        logError(`Unknown command: ${command}`);
        log('Run with --help for usage information.', 'dim');
    }
  } catch (error) {
    logError(error.message);
    process.exit(1);
  }
}

main();
