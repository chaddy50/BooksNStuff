ALTER TABLE "custom_reports" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "custom_reports" CASCADE;--> statement-breakpoint
ALTER TABLE "user_settings" DROP COLUMN "active_custom_report_id";