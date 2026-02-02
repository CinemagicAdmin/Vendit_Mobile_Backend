-- Increase badge_icon length to support URLs (PNG uploads)
ALTER TABLE user_badges ALTER COLUMN badge_icon TYPE VARCHAR(512);
