/*
  # Fix System Settings JSON Syntax Error

  1. Updates
    - Fix the empty string value in allowed_ips setting
    - Ensure all JSON values are properly formatted
    - Add proper escaping for string values

  2. Changes Made
    - Update allowed_ips setting to use proper JSON string format
    - Fix any other potential JSON formatting issues
*/

-- Update the problematic setting with proper JSON formatting
UPDATE system_settings 
SET value = '""'
WHERE category = 'security' AND key = 'allowed_ips';

-- Ensure all other settings have proper JSON formatting
UPDATE system_settings 
SET value = '"' || value || '"'
WHERE category IN ('security', 'notifications', 'analytics', 'advanced')
  AND key NOT IN ('max_login_attempts', 'session_timeout_hours', 'database_backup_frequency', 'log_retention_days', 'api_rate_limit', 'cache_ttl', 'data_retention_days')
  AND value NOT LIKE '"%"'
  AND value NOT IN ('true', 'false');

-- Fix specific boolean values that might be incorrectly formatted
UPDATE system_settings 
SET value = CASE 
  WHEN value = 'true' THEN 'true'
  WHEN value = 'false' THEN 'false'
  ELSE value
END
WHERE value IN ('true', 'false');

-- Fix numeric values to ensure they're not quoted
UPDATE system_settings 
SET value = TRIM('"' FROM value)
WHERE category IN ('security', 'analytics', 'advanced')
  AND key IN ('max_login_attempts', 'session_timeout_hours', 'database_backup_frequency', 'log_retention_days', 'api_rate_limit', 'cache_ttl', 'data_retention_days')
  AND value LIKE '"%"';

-- Verify and fix any remaining JSON formatting issues
DO $$
DECLARE
    setting_record RECORD;
    test_json JSONB;
BEGIN
    FOR setting_record IN 
        SELECT id, category, key, value 
        FROM system_settings 
    LOOP
        BEGIN
            -- Test if the value is valid JSON
            test_json := setting_record.value::JSONB;
        EXCEPTION WHEN OTHERS THEN
            -- If not valid JSON, wrap simple values in quotes
            IF setting_record.value ~ '^[0-9]+(\.[0-9]+)?$' THEN
                -- It's a number, keep as is
                CONTINUE;
            ELSIF setting_record.value IN ('true', 'false') THEN
                -- It's a boolean, keep as is
                CONTINUE;
            ELSE
                -- It's a string, wrap in quotes
                UPDATE system_settings 
                SET value = '"' || REPLACE(setting_record.value, '"', '\"') || '"'
                WHERE id = setting_record.id;
            END IF;
        END;
    END LOOP;
END $$;