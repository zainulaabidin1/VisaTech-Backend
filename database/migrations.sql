-- ============================================
-- Payment & Admin Workflow Database Migrations
-- Run these queries in PostgreSQL
-- ============================================

-- 1. Add role column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS role VARCHAR(10) DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- 2. Create payments table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NULL,
    status VARCHAR(30) DEFAULT 'pending_amount' CHECK (status IN ('pending_amount', 'pending_payment', 'pending_verification', 'approved', 'rejected')),
    bank_account_title VARCHAR(255) DEFAULT 'EasyPaisa Account',
    bank_account_number VARCHAR(50) DEFAULT '03001234567',
    payment_method VARCHAR(50) DEFAULT 'easypaisa',
    screenshot_url TEXT NULL,
    transaction_id VARCHAR(100) NULL,
    admin_notes TEXT NULL,
    reviewed_by UUID NULL REFERENCES users(id),
    reviewed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- 4. Create a trigger to auto-update 'updated_at' on payments table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 5. Create an admin user (change email and password as needed)
-- Password should be pre-hashed with bcrypt before inserting
-- This is just a placeholder INSERT - hash password in your app or use a tool
-- INSERT INTO users (email, password_hash, first_name, last_name, role, is_verified, is_active)
-- VALUES ('admin@visaa.com', '$2a$12$YOUR_HASHED_PASSWORD_HERE', 'Admin', 'User', 'admin', true, true);

-- ============================================
-- Quick Setup Queries (Run after migrations)
-- ============================================

-- Create payment record for all existing users
INSERT INTO payments (user_id, status)
SELECT id, 'pending_amount' FROM users WHERE role = 'user'
ON CONFLICT DO NOTHING;
