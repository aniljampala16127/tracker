-- ============================================
-- Add visa_country and subcategory to applications
-- Run this in Supabase SQL Editor
-- ============================================

ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS visa_country text;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS subcategory text;
