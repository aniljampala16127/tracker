-- ============================================
-- Add submit_fingerprint for duplicate prevention
-- Run this BEFORE the cleanup script
-- ============================================

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS submit_fingerprint text;

COMMENT ON COLUMN public.applications.submit_fingerprint IS
  'lowercased initials + country + stream + sponsor_status + submitted_date — enforces uniqueness at DB level';

-- Note: the UNIQUE INDEX is added by CLEANUP_DUPLICATES.sql AFTER
-- existing dupes are removed and the column is backfilled.
SELECT 'submit_fingerprint column added. Now run CLEANUP_DUPLICATES.sql.' AS status;