-- =====================================================
-- VEND-IT DATABASE RESET & CONSOLIDATED SCHEMA
-- =====================================================
-- Run this in Supabase SQL Editor to:
-- 1. Drop ALL existing tables
-- 2. Recreate with correct structure and constraints
-- =====================================================

-- STEP 1: DROP ALL EXISTING TABLES (CASCADE removes dependencies)
DROP TABLE IF EXISTS admin_notifications CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS referrals CASCADE;
DROP TABLE IF EXISTS machine_slots CASCADE;
DROP TABLE IF EXISTS machine_webhooks CASCADE;
DROP TABLE IF EXISTS payment_products CASCADE;
DROP TABLE IF EXISTS loyalty_points CASCADE;
DROP TABLE IF EXISTS user_loyalty_points CASCADE;
DROP TABLE IF EXISTS campaignview CASCADE;
DROP TABLE IF EXISTS campaign_views CASCADE;
DROP TABLE IF EXISTS ratings CASCADE;
DROP TABLE IF EXISTS contact_us CASCADE;
DROP TABLE IF EXISTS carts CASCADE;
DROP TABLE IF EXISTS cards CASCADE;
DROP TABLE IF EXISTS wallet CASCADE;
DROP TABLE IF EXISTS wallets CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS product CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS category CASCADE;
DROP TABLE IF EXISTS machines CASCADE;
DROP TABLE IF EXISTS machine CASCADE;
DROP TABLE IF EXISTS static_content CASCADE;
DROP TABLE IF EXISTS admins CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS password_reset_tokens CASCADE;
DROP TABLE IF EXISTS personal_access_tokens CASCADE;
DROP TABLE IF EXISTS failed_jobs CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;
DROP TABLE IF EXISTS job_batches CASCADE;
DROP TABLE IF EXISTS cache CASCADE;
DROP TABLE IF EXISTS cache_locks CASCADE;
DROP TABLE IF EXISTS migrations CASCADE;
DROP TABLE IF EXISTS schema_migrations CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS wallet_increment CASCADE;
DROP FUNCTION IF EXISTS wallet_decrement CASCADE;
DROP FUNCTION IF EXISTS loyalty_increment CASCADE;
DROP FUNCTION IF EXISTS cleanup_old_audit_logs CASCADE;

-- =====================================================
-- STEP 2: CREATE TABLES
-- =====================================================

