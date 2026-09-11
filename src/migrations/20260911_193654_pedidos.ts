import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_orders_status" AS ENUM('pending', 'processing', 'art_approval', 'production', 'shipped', 'completed', 'cancelled', 'refunded', 'failed', 'disputed');
  CREATE TYPE "public"."enum_orders_channel" AS ENUM('site', 'whatsapp', 'instagram_dm', 'admin');
  CREATE TYPE "public"."enum_orders_person_type" AS ENUM('PF', 'PJ');
  CREATE TYPE "public"."enum_orders_payment_method" AS ENUM('pix', 'credit_card', 'debit_card', 'mp_link', 'external');
  CREATE TABLE "orders_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"product_id" integer,
  	"product_name" varchar NOT NULL,
  	"variant_label" varchar,
  	"sku" varchar,
  	"qty" numeric NOT NULL,
  	"unit_price" numeric NOT NULL,
  	"lot_price" numeric NOT NULL,
  	"line_total" numeric NOT NULL,
  	"personalization" jsonb,
  	"addons" jsonb,
  	"art_file_id" integer,
  	"art_proof_id" integer,
  	"unit_cost" numeric
  );
  
  CREATE TABLE "orders_events" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"at" timestamp(3) with time zone,
  	"type" varchar,
  	"message" varchar,
  	"actor" varchar
  );
  
  CREATE TABLE "orders_notes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"visible_to_customer" boolean DEFAULT false,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "orders" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"number" varchar NOT NULL,
  	"status" "enum_orders_status" DEFAULT 'pending' NOT NULL,
  	"channel" "enum_orders_channel" DEFAULT 'site' NOT NULL,
  	"legacy_woo_id" numeric,
  	"customer_name" varchar NOT NULL,
  	"email" varchar,
  	"phone" varchar,
  	"person_type" "enum_orders_person_type" DEFAULT 'PF',
  	"document" varchar,
  	"customer_id" integer,
  	"shipping_address_postal_code" varchar,
  	"shipping_address_street" varchar,
  	"shipping_address_number" varchar,
  	"shipping_address_complement" varchar,
  	"shipping_address_district" varchar,
  	"shipping_address_city" varchar,
  	"shipping_address_state" varchar,
  	"shipping_service" varchar,
  	"tracking_code" varchar,
  	"event_type" varchar,
  	"event_date" timestamp(3) with time zone,
  	"production_deadline" timestamp(3) with time zone,
  	"customer_note" varchar,
  	"subtotal" numeric NOT NULL,
  	"shipping_total" numeric,
  	"discount_total" numeric,
  	"total" numeric NOT NULL,
  	"payment_method" "enum_orders_payment_method",
  	"installments" numeric,
  	"coupon_code" varchar,
  	"mercado_pago_payment_id" varchar,
  	"mercado_pago_status" varchar,
  	"mercado_pago_fee_cents" numeric,
  	"mercado_pago_net_received_cents" numeric,
  	"mercado_pago_money_release_date" timestamp(3) with time zone,
  	"date_paid" timestamp(3) with time zone,
  	"lead_ref" varchar,
  	"attribution" jsonb,
  	"conversions_sent" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "orders_id" integer;
  ALTER TABLE "orders_items" ADD CONSTRAINT "orders_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "orders_items" ADD CONSTRAINT "orders_items_art_file_id_media_id_fk" FOREIGN KEY ("art_file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "orders_items" ADD CONSTRAINT "orders_items_art_proof_id_media_id_fk" FOREIGN KEY ("art_proof_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "orders_items" ADD CONSTRAINT "orders_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "orders_events" ADD CONSTRAINT "orders_events_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "orders_notes" ADD CONSTRAINT "orders_notes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "orders_items_order_idx" ON "orders_items" USING btree ("_order");
  CREATE INDEX "orders_items_parent_id_idx" ON "orders_items" USING btree ("_parent_id");
  CREATE INDEX "orders_items_product_idx" ON "orders_items" USING btree ("product_id");
  CREATE INDEX "orders_items_art_file_idx" ON "orders_items" USING btree ("art_file_id");
  CREATE INDEX "orders_items_art_proof_idx" ON "orders_items" USING btree ("art_proof_id");
  CREATE INDEX "orders_events_order_idx" ON "orders_events" USING btree ("_order");
  CREATE INDEX "orders_events_parent_id_idx" ON "orders_events" USING btree ("_parent_id");
  CREATE INDEX "orders_notes_order_idx" ON "orders_notes" USING btree ("_order");
  CREATE INDEX "orders_notes_parent_id_idx" ON "orders_notes" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "orders_number_idx" ON "orders" USING btree ("number");
  CREATE INDEX "orders_customer_idx" ON "orders" USING btree ("customer_id");
  CREATE INDEX "orders_updated_at_idx" ON "orders" USING btree ("updated_at");
  CREATE INDEX "orders_created_at_idx" ON "orders" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_orders_fk" FOREIGN KEY ("orders_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_orders_id_idx" ON "payload_locked_documents_rels" USING btree ("orders_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "orders_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "orders_events" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "orders_notes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "orders" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "orders_items" CASCADE;
  DROP TABLE "orders_events" CASCADE;
  DROP TABLE "orders_notes" CASCADE;
  DROP TABLE "orders" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_orders_fk";
  
  DROP INDEX "payload_locked_documents_rels_orders_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "orders_id";
  DROP TYPE "public"."enum_orders_status";
  DROP TYPE "public"."enum_orders_channel";
  DROP TYPE "public"."enum_orders_person_type";
  DROP TYPE "public"."enum_orders_payment_method";`)
}
