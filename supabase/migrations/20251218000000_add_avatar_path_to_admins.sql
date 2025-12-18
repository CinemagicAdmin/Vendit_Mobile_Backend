-- Add avatar_path column to admins table
-- This allows admin users to upload and store profile avatars

ALTER TABLE admins 
ADD COLUMN IF NOT EXISTS avatar_path VARCHAR(500);

-- Add comment explaining the column
COMMENT ON COLUMN admins.avatar_path IS 'Path to admin profile avatar image in storage';
