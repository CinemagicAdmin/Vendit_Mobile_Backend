-- Add category field to machines table
-- This field stores the machine category from the remote vending_machines API

ALTER TABLE machines ADD COLUMN IF NOT EXISTS category TEXT;

-- Add index for filtering by category
CREATE INDEX IF NOT EXISTS idx_machines_category ON machines(category);
