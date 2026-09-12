import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "orders" ADD COLUMN "payment_receipt_id" integer;
  ALTER TABLE "orders" ADD CONSTRAINT "orders_payment_receipt_id_media_id_fk" FOREIGN KEY ("payment_receipt_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "orders_payment_receipt_idx" ON "orders" USING btree ("payment_receipt_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "orders" DROP CONSTRAINT "orders_payment_receipt_id_media_id_fk";
  
  DROP INDEX "orders_payment_receipt_idx";
  ALTER TABLE "orders" DROP COLUMN "payment_receipt_id";`)
}
