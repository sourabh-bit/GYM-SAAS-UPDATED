-- Razorpay payment link support

ALTER TABLE public.payment_intents
  ADD COLUMN IF NOT EXISTS gateway_payment_link_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_link_url TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_intents_payment_link
  ON public.payment_intents (gateway_payment_link_id)
  WHERE gateway_payment_link_id IS NOT NULL;
