import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_integration_events_tipo" AS ENUM('email', 'meta_capi', 'ga4', 'google_ads', 'whatsapp', 'dre');
  CREATE TYPE "public"."enum_integration_events_situacao" AS ENUM('pendente', 'enviado', 'falhou', 'desistiu');
  CREATE TABLE "integration_events" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tipo" "enum_integration_events_tipo" NOT NULL,
  	"situacao" "enum_integration_events_situacao" DEFAULT 'pendente' NOT NULL,
  	"order_id" integer,
  	"dedupe_key" varchar NOT NULL,
  	"payload" jsonb,
  	"tentativas" numeric DEFAULT 0,
  	"proxima_tentativa_em" timestamp(3) with time zone,
  	"enviado_em" timestamp(3) with time zone,
  	"erro" varchar,
  	"reenviar" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "integration_events_id" integer;
  ALTER TABLE "integration_events" ADD CONSTRAINT "integration_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "integration_events_order_idx" ON "integration_events" USING btree ("order_id");
  CREATE UNIQUE INDEX "integration_events_dedupe_key_idx" ON "integration_events" USING btree ("dedupe_key");
  CREATE INDEX "integration_events_updated_at_idx" ON "integration_events" USING btree ("updated_at");
  CREATE INDEX "integration_events_created_at_idx" ON "integration_events" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_integration_events_fk" FOREIGN KEY ("integration_events_id") REFERENCES "public"."integration_events"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_integration_events_id_idx" ON "payload_locked_documents_rels" USING btree ("integration_events_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "integration_events" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "integration_events" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_integration_events_fk";
  
  DROP INDEX "payload_locked_documents_rels_integration_events_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "integration_events_id";
  DROP TYPE "public"."enum_integration_events_tipo";
  DROP TYPE "public"."enum_integration_events_situacao";`)
}
