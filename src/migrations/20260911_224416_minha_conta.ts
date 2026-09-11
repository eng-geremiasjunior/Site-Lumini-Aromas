import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "orders_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer
  );
  
  ALTER TABLE "orders_items" ADD COLUMN "art_approved_at" timestamp(3) with time zone;
  ALTER TABLE "orders" ADD COLUMN "tracking_token" varchar;
  ALTER TABLE "orders" ADD COLUMN "date_shipped" timestamp(3) with time zone;
  ALTER TABLE "orders" ADD COLUMN "date_completed" timestamp(3) with time zone;
  ALTER TABLE "orders_rels" ADD CONSTRAINT "orders_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "orders_rels" ADD CONSTRAINT "orders_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "orders_rels_order_idx" ON "orders_rels" USING btree ("order");
  CREATE INDEX "orders_rels_parent_idx" ON "orders_rels" USING btree ("parent_id");
  CREATE INDEX "orders_rels_path_idx" ON "orders_rels" USING btree ("path");
  CREATE INDEX "orders_rels_media_id_idx" ON "orders_rels" USING btree ("media_id");
  CREATE UNIQUE INDEX "orders_tracking_token_idx" ON "orders" USING btree ("tracking_token");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "orders_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "orders_rels" CASCADE;
  DROP INDEX "orders_tracking_token_idx";
  ALTER TABLE "orders_items" DROP COLUMN "art_approved_at";
  ALTER TABLE "orders" DROP COLUMN "tracking_token";
  ALTER TABLE "orders" DROP COLUMN "date_shipped";
  ALTER TABLE "orders" DROP COLUMN "date_completed";`)
}