-- Schema Migrations Tracking
CREATE TABLE schema_migrations (
    name VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    email VARCHAR(255) UNIQUE,
    phone_number VARCHAR(20) UNIQUE,
    password VARCHAR(255),
    user_profile TEXT,
    date_of_birth DATE,
    dob DATE,
    age INTEGER,
    gender VARCHAR(20),
    country VARCHAR(255),
    country_code VARCHAR(10),
    address TEXT,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    is_verified INTEGER DEFAULT 0,
    is_otp_verify INTEGER DEFAULT 0,
    is_notification INTEGER DEFAULT 0,
    is_online INTEGER DEFAULT 0,
    otp VARCHAR(6),
    otp_expires_at TIMESTAMP,
    fcm_token TEXT,
    device_token TEXT,
    device_type VARCHAR(50),
    status INTEGER DEFAULT 1,
    is_active INTEGER DEFAULT 1,
    tap_customer_id VARCHAR(255),
    user_socket_token TEXT,
    user_chat_token TEXT,
    video_url TEXT,
    last_login_at TIMESTAMP,
    referral_code TEXT UNIQUE,
    referrer_user_id UUID REFERENCES users(id),
    referral_rewarded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admins Table
CREATE TABLE admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin',
    parent_admin_id UUID REFERENCES admins(id),
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories Table
CREATE TABLE categories (
    id BIGSERIAL PRIMARY KEY,
    category_u_id VARCHAR(255),
    category_name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    icon_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Machines Table
CREATE TABLE machines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    u_id VARCHAR(255) UNIQUE NOT NULL,
    machine_tag VARCHAR(255),
    model VARCHAR(255),
    serial_no VARCHAR(255),
    description TEXT,
    manufacturer VARCHAR(255),
    specification TEXT,
    country VARCHAR(255),
    state_province VARCHAR(255),
    location_address TEXT,
    location_latitude DECIMAL(10,8),
    location_longitude DECIMAL(11,8),
    mac_address VARCHAR(255),
    security_id VARCHAR(255),
    machine_image_url TEXT,
    machine_operation_state VARCHAR(255),
    subscription_expiry DATE,
    last_hearbeat TIMESTAMP,
    last_machine_status VARCHAR(255),
    machine_currency VARCHAR(255),
    machine_pin VARCHAR(255),
    machine_qrcode TEXT,
    machine_socket TEXT DEFAULT 'wss://eu.vendron.com:1234/publicV2',
    distance DOUBLE PRECISION,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products Table
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_u_id VARCHAR(255) UNIQUE NOT NULL,
    machine_id UUID REFERENCES machines(id) ON DELETE SET NULL,
    category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
    brand_name VARCHAR(255),
    description TEXT,
    vendor_part_no VARCHAR(255),
    for_sale BOOLEAN DEFAULT TRUE,
    quantity INTEGER DEFAULT 0,
    max_quantity INTEGER,
    health_rating INTEGER DEFAULT 0,
    unit_price DECIMAL(10,2),
    cost_price DECIMAL(10,2),
    product_image_url TEXT,
    product_detail_image_url TEXT,
    product_type VARCHAR(100),
    storage_location_detail JSONB,
    metadata JSONB,
    category_name VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Machine Slots Table
CREATE TABLE machine_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_u_id VARCHAR(255) NOT NULL,
    slot_number VARCHAR(50) NOT NULL,
    product_u_id VARCHAR(255),
    quantity INTEGER DEFAULT 0,
    max_quantity INTEGER DEFAULT 0,
    price DECIMAL(10,2),
    raw JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(machine_u_id, slot_number)
);

-- Carts Table
CREATE TABLE carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    machine_u_id VARCHAR(255),
    slot_number VARCHAR(50),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    product_u_id VARCHAR(255),
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, machine_u_id, slot_number, product_u_id)
);

-- Cards Table
CREATE TABLE cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    tap_card_id VARCHAR(255),
    last4 VARCHAR(4),
    card_brand VARCHAR(50),
    holder_name VARCHAR(255),
    exp_month VARCHAR(2),
    exp_year VARCHAR(4),
    account_number VARCHAR(255),
    expiry_month VARCHAR(255),
    expiry_year VARCHAR(255),
    name VARCHAR(255),
    card_id VARCHAR(255),
    card_token_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, tap_card_id)
);

-- Wallet Table
CREATE TABLE wallet (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    balance DECIMAL(12,3) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'KWD',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payments Table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    machine_id UUID REFERENCES machines(id) ON DELETE SET NULL,
    machine_u_id VARCHAR(255) REFERENCES machines(u_id) ON DELETE SET NULL,
    transaction_id VARCHAR(255) UNIQUE,
    charge_id VARCHAR(255),
    status VARCHAR(50),
    payment_method VARCHAR(50),
    amount DECIMAL(12,3),
    currency VARCHAR(10) DEFAULT 'KWD',
    earned_points DECIMAL(12,3) DEFAULT 0,
    redeemed_points DECIMAL(12,3) DEFAULT 0,
    redeemed_amount DECIMAL(12,3) DEFAULT 0,
    tap_customer_id VARCHAR(255),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment Products Table
CREATE TABLE payment_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_u_id VARCHAR(255) REFERENCES products(product_u_id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2),
    total_price DECIMAL(10,2),
    dispensed_quantity INTEGER DEFAULT 0,
    dispense_status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Loyalty Points Transaction Log Table
CREATE TABLE loyalty_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
    points DECIMAL(12,3) DEFAULT 0,
    type VARCHAR(50),
    reason TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Loyalty Points Balance Table
CREATE TABLE user_loyalty_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    points_balance DECIMAL(12,3) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Referrals Table
CREATE TABLE referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inviter_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invited_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    invited_phone TEXT NOT NULL,
    referral_code TEXT,
    branch_identity TEXT,
    branch_install_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    metadata JSONB DEFAULT '{}',
    rewarded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campaigns Table
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255),
    description TEXT,
    image_url TEXT,
    video_url TEXT,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    utc_start_date TIMESTAMP,
    utc_end_date TIMESTAMP,
    target_audience VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    view_count INTEGER DEFAULT 0,
    click_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campaign Views Table
