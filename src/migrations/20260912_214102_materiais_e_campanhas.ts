import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_products_materiais_vinculo" AS ENUM('fixo', 'escolha', 'proporcional');
  CREATE TYPE "public"."enum__products_v_version_materiais_vinculo" AS ENUM('fixo', 'escolha', 'proporcional');
  CREATE TYPE "public"."enum_ledger_entries_origem" AS ENUM('manual', 'importado');
  CREATE TYPE "public"."enum_campaigns_plataforma" AS ENUM('Meta', 'Google', 'Outros');
  CREATE TYPE "public"."enum_campaigns_objetivo" AS ENUM('mensagens', 'venda', 'remarketing', 'alcance');
  CREATE TYPE "public"."enum_supplies_unidade_de_uso" AS ENUM('un', 'g', 'ml', 'cm');
  CREATE TYPE "public"."enum_supplies_unidade_de_compra" AS ENUM('unidade', 'kg', 'litro', 'metro', 'rolo', 'caixa');
  CREATE TABLE "products_materiais_opcoes" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"valor" varchar,
  	"insumo_id" integer
  );
  
  CREATE TABLE "products_materiais" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"vinculo" "enum_products_materiais_vinculo" DEFAULT 'fixo',
  	"insumo_id" integer,
  	"campo" varchar,
  	"quantidade_por_peca" numeric,
  	"informada_em_mililitros" boolean,
  	"insumo_base_id" integer,
  	"para_cada" numeric
  );
  
  CREATE TABLE "_products_v_version_materiais_opcoes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"valor" varchar,
  	"insumo_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_products_v_version_materiais" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"vinculo" "enum__products_v_version_materiais_vinculo" DEFAULT 'fixo',
  	"insumo_id" integer,
  	"campo" varchar,
  	"quantidade_por_peca" numeric,
  	"informada_em_mililitros" boolean,
  	"insumo_base_id" integer,
  	"para_cada" numeric,
  	"_uuid" varchar
  );
  
  CREATE TABLE "campaigns" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"nome" varchar NOT NULL,
  	"plataforma" "enum_campaigns_plataforma" DEFAULT 'Meta' NOT NULL,
  	"objetivo" "enum_campaigns_objetivo",
  	"ativa" boolean DEFAULT true,
  	"id_externo" varchar,
  	"observacao" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "supplies_compras" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"em" timestamp(3) with time zone NOT NULL,
  	"embalagens" numeric NOT NULL,
  	"valor_pago" numeric NOT NULL,
  	"fornecedor" varchar
  );
  
  CREATE TABLE "supplies" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"nome" varchar NOT NULL,
  	"unidade_de_uso" "enum_supplies_unidade_de_uso" DEFAULT 'un' NOT NULL,
  	"unidade_de_compra" "enum_supplies_unidade_de_compra" DEFAULT 'unidade' NOT NULL,
  	"quantidade_por_embalagem" numeric DEFAULT 1 NOT NULL,
  	"perda_percentual" numeric DEFAULT 0,
  	"densidade" numeric,
  	"estoque_atual" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "ledger_entries" ADD COLUMN "campanha_id" integer;
  ALTER TABLE "ledger_entries" ADD COLUMN "desempenho_alcance" numeric;
  ALTER TABLE "ledger_entries" ADD COLUMN "desempenho_impressoes" numeric;
  ALTER TABLE "ledger_entries" ADD COLUMN "desempenho_cliques" numeric;
  ALTER TABLE "ledger_entries" ADD COLUMN "desempenho_resultados" numeric;
  ALTER TABLE "ledger_entries" ADD COLUMN "origem" "enum_ledger_entries_origem" DEFAULT 'manual';
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "campaigns_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "supplies_id" integer;
  ALTER TABLE "products_materiais_opcoes" ADD CONSTRAINT "products_materiais_opcoes_insumo_id_supplies_id_fk" FOREIGN KEY ("insumo_id") REFERENCES "public"."supplies"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_materiais_opcoes" ADD CONSTRAINT "products_materiais_opcoes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_materiais"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_materiais" ADD CONSTRAINT "products_materiais_insumo_id_supplies_id_fk" FOREIGN KEY ("insumo_id") REFERENCES "public"."supplies"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_materiais" ADD CONSTRAINT "products_materiais_insumo_base_id_supplies_id_fk" FOREIGN KEY ("insumo_base_id") REFERENCES "public"."supplies"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_materiais" ADD CONSTRAINT "products_materiais_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_materiais_opcoes" ADD CONSTRAINT "_products_v_version_materiais_opcoes_insumo_id_supplies_id_fk" FOREIGN KEY ("insumo_id") REFERENCES "public"."supplies"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v_version_materiais_opcoes" ADD CONSTRAINT "_products_v_version_materiais_opcoes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v_version_materiais"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_materiais" ADD CONSTRAINT "_products_v_version_materiais_insumo_id_supplies_id_fk" FOREIGN KEY ("insumo_id") REFERENCES "public"."supplies"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v_version_materiais" ADD CONSTRAINT "_products_v_version_materiais_insumo_base_id_supplies_id_fk" FOREIGN KEY ("insumo_base_id") REFERENCES "public"."supplies"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v_version_materiais" ADD CONSTRAINT "_products_v_version_materiais_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "supplies_compras" ADD CONSTRAINT "supplies_compras_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."supplies"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "products_materiais_opcoes_order_idx" ON "products_materiais_opcoes" USING btree ("_order");
  CREATE INDEX "products_materiais_opcoes_parent_id_idx" ON "products_materiais_opcoes" USING btree ("_parent_id");
  CREATE INDEX "products_materiais_opcoes_insumo_idx" ON "products_materiais_opcoes" USING btree ("insumo_id");
  CREATE INDEX "products_materiais_order_idx" ON "products_materiais" USING btree ("_order");
  CREATE INDEX "products_materiais_parent_id_idx" ON "products_materiais" USING btree ("_parent_id");
  CREATE INDEX "products_materiais_insumo_idx" ON "products_materiais" USING btree ("insumo_id");
  CREATE INDEX "products_materiais_insumo_base_idx" ON "products_materiais" USING btree ("insumo_base_id");
  CREATE INDEX "_products_v_version_materiais_opcoes_order_idx" ON "_products_v_version_materiais_opcoes" USING btree ("_order");
  CREATE INDEX "_products_v_version_materiais_opcoes_parent_id_idx" ON "_products_v_version_materiais_opcoes" USING btree ("_parent_id");
  CREATE INDEX "_products_v_version_materiais_opcoes_insumo_idx" ON "_products_v_version_materiais_opcoes" USING btree ("insumo_id");
  CREATE INDEX "_products_v_version_materiais_order_idx" ON "_products_v_version_materiais" USING btree ("_order");
  CREATE INDEX "_products_v_version_materiais_parent_id_idx" ON "_products_v_version_materiais" USING btree ("_parent_id");
  CREATE INDEX "_products_v_version_materiais_insumo_idx" ON "_products_v_version_materiais" USING btree ("insumo_id");
  CREATE INDEX "_products_v_version_materiais_insumo_base_idx" ON "_products_v_version_materiais" USING btree ("insumo_base_id");
  CREATE INDEX "campaigns_updated_at_idx" ON "campaigns" USING btree ("updated_at");
  CREATE INDEX "campaigns_created_at_idx" ON "campaigns" USING btree ("created_at");
  CREATE INDEX "supplies_compras_order_idx" ON "supplies_compras" USING btree ("_order");
  CREATE INDEX "supplies_compras_parent_id_idx" ON "supplies_compras" USING btree ("_parent_id");
  CREATE INDEX "supplies_updated_at_idx" ON "supplies" USING btree ("updated_at");
  CREATE INDEX "supplies_created_at_idx" ON "supplies" USING btree ("created_at");
  ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_campanha_id_campaigns_id_fk" FOREIGN KEY ("campanha_id") REFERENCES "public"."campaigns"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_campaigns_fk" FOREIGN KEY ("campaigns_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_supplies_fk" FOREIGN KEY ("supplies_id") REFERENCES "public"."supplies"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "ledger_entries_campanha_idx" ON "ledger_entries" USING btree ("campanha_id");
  CREATE INDEX "payload_locked_documents_rels_campaigns_id_idx" ON "payload_locked_documents_rels" USING btree ("campaigns_id");
  CREATE INDEX "payload_locked_documents_rels_supplies_id_idx" ON "payload_locked_documents_rels" USING btree ("supplies_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "products_materiais_opcoes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_materiais" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_products_v_version_materiais_opcoes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_products_v_version_materiais" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "campaigns" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "supplies_compras" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "supplies" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "products_materiais_opcoes" CASCADE;
  DROP TABLE "products_materiais" CASCADE;
  DROP TABLE "_products_v_version_materiais_opcoes" CASCADE;
  DROP TABLE "_products_v_version_materiais" CASCADE;
  DROP TABLE "campaigns" CASCADE;
  DROP TABLE "supplies_compras" CASCADE;
  DROP TABLE "supplies" CASCADE;
  ALTER TABLE "ledger_entries" DROP CONSTRAINT "ledger_entries_campanha_id_campaigns_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_campaigns_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_supplies_fk";
  
  DROP INDEX "ledger_entries_campanha_idx";
  DROP INDEX "payload_locked_documents_rels_campaigns_id_idx";
  DROP INDEX "payload_locked_documents_rels_supplies_id_idx";
  ALTER TABLE "ledger_entries" DROP COLUMN "campanha_id";
  ALTER TABLE "ledger_entries" DROP COLUMN "desempenho_alcance";
  ALTER TABLE "ledger_entries" DROP COLUMN "desempenho_impressoes";
  ALTER TABLE "ledger_entries" DROP COLUMN "desempenho_cliques";
  ALTER TABLE "ledger_entries" DROP COLUMN "desempenho_resultados";
  ALTER TABLE "ledger_entries" DROP COLUMN "origem";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "campaigns_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "supplies_id";
  DROP TYPE "public"."enum_products_materiais_vinculo";
  DROP TYPE "public"."enum__products_v_version_materiais_vinculo";
  DROP TYPE "public"."enum_ledger_entries_origem";
  DROP TYPE "public"."enum_campaigns_plataforma";
  DROP TYPE "public"."enum_campaigns_objetivo";
  DROP TYPE "public"."enum_supplies_unidade_de_uso";
  DROP TYPE "public"."enum_supplies_unidade_de_compra";`)
}
