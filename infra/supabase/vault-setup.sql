-- ============================================
-- SECURE CREDENTIALS VAULT - BOO SUPABASE
-- ============================================
-- Location: https://usibnysqelovfuctmkqw.supabase.co
-- Run this in Supabase SQL Editor if setting up fresh
-- Dashboard > SQL Editor > New Query
--
-- This uses pgcrypto for AES encryption (more reliable than pgsodium vault)
-- ============================================

-- Prerequisites: pgcrypto extension must be enabled
-- Go to Database > Extensions > Enable "pgcrypto"

-- Step 1: Create encrypted credentials table
CREATE TABLE IF NOT EXISTS secure_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project TEXT NOT NULL,
  name TEXT NOT NULL,
  encrypted_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project, name)
);

-- Step 2: Enable Row Level Security
ALTER TABLE secure_credentials ENABLE ROW LEVEL SECURITY;

-- Step 3: Only service_role can access
CREATE POLICY "Service role only" ON secure_credentials
  FOR ALL USING (auth.role() = 'service_role');

-- Step 4: Encryption key function (stored securely in function)
CREATE OR REPLACE FUNCTION get_encryption_key()
RETURNS TEXT AS $$
BEGIN
  RETURN 'mstr-ops-vault-2024-secure-key';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Store credential (encrypted)
CREATE OR REPLACE FUNCTION store_credential(
  p_name TEXT, p_value TEXT, p_project TEXT DEFAULT 'global', p_description TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO secure_credentials (project, name, encrypted_value, description)
  VALUES (
    p_project,
    p_name,
    encode(extensions.encrypt(p_value::bytea, get_encryption_key()::bytea, 'aes'), 'base64'),
    COALESCE(p_description, p_project || ' - ' || p_name)
  )
  ON CONFLICT (project, name) DO UPDATE SET
    encrypted_value = encode(extensions.encrypt(p_value::bytea, get_encryption_key()::bytea, 'aes'), 'base64'),
    description = COALESCE(p_description, secure_credentials.description),
    updated_at = NOW()
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Get credential (decrypted)
CREATE OR REPLACE FUNCTION get_credential(p_name TEXT, p_project TEXT DEFAULT 'global')
RETURNS TEXT AS $$
DECLARE
  v_value TEXT;
BEGIN
  SELECT convert_from(
    extensions.decrypt(decode(encrypted_value, 'base64'), get_encryption_key()::bytea, 'aes'),
    'UTF8'
  ) INTO v_value
  FROM secure_credentials
  WHERE project = p_project AND name = p_name;
  RETURN v_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: List credentials (names only, not values)
CREATE OR REPLACE FUNCTION list_credentials(p_project TEXT DEFAULT NULL)
RETURNS TABLE(credential_name TEXT, project TEXT, description TEXT, created_at TIMESTAMPTZ) AS $$
BEGIN
  RETURN QUERY
  SELECT sc.name, sc.project, sc.description, sc.created_at
  FROM secure_credentials sc
  WHERE p_project IS NULL OR sc.project = p_project
  ORDER BY sc.project, sc.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Delete credential
CREATE OR REPLACE FUNCTION delete_credential(p_name TEXT, p_project TEXT DEFAULT 'global')
RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM secure_credentials WHERE project = p_project AND name = p_name;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 9: Grant execute permissions to service_role
GRANT EXECUTE ON FUNCTION store_credential(TEXT, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION get_credential(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION list_credentials(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION delete_credential(TEXT, TEXT) TO service_role;

-- ============================================
-- VERIFICATION
-- ============================================
-- After running this SQL, test with:
--   SELECT store_credential('test_key', 'test_value', 'test', 'Test credential');
--   SELECT get_credential('test_key', 'test');
--   SELECT * FROM list_credentials();
--   SELECT delete_credential('test_key', 'test');
