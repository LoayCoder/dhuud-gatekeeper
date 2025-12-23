-- Add missing updated_at column to push_subscriptions table
ALTER TABLE public.push_subscriptions 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create trigger to auto-update the updated_at column
CREATE OR REPLACE FUNCTION public.update_push_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_push_subscriptions_updated_at ON public.push_subscriptions;

CREATE TRIGGER update_push_subscriptions_updated_at
BEFORE UPDATE ON public.push_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_push_subscriptions_updated_at();