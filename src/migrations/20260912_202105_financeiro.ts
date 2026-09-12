import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_finance_categories_grupo" AS ENUM('receita', 'deducao', 'variavel', 'marketing', 'fixa', 'financeira');
  CREATE TYPE "public"."enum_finance_categories_plataforma" AS ENUM('Meta', 'Google', 'Outros');
  CREATE TYPE "public"."enum_store_settings_anexo_padrao" AS ENUM('II', 'I');
  CREATE TABLE "finance_categories" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"nome" varchar NOT NULL,
  	"grupo" "enum_finance_categories_grupo" DEFAULT 'fixa' NOT NULL,
  	"plataforma" "enum_finance_categories_plataforma",
  	"observacao" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "ledger_entries" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"descricao" varchar NOT NULL,
  	"categoria_id" integer NOT NULL,
  	"valor" numeric NOT NULL,
  	"competencia" timestamp(3) with time zone NOT NULL,
  	"pago_em" timestamp(3) with time zone,
  	"comprovante_id" integer,
  	"pedido_id" integer,
  	"observacao" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "orders" ADD COLUMN "custos_frete_pago" numeric;
  ALTER TABLE "orders" ADD COLUMN "custos_embalagem" numeric;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "finance_categories_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "ledger_entries_id" integer;
  ALTER TABLE "store_settings" ADD COLUMN "rbt12" numeric;
  ALTER TABLE "store_settings" ADD COLUMN "anexo_padrao" "enum_store_settings_anexo_padrao" DEFAULT 'II';
  ALTER TABLE "store_settings" ADD COLUMN "custo_de_embalagem_padrao" numeric;
  ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_categoria_id_finance_categories_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."finance_categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_comprovante_id_media_id_fk" FOREIGN KEY ("comprovante_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_pedido_id_orders_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "finance_categories_updated_at_idx" ON "finance_categories" USING btree ("updated_at");
  CREATE INDEX "finance_categories_created_at_idx" ON "finance_categories" USING btree ("created_at");
  CREATE INDEX "ledger_entries_categoria_idx" ON "ledger_entries" USING btree ("categoria_id");
  CREATE INDEX "ledger_entries_comprovante_idx" ON "ledger_entries" USING btree ("comprovante_id");
  CREATE INDEX "ledger_entries_pedido_idx" ON "ledger_entries" USING btree ("pedido_id");
  CREATE INDEX "ledger_entries_updated_at_idx" ON "ledger_entries" USING btree ("updated_at");
  CREATE INDEX "ledger_entries_created_at_idx" ON "ledger_entries" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_finance_categories_fk" FOREIGN KEY ("finance_categories_id") REFERENCES "public"."finance_categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_ledger_entries_fk" FOREIGN KEY ("ledger_entries_id") REFERENCES "public"."ledger_entries"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_finance_categories_id_idx" ON "payload_locked_documents_rels" USING btree ("finance_categories_id");
  CREATE INDEX "payload_locked_documents_rels_ledger_entries_id_idx" ON "payload_locked_documents_rels" USING btree ("ledger_entries_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "finance_categories" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "ledger_entries" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "finance_categories" CASCADE;
  DROP TABLE "ledger_entries" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_finance_categories_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_ledger_entries_fk";
  
  DROP INDEX "payload_locked_documents_rels_finance_categories_id_idx";
  DROP INDEX "payload_locked_documents_rels_ledger_entries_id_idx";
  ALTER TABLE "orders" DROP COLUMN "custos_frete_pago";
  ALTER TABLE "orders" DROP COLUMN "custos_embalagem";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "finance_categories_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "ledger_entries_id";
  ALTER TABLE "store_settings" DROP COLUMN "rbt12";
  ALTER TABLE "store_settings" DROP COLUMN "anexo_padrao";
  ALTER TABLE "store_settings" DROP COLUMN "custo_de_embalagem_padrao";
  DROP TYPE "public"."enum_finance_categories_grupo";
  DROP TYPE "public"."enum_finance_categories_plataforma";
  DROP TYPE "public"."enum_store_settings_anexo_padrao";`)
}
