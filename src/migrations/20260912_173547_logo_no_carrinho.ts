import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "carts_items" ADD COLUMN "art_file_id" integer;
  ALTER TABLE "carts_items" ADD CONSTRAINT "carts_items_art_file_id_media_id_fk" FOREIGN KEY ("art_file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "carts_items_art_file_idx" ON "carts_items" USING btree ("art_file_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "carts_items" DROP CONSTRAINT "carts_items_art_file_id_media_id_fk";
  
  DROP INDEX "carts_items_art_file_idx";
  ALTER TABLE "carts_items" DROP COLUMN "art_file_id";`)
}
