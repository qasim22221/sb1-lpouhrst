/*
  # Fix JSON formatting errors in system settings

  1. Issues Fixed
    - Fix empty string value for 'allowed_ips' setting
    - Fix email address value for 'admin_email' setting
    - Ensure all string values are properly quoted for JSON
    - Fix any other malformed JSON values

  2. Changes Made
    - Update problematic settings with proper JSON string formatting
    - Add validation to ensure all values are valid JSON
    - Fix specific cases that were causing parse errors
*/

-- Fix the specific problematic settings
UPDATE system_settings 
SET value = '""'
WHERE category = 'security' AND key = 'allowed_ips' AND value = '';

UPDATE system_settings 
SET value = '"admin@referralhub.com"'
WHERE category = 'notifications' AND key = 'admin_email' AND value = 'admin@referralhub.com';

-- Fix all string values that aren't properly quoted
UPDATE system_settings 
SET value = '"' || value || '"'
WHERE value NOT LIKE '"%"'
  AND value NOT IN ('true', 'false')
  AND value !~ '^[0-9]+(\.[0-9]+)?$'
  AND LENGTH(value) > 0;

-- Ensure boolean values are not quoted
UPDATE system_settings 
SET value = CASE 
  WHEN value = '"true"' THEN 'true'
  WHEN value = '"false"' THEN 'false'
  ELSE value
END
WHERE value IN ('"true"', '"false"');

-- Ensure numeric values are not quoted
UPDATE system_settings 
SET value = TRIM('"' FROM value)
WHERE value ~ '^"[0-9]+(\.[0-9]+)?"$';

-- Add a validation function to check JSON formatting
CREATE OR REPLACE FUNCTION validate_system_settings_json()
RETURNS VOID AS $$
DECLARE
    setting_record RECORD;
    test_json JSONB;
    error_count INTEGER := 0;
BEGIN
    FOR setting_record IN 
        SELECT id, category, key, value 
        FROM system_settings 
    LOOP
        BEGIN
            -- Test if the value is valid JSON
            test_json := setting_record.value::JSONB;
            RAISE NOTICE 'Valid JSON for %.%: %', setting_record.category, setting_record.key, setting_record.value;
        EXCEPTION WHEN OTHERS THEN
            error_count := error_count + 1;
            RAISE WARNING 'Invalid JSON for %.%: % - Error: %', 
                setting_record.category, 
                setting_record.key, 
                setting_record.value, 
                SQLERRM;
            
            -- Try to fix common issues
            IF setting_record.value = '' THEN
                UPDATE system_settings 
                SET value = '""'
                WHERE id = setting_record.id;
                RAISE NOTICE 'Fixed empty string for %.%', setting_record.category, setting_record.key;
            ELSIF setting_record.value ~ '^[a-zA-Z0-9@._-]+$' AND setting_record.value NOT IN ('true', 'false') THEN
                -- Looks like an unquoted string
                UPDATE system_settings 
                SET value = '"' || setting_record.value || '"'
                WHERE id = setting_record.id;
                RAISE NOTICE 'Fixed unquoted string for %.%', setting_record.category, setting_record.key;
            END IF;
        END;
    END LOOP;
    
    IF error_count > 0 THEN
        RAISE NOTICE 'Found and attempted to fix % JSON formatting errors', error_count;
    ELSE
        RAISE NOTICE 'All system settings have valid JSON formatting';
    END IF;
END $$;

-- Run the validation and fix function
SELECT validate_system_settings_json();

-- Drop the validation function as it's only needed for this migration
DROP FUNCTION validate_system_settings_json();

-- Add a constraint to ensure future values are valid JSON
ALTER TABLE system_settings 
ADD CONSTRAINT valid_json_value 
CHECK (value::jsonb IS NOT NULL);

-- Create a trigger to validate JSON on insert/update
CREATE OR REPLACE FUNCTION validate_json_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- Test if the value is valid JSON
    PERFORM NEW.value::JSONB;
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Invalid JSON value for setting %.%: %', NEW.category, NEW.key, NEW.value;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_system_settings_json_trigger
    BEFORE INSERT OR UPDATE ON system_settings
    FOR EACH ROW
    EXECUTE FUNCTION validate_json_trigger();