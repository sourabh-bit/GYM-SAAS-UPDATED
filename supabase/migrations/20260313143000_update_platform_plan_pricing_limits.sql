-- Update platform plan pricing and member limits to latest tiers
-- Basic: 499 / 30 members
-- Growth: 999 / 50+ members
-- Pro: 1499 / Unlimited members

UPDATE public.platform_plans
SET
  name = 'Basic',
  price = 499,
  max_members = 30,
  features = '["Member management", "Attendance tracking", "Basic reports", "Due tracking", "Email support"]'::jsonb
WHERE lower(name) IN ('starter', 'basic');

UPDATE public.platform_plans
SET
  name = 'Growth',
  price = 999,
  max_members = 50,
  features = '["Payment collection", "Trainer management", "Advanced reports", "PDF exports", "Priority support"]'::jsonb
WHERE lower(name) IN ('professional', 'growth', 'business', 'standard');

UPDATE public.platform_plans
SET
  name = 'Pro',
  price = 1499,
  max_members = 9999,
  features = '["Member app premium", "Gamification", "Retention tools", "Priority support", "Multi-location support"]'::jsonb
WHERE lower(name) IN ('enterprise', 'pro', 'premium', 'elite');
