import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "carts" ADD COLUMN "customer_name" varchar;
  ALTER TABLE "carts" ADD COLUMN "restore_token" varchar;
  ALTER TABLE "carts" ADD COLUMN "recovery_step" numeric DEFAULT 0;
  ALTER TABLE "carts" ADD COLUMN "last_recovery_at" timestamp(3) with time zone;
  CREATE UNIQUE INDEX "carts_restore_token_idx" ON "carts" USING btree ("restore_token");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "carts_restore_token_idx";
  ALTER TABLE "carts" DROP COLUMN "customer_name";
  ALTER TABLE "carts" DROP COLUMN "restore_token";
  ALTER TABLE "carts" DROP COLUMN "recovery_step";
  ALTER TABLE "carts" DROP COLUMN "last_recovery_at";`)
}
