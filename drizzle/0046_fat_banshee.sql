CREATE TABLE "media_item_progress_updates" (
	"id" serial PRIMARY KEY NOT NULL,
	"media_item_instance_id" integer NOT NULL,
	"progress_percent_delta" numeric(7, 4) NOT NULL,
	"recorded_at" date NOT NULL
);
--> statement-breakpoint
ALTER TABLE "media_item_progress_updates" ADD CONSTRAINT "media_item_progress_updates_media_item_instance_id_media_item_instances_id_fk" FOREIGN KEY ("media_item_instance_id") REFERENCES "public"."media_item_instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "media_item_progress_updates_mediaItemInstanceId_idx" ON "media_item_progress_updates" USING btree ("media_item_instance_id");