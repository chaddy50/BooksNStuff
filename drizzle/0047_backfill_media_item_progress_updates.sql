-- Custom SQL migration file, put your code below! --
-- One-time backfill: before this feature, progress history didn't exist, only
-- the current progressPercent value. Seed one synthetic update per existing
-- instance that has progress, dated at its completion (or last update, if
-- still in progress), so historical months keep the totals they show today.
INSERT INTO media_item_progress_updates (media_item_instance_id, progress_percent_delta, recorded_at)
SELECT id, progress_percent, COALESCE(completed_at, updated_at::date)
FROM media_item_instances
WHERE progress_percent IS NOT NULL AND progress_percent > 0;
