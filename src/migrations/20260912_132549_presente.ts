import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "orders" ADD COLUMN "shipping_address_recipient_name" varchar;
  ALTER TABLE "orders" ADD COLUMN "presente_eh_presente" boolean DEFAULT false;
  ALTER TABLE "orders" ADD COLUMN "presente_de" varchar;
  ALTER TABLE "orders" ADD COLUMN "presente_para" varchar;
  ALTER TABLE "orders" ADD COLUMN "presente_mensagem" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "orders" DROP COLUMN "shipping_address_recipient_name";
  ALTER TABLE "orders" DROP COLUMN "presente_eh_presente";
  ALTER TABLE "orders" DROP COLUMN "presente_de";
  ALTER TABLE "orders" DROP COLUMN "presente_para";
  ALTER TABLE "orders" DROP COLUMN "presente_mensagem";`)
}
