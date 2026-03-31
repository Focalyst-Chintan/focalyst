-- Add provider column to track payment gateway (razorpay or polar)
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS provider TEXT CHECK (provider IN ('razorpay', 'polar'));

-- Also add polar columns that may be missing
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS polar_payment_id TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS polar_subscription_id TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS polar_order_id TEXT;
