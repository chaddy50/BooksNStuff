CREATE TABLE "next_up_item_order" (
	"user_id" text NOT NULL,
	"media_item_id" integer NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "next_up_item_order_user_id_media_item_id_pk" PRIMARY KEY("user_id","media_item_id")
);
--> statement-breakpoint
ALTER TABLE "next_up_item_order" ADD CONSTRAINT "next_up_item_order_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "next_up_item_order" ADD CONSTRAINT "next_up_item_order_media_item_id_media_items_id_fk" FOREIGN KEY ("media_item_id") REFERENCES "public"."media_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "next_up_item_order_userId_position_idx" ON "next_up_item_order" USING btree ("user_id","position");