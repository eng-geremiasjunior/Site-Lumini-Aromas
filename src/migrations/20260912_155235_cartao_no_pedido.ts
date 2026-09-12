import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_integration_events_tipo" ADD VALUE 'cartao_presente' BEFORE 'meta_capi';
  ALTER TABLE "orders" ADD COLUMN "cartao_presente_a_emitir_valor_centavos" numeric;
  ALTER TABLE "orders" ADD COLUMN "cartao_presente_a_emitir_de" varchar;
  ALTER TABLE "orders" ADD COLUMN "cartao_presente_a_emitir_para" varchar;
  ALTER TABLE "orders" ADD COLUMN "cartao_presente_a_emitir_email_do_destinatario" varchar;
  ALTER TABLE "orders" ADD COLUMN "cartao_presente_a_emitir_mensagem" varchar;
  ALTER TABLE "orders" ADD COLUMN "cartao_presente_a_emitir_enviar_em" timestamp(3) with time zone;
  ALTER TABLE "orders" ADD COLUMN "cartao_presente_a_emitir_emitido" boolean DEFAULT false;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "integration_events" ALTER COLUMN "tipo" SET DATA TYPE text;
  DROP TYPE "public"."enum_integration_events_tipo";
  CREATE TYPE "public"."enum_integration_events_tipo" AS ENUM('email', 'meta_capi', 'ga4', 'google_ads', 'whatsapp', 'dre');
  ALTER TABLE "integration_events" ALTER COLUMN "tipo" SET DATA TYPE "public"."enum_integration_events_tipo" USING "tipo"::"public"."enum_integration_events_tipo";
  ALTER TABLE "orders" DROP COLUMN "cartao_presente_a_emitir_valor_centavos";
  ALTER TABLE "orders" DROP COLUMN "cartao_presente_a_emitir_de";
  ALTER TABLE "orders" DROP COLUMN "cartao_presente_a_emitir_para";
  ALTER TABLE "orders" DROP COLUMN "cartao_presente_a_emitir_email_do_destinatario";
  ALTER TABLE "orders" DROP COLUMN "cartao_presente_a_emitir_mensagem";
  ALTER TABLE "orders" DROP COLUMN "cartao_presente_a_emitir_enviar_em";
  ALTER TABLE "orders" DROP COLUMN "cartao_presente_a_emitir_emitido";`)
}