CREATE TABLE campaign_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    viewed_at TIMESTAMPTZ DEFAULT NOW(),
    duration_seconds INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ratings Table
CREATE TABLE ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    machine_id UUID REFERENCES machines(id) ON DELETE CASCADE,
    order_id UUID REFERENCES payments(id) ON DELETE CASCADE,
    payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    emoji VARCHAR(50),
    comment TEXT,
    review TEXT,
    is_approved BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contact Us Table
CREATE TABLE contact_us (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(255),
    email VARCHAR(255) NOT NULL,
    subject VARCHAR(255),
    message TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    replied_at TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Static Content Table
CREATE TABLE static_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) UNIQUE,
    title VARCHAR(255),
    content TEXT,
    type VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications Table (User Notifications)
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255),
    body TEXT,
    status VARCHAR(10) DEFAULT '0',
    type VARCHAR(50),
    data JSONB,
    sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
    receiver_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    payment_id UUID,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin Notifications Table
CREATE TABLE admin_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES admins(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
    read BOOLEAN DEFAULT FALSE,
    link VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Logs Table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action VARCHAR(100) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    admin_id UUID REFERENCES admins(id) ON DELETE SET NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(255),
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Password Reset Tokens
CREATE TABLE password_reset_tokens (
    email VARCHAR(255) PRIMARY KEY,
    token VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Machine Webhooks Logging
CREATE TABLE machine_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source VARCHAR(100),
    headers JSONB,
    payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- STEP 3: CREATE INDEXES
-- =====================================================

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone_number);
CREATE INDEX idx_users_referral_code ON users(referral_code);
CREATE INDEX idx_machines_u_id ON machines(u_id);
CREATE INDEX idx_machines_location ON machines(location_latitude, location_longitude);
CREATE INDEX idx_products_product_u_id ON products(product_u_id);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_machine_id ON products(machine_id);
CREATE INDEX idx_machine_slots_machine_u_id ON machine_slots(machine_u_id);
CREATE INDEX idx_machine_slots_product_u_id ON machine_slots(product_u_id);
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_transaction_id ON payments(transaction_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_carts_user_id ON carts(user_id);
CREATE INDEX idx_notifications_receiver ON notifications(receiver_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_admin_notifications_admin ON admin_notifications(admin_id);
CREATE INDEX idx_admin_notifications_unread ON admin_notifications(admin_id, read) WHERE read = false;
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_audit_logs_admin_id ON audit_logs(admin_id) WHERE admin_id IS NOT NULL;
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_referrals_inviter ON referrals(inviter_user_id);
CREATE INDEX idx_referrals_status ON referrals(status);
CREATE INDEX idx_campaign_views_user ON campaign_views(user_id);
CREATE INDEX idx_campaign_views_campaign ON campaign_views(campaign_id);
CREATE INDEX idx_ratings_user ON ratings(user_id);
CREATE INDEX idx_ratings_product ON ratings(product_id);
CREATE INDEX idx_loyalty_points_user ON loyalty_points(user_id);
CREATE INDEX idx_loyalty_points_payment ON loyalty_points(payment_id);
CREATE INDEX idx_loyalty_points_type ON loyalty_points(type);
CREATE INDEX idx_user_loyalty_points_user ON user_loyalty_points(user_id);

-- =====================================================
-- STEP 4: CREATE FUNCTIONS
-- =====================================================

-- Wallet Increment
CREATE OR REPLACE FUNCTION wallet_increment(p_user_id UUID, p_amount NUMERIC)
RETURNS TABLE (balance NUMERIC)
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE wallet SET balance = COALESCE(wallet.balance, 0) + p_amount, updated_at = NOW()
  WHERE user_id = p_user_id;
  IF NOT FOUND THEN
    INSERT INTO wallet (user_id, balance) VALUES (p_user_id, p_amount);
  END IF;
  RETURN QUERY SELECT wallet.balance FROM wallet WHERE user_id = p_user_id;
END;
$$;

-- Wallet Decrement
CREATE OR REPLACE FUNCTION wallet_decrement(p_user_id UUID, p_amount NUMERIC)
RETURNS TABLE (balance NUMERIC)
LANGUAGE plpgsql AS $$
DECLARE current_balance NUMERIC;
BEGIN
  SELECT wallet.balance INTO current_balance FROM wallet WHERE user_id = p_user_id FOR UPDATE;
  IF current_balance IS NULL OR current_balance < p_amount THEN
    RAISE EXCEPTION 'insufficient_wallet_balance';
  END IF;
  UPDATE wallet SET balance = wallet.balance - p_amount, updated_at = NOW() WHERE user_id = p_user_id;
  RETURN QUERY SELECT wallet.balance FROM wallet WHERE user_id = p_user_id;
END;
$$;

-- Loyalty Increment
CREATE OR REPLACE FUNCTION loyalty_increment(p_user_id UUID, p_points NUMERIC)
RETURNS TABLE (balance NUMERIC)
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE user_loyalty_points SET points_balance = COALESCE(user_loyalty_points.points_balance, 0) + p_points, updated_at = NOW()
  WHERE user_id = p_user_id;
  IF NOT FOUND THEN
    INSERT INTO user_loyalty_points (user_id, points_balance) VALUES (p_user_id, p_points);
  END IF;
  RETURN QUERY SELECT user_loyalty_points.points_balance FROM user_loyalty_points WHERE user_id = p_user_id;
END;
$$;

-- Audit Log Cleanup
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE deleted_count INTEGER;
BEGIN
  DELETE FROM audit_logs WHERE created_at < NOW() - (days_to_keep || ' days')::INTERVAL;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- =====================================================
-- STEP 5: ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages notifications" ON notifications FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role manages admin notifications" ON admin_notifications FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role manages audit logs" ON audit_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =====================================================
-- STEP 6: SEED DATA
-- =====================================================

-- Default Admin
INSERT INTO admins (name, email, password) VALUES
('admin', 'admin@vendit.com', '$2y$12$Ximf/ONaci1HJBgMSMjAfu.5B9b6CL19A2/y9vMe4/qQnnVK6keUK')
ON CONFLICT (email) DO NOTHING;

-- Default Categories
INSERT INTO categories (category_name, description) VALUES
('All', 'All Products'),
('Snacks', 'Snack items'),
('Drinks', 'Beverages'),
('Healthy', 'Healthy options')
ON CONFLICT (category_name) DO NOTHING;

-- Static Content
INSERT INTO static_content (key, title, content) VALUES
('privacy_policy', 'Privacy Policy', 'Your privacy is important to us...'),
('terms_conditions', 'Terms and Conditions', 'By using Vend-IT, you agree to...'),
('about_us', 'About Vend-IT', 'Vend-IT is a modern vending machine platform...'),
('faq', 'FAQ', 'Frequently Asked Questions...')
ON CONFLICT (key) DO NOTHING;

-- Mark migration as applied
INSERT INTO schema_migrations (name) VALUES ('00000000000000_reset_schema.sql');

-- =====================================================
-- DONE! Your database is now ready.
-- Run: POST /api/machines/sync to populate machines/products
-- =====================================================
