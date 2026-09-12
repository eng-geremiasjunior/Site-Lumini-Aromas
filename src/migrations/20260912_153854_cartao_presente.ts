import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_gift_cards_situacao" AS ENUM('ativo', 'usado', 'expirado', 'cancelado');
  CREATE TABLE "gift_cards_usos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"em" timestamp(3) with time zone,
  	"pedido" varchar,
  	"valor_centavos" numeric,
  	"saldo_depois" numeric
  );
  
  CREATE TABLE "gift_cards" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"codigo" varchar,
  	"situacao" "enum_gift_cards_situacao" DEFAULT 'ativo' NOT NULL,
  	"valor_centavos" numeric NOT NULL,
  	"saldo_centavos" numeric,
  	"valido_ate" timestamp(3) with time zone,
  	"de" varchar,
  	"para" varchar,
  	"email_do_comprador" varchar,
  	"email_do_destinatario" varchar,
  	"mensagem" varchar,
  	"enviar_em" timestamp(3) with time zone,
  	"enviado_em" timestamp(3) with time zone,
  	"pedido_de_compra_id" integer,
  	"observacao" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "orders" ADD COLUMN "gift_card_code" varchar;
  ALTER TABLE "orders" ADD COLUMN "gift_card_total" numeric;
  ALTER TABLE "carts" ADD COLUMN "gift_card_code" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "gift_cards_id" integer;
  ALTER TABLE "gift_cards_usos" ADD CONSTRAINT "gift_cards_usos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gift_cards"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gift_cards" ADD CONSTRAINT "gift_cards_pedido_de_compra_id_orders_id_fk" FOREIGN KEY ("pedido_de_compra_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "gift_cards_usos_order_idx" ON "gift_cards_usos" USING btree ("_order");
  CREATE INDEX "gift_cards_usos_parent_id_idx" ON "gift_cards_usos" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "gift_cards_codigo_idx" ON "gift_cards" USING btree ("codigo");
  CREATE INDEX "gift_cards_pedido_de_compra_idx" ON "gift_cards" USING btree ("pedido_de_compra_id");
  CREATE INDEX "gift_cards_updated_at_idx" ON "gift_cards" USING btree ("updated_at");
  CREATE INDEX "gift_cards_created_at_idx" ON "gift_cards" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_gift_cards_fk" FOREIGN KEY ("gift_cards_id") REFERENCES "public"."gift_cards"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_gift_cards_id_idx" ON "payload_locked_documents_rels" USING btree ("gift_cards_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "gift_cards_usos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gift_cards" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "gift_cards_usos" CASCADE;
  DROP TABLE "gift_cards" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_gift_cards_fk";
  
  DROP INDEX "payload_locked_documents_rels_gift_cards_id_idx";
  ALTER TABLE "orders" DROP COLUMN "gift_card_code";
  ALTER TABLE "orders" DROP COLUMN "gift_card_total";
  ALTER TABLE "carts" DROP COLUMN "gift_card_code";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "gift_cards_id";
  DROP TYPE "public"."enum_gift_cards_situacao";`)
}
