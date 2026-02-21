
-- Add per-user 2FA requirement flag to profiles
ALTER TABLE public.profiles ADD COLUMN require_2fa boolean NOT NULL DEFAULT false;
