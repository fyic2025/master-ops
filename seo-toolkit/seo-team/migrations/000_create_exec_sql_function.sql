-- Create exec_sql function for programmatic migrations
-- This allows running SQL via REST API RPC calls
-- Run this ONCE in Supabase SQL Editor to enable automatic migrations

-- Create the function
CREATE OR REPLACE FUNCTION exec_sql(sql_query TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    EXECUTE sql_query;
    result := jsonb_build_object('success', true, 'message', 'SQL executed successfully');
    RETURN result;
EXCEPTION WHEN OTHERS THEN
    result := jsonb_build_object('success', false, 'error', SQLERRM, 'detail', SQLSTATE);
    RETURN result;
END;
$$;

-- Grant execute to service_role only (security)
REVOKE ALL ON FUNCTION exec_sql(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION exec_sql(TEXT) TO service_role;

-- Add comment
COMMENT ON FUNCTION exec_sql IS 'Execute arbitrary SQL - service_role only. Use for migrations.';

-- Verify it works
SELECT exec_sql('SELECT 1');
