-- Add descriptions/comments for all tables in Supabase
-- These appear in Supabase Dashboard table descriptions

-- Core Tables
COMMENT ON TABLE users IS 'App users - registered via mobile app with phone/email authentication';
COMMENT ON TABLE admins IS 'Admin users - access to admin dashboard for management';
COMMENT ON TABLE categories IS 'Product categories - used to group products in machines';
COMMENT ON TABLE machines IS 'Vending machines - synced from remote Vendron API';
COMMENT ON TABLE products IS 'Products catalog - synced from remote API, linked to categories';
COMMENT ON TABLE machine_slots IS 'Machine slot inventory - links machines to products with quantity/pricing';

-- Transaction Tables
COMMENT ON TABLE payments IS 'Payment transactions - tracks all purchases via Tap Payments';
COMMENT ON TABLE payment_products IS 'Payment line items - products included in each payment';
COMMENT ON TABLE carts IS 'Shopping carts - temporary storage before checkout';
COMMENT ON TABLE wallet IS 'User wallets - balance for in-app payments';
COMMENT ON TABLE cards IS 'Saved payment cards - tokenized via Tap Payments';
-- Note: wallet_transactions comment is added in 20251216123000_add_wallet_transactions.sql

-- Loyalty & Referrals
COMMENT ON TABLE loyalty_points IS 'Loyalty points transactions - tracks individual point earnings and redemptions';
COMMENT ON TABLE user_loyalty_points IS 'User loyalty points balance - aggregate balance per user';
COMMENT ON TABLE referrals IS 'Referral tracking - inviter/invitee relationships and rewards';

-- Marketing & Engagement
COMMENT ON TABLE campaigns IS 'Marketing campaigns - ads/promotions displayed in app';
COMMENT ON TABLE campaign_views IS 'Campaign analytics - tracks user views and engagement';
COMMENT ON TABLE ratings IS 'Product/order ratings - user reviews and feedback';
COMMENT ON TABLE contact_us IS 'Support tickets - user inquiries and feedback';

-- System Tables
COMMENT ON TABLE notifications IS 'User notifications - push/in-app alerts for users';
COMMENT ON TABLE admin_notifications IS 'Admin notifications - alerts for admin dashboard';
COMMENT ON TABLE audit_logs IS 'Audit trail - security and compliance logging';
COMMENT ON TABLE static_content IS 'CMS content - privacy policy, terms, FAQ, about us';
COMMENT ON TABLE password_reset_tokens IS 'Password reset tokens - temporary tokens for password recovery';
COMMENT ON TABLE machine_webhooks IS 'Webhook logs - incoming machine/payment webhook payloads';
COMMENT ON TABLE schema_migrations IS 'Migration tracking - applied database migrations';
