CREATE TABLE "media_item_relations" (
	"media_item_id_a" integer NOT NULL,
	"media_item_id_b" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "media_item_relations_media_item_id_a_media_item_id_b_pk" PRIMARY KEY("media_item_id_a","media_item_id_b")
);
--> statement-breakpoint
ALTER TABLE "media_item_relations" ADD CONSTRAINT "media_item_relations_media_item_id_a_media_items_id_fk" FOREIGN KEY ("media_item_id_a") REFERENCES "public"."media_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_item_relations" ADD CONSTRAINT "media_item_relations_media_item_id_b_media_items_id_fk" FOREIGN KEY ("media_item_id_b") REFERENCES "public"."media_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "media_item_relations_mediaItemIdB_idx" ON "media_item_relations" USING btree ("media_item_id_b");