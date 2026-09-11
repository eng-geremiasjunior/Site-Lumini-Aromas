import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_products_personalization_fields_type" AS ENUM('text', 'textarea', 'file', 'select', 'date');
  CREATE TYPE "public"."enum_products_min_qty_scope" AS ENUM('variation', 'order');
  CREATE TYPE "public"."enum_products_fiscal_annex" AS ENUM('II', 'I');
  CREATE TYPE "public"."enum_products_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__products_v_version_personalization_fields_type" AS ENUM('text', 'textarea', 'file', 'select', 'date');
  CREATE TYPE "public"."enum__products_v_version_min_qty_scope" AS ENUM('variation', 'order');
  CREATE TYPE "public"."enum__products_v_version_fiscal_annex" AS ENUM('II', 'I');
  CREATE TYPE "public"."enum__products_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_attributes_display_type" AS ENUM('button', 'image', 'color', 'select');
  CREATE TYPE "public"."enum_media_kind" AS ENUM('produto', 'evento', 'logo_cliente', 'prova_arte', 'outro');
  CREATE TYPE "public"."enum_users_role" AS ENUM('dono', 'atendente', 'designer');
  CREATE TABLE "products_gallery" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer
  );
  
  CREATE TABLE "products_option_groups" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"attribute_id" integer
  );
  
  CREATE TABLE "products_variants" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"sku" varchar,
  	"active" boolean DEFAULT true,
  	"image_id" integer,
  	"key" varchar,
  	"term_ids" varchar,
  	"legacy_woo_variation_id" numeric
  );
  
  CREATE TABLE "products_volume_discounts" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"from_qty" numeric,
  	"unit_price" numeric
  );
  
  CREATE TABLE "products_personalization_fields" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"type" "enum_products_personalization_fields_type" DEFAULT 'text',
  	"placeholder" varchar,
  	"required" boolean DEFAULT false,
  	"max_chars" numeric,
  	"options" varchar
  );
  
  CREATE TABLE "products_production_days" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"from_qty" numeric,
  	"min_days" numeric,
  	"max_days" numeric
  );
  
  CREATE TABLE "products_packaging" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"from_qty" numeric,
  	"boxes" numeric DEFAULT 1,
  	"weight_kg" numeric,
  	"width_cm" numeric,
  	"height_cm" numeric,
  	"length_cm" numeric
  );
  
  CREATE TABLE "products" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"archived" boolean DEFAULT false,
  	"featured" boolean DEFAULT false,
  	"slug" varchar,
  	"legacy_woo_id" numeric,
  	"name" varchar,
  	"short_description" varchar,
  	"description" jsonb,
  	"category_id" integer,
  	"min_qty_scope" "enum_products_min_qty_scope" DEFAULT 'variation',
  	"unit_price" numeric,
  	"min_qty" numeric DEFAULT 20,
  	"qty_step" numeric DEFAULT 10,
  	"max_qty" numeric DEFAULT 200,
  	"lot_table" jsonb,
  	"price_from" numeric,
  	"price_to" numeric,
  	"tech_sheet_duration_hours" numeric,
  	"tech_sheet_weight" varchar,
  	"tech_sheet_height" varchar,
  	"tech_sheet_width" varchar,
  	"tech_sheet_container" varchar,
  	"tech_sheet_includes" varchar,
  	"tech_sheet_shelf_life_months" numeric,
  	"unit_cost" numeric,
  	"fiscal_annex" "enum_products_fiscal_annex" DEFAULT 'II',
  	"ncm" varchar DEFAULT '3406.00.00',
  	"csosn" varchar DEFAULT '102',
  	"cfop_internal" varchar DEFAULT '5.101',
  	"cfop_interstate" varchar DEFAULT '6.101',
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"google_product_category" varchar DEFAULT '588',
  	"preserve_legacy_feed_id" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_products_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "products_numbers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"number" numeric,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL
  );
  
  CREATE TABLE "products_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"occasions_id" integer,
  	"tags_id" integer,
  	"attribute_terms_id" integer,
  	"addons_id" integer
  );
  
  CREATE TABLE "_products_v_version_gallery" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_products_v_version_option_groups" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"attribute_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_products_v_version_variants" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"sku" varchar,
  	"active" boolean DEFAULT true,
  	"image_id" integer,
  	"key" varchar,
  	"term_ids" varchar,
  	"legacy_woo_variation_id" numeric,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_products_v_version_volume_discounts" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"from_qty" numeric,
  	"unit_price" numeric,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_products_v_version_personalization_fields" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"type" "enum__products_v_version_personalization_fields_type" DEFAULT 'text',
  	"placeholder" varchar,
  	"required" boolean DEFAULT false,
  	"max_chars" numeric,
  	"options" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_products_v_version_production_days" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"from_qty" numeric,
  	"min_days" numeric,
  	"max_days" numeric,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_products_v_version_packaging" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"from_qty" numeric,
  	"boxes" numeric DEFAULT 1,
  	"weight_kg" numeric,
  	"width_cm" numeric,
  	"height_cm" numeric,
  	"length_cm" numeric,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_products_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_archived" boolean DEFAULT false,
  	"version_featured" boolean DEFAULT false,
  	"version_slug" varchar,
  	"version_legacy_woo_id" numeric,
  	"version_name" varchar,
  	"version_short_description" varchar,
  	"version_description" jsonb,
  	"version_category_id" integer,
  	"version_min_qty_scope" "enum__products_v_version_min_qty_scope" DEFAULT 'variation',
  	"version_unit_price" numeric,
  	"version_min_qty" numeric DEFAULT 20,
  	"version_qty_step" numeric DEFAULT 10,
  	"version_max_qty" numeric DEFAULT 200,
  	"version_lot_table" jsonb,
  	"version_price_from" numeric,
  	"version_price_to" numeric,
  	"version_tech_sheet_duration_hours" numeric,
  	"version_tech_sheet_weight" varchar,
  	"version_tech_sheet_height" varchar,
  	"version_tech_sheet_width" varchar,
  	"version_tech_sheet_container" varchar,
  	"version_tech_sheet_includes" varchar,
  	"version_tech_sheet_shelf_life_months" numeric,
  	"version_unit_cost" numeric,
  	"version_fiscal_annex" "enum__products_v_version_fiscal_annex" DEFAULT 'II',
  	"version_ncm" varchar DEFAULT '3406.00.00',
  	"version_csosn" varchar DEFAULT '102',
  	"version_cfop_internal" varchar DEFAULT '5.101',
  	"version_cfop_interstate" varchar DEFAULT '6.101',
  	"version_meta_title" varchar,
  	"version_meta_description" varchar,
  	"version_google_product_category" varchar DEFAULT '588',
  	"version_preserve_legacy_feed_id" boolean DEFAULT false,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__products_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "_products_v_numbers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"number" numeric,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL
  );
  
  CREATE TABLE "_products_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"occasions_id" integer,
  	"tags_id" integer,
  	"attribute_terms_id" integer,
  	"addons_id" integer
  );
  
  CREATE TABLE "categories" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar,
  	"parent_id" integer,
  	"description" varchar,
  	"image_id" integer,
  	"sort_order" numeric DEFAULT 0,
  	"legacy_woo_id" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "occasions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar,
  	"headline" varchar,
  	"description" varchar,
  	"hero_image_id" integer,
  	"suggested_lots" varchar,
  	"sort_order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "attributes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar,
  	"display_type" "enum_attributes_display_type" DEFAULT 'button',
  	"description" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "attribute_terms" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"attribute_id" integer NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar,
  	"image_id" integer,
  	"color_hex" varchar,
  	"sort_order" numeric DEFAULT 0,
  	"legacy_woo_term_id" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "addons" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar,
  	"description" varchar,
  	"image_id" integer,
  	"price_per_unit" numeric,
  	"flat_price" numeric,
  	"active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "tags" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar NOT NULL,
  	"credit" varchar,
  	"kind" "enum_media_kind" DEFAULT 'produto',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_thumbnail_url" varchar,
  	"sizes_thumbnail_width" numeric,
  	"sizes_thumbnail_height" numeric,
  	"sizes_thumbnail_mime_type" varchar,
  	"sizes_thumbnail_filesize" numeric,
  	"sizes_thumbnail_filename" varchar,
  	"sizes_card_url" varchar,
  	"sizes_card_width" numeric,
  	"sizes_card_height" numeric,
  	"sizes_card_mime_type" varchar,
  	"sizes_card_filesize" numeric,
  	"sizes_card_filename" varchar,
  	"sizes_feed_url" varchar,
  	"sizes_feed_width" numeric,
  	"sizes_feed_height" numeric,
  	"sizes_feed_mime_type" varchar,
  	"sizes_feed_filesize" numeric,
  	"sizes_feed_filename" varchar
  );
  
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"role" "enum_users_role" DEFAULT 'atendente' NOT NULL,
  	"whatsapp" varchar,
  	"notify_on_new_order" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"products_id" integer,
  	"categories_id" integer,
  	"occasions_id" integer,
  	"attributes_id" integer,
  	"attribute_terms_id" integer,
  	"addons_id" integer,
  	"tags_id" integer,
  	"media_id" integer,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "store_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"legal_name" varchar NOT NULL,
  	"trade_name" varchar DEFAULT 'Lumini Aromas',
  	"cnpj" varchar DEFAULT '34.499.353/0001-08' NOT NULL,
  	"state_registration" varchar,
  	"address_street" varchar,
  	"address_number" varchar,
  	"address_complement" varchar,
  	"address_district" varchar,
  	"address_city" varchar,
  	"address_state" varchar,
  	"address_postal_code" varchar,
  	"email" varchar,
  	"whatsapp" varchar DEFAULT '5533999478774',
  	"business_hours" varchar,
  	"default_min_qty" numeric DEFAULT 20,
  	"default_max_qty" numeric DEFAULT 200,
  	"production_banner" varchar,
  	"rush_blackout_from" timestamp(3) with time zone,
  	"rush_blackout_to" timestamp(3) with time zone,
  	"max_interest_free_installments" numeric DEFAULT 3,
  	"free_shipping_from" numeric,
  	"return_policy" jsonb,
  	"terms_of_use" jsonb,
  	"privacy_policy" jsonb,
  	"legal_version" varchar DEFAULT '1',
  	"integrations_note" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "store_settings_numbers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"number" numeric,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL
  );
  
  ALTER TABLE "products_gallery" ADD CONSTRAINT "products_gallery_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_gallery" ADD CONSTRAINT "products_gallery_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_option_groups" ADD CONSTRAINT "products_option_groups_attribute_id_attributes_id_fk" FOREIGN KEY ("attribute_id") REFERENCES "public"."attributes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_option_groups" ADD CONSTRAINT "products_option_groups_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_variants" ADD CONSTRAINT "products_variants_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_variants" ADD CONSTRAINT "products_variants_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_volume_discounts" ADD CONSTRAINT "products_volume_discounts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_personalization_fields" ADD CONSTRAINT "products_personalization_fields_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_production_days" ADD CONSTRAINT "products_production_days_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_packaging" ADD CONSTRAINT "products_packaging_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_numbers" ADD CONSTRAINT "products_numbers_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_occasions_fk" FOREIGN KEY ("occasions_id") REFERENCES "public"."occasions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_tags_fk" FOREIGN KEY ("tags_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_attribute_terms_fk" FOREIGN KEY ("attribute_terms_id") REFERENCES "public"."attribute_terms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_addons_fk" FOREIGN KEY ("addons_id") REFERENCES "public"."addons"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_gallery" ADD CONSTRAINT "_products_v_version_gallery_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v_version_gallery" ADD CONSTRAINT "_products_v_version_gallery_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_option_groups" ADD CONSTRAINT "_products_v_version_option_groups_attribute_id_attributes_id_fk" FOREIGN KEY ("attribute_id") REFERENCES "public"."attributes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v_version_option_groups" ADD CONSTRAINT "_products_v_version_option_groups_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_variants" ADD CONSTRAINT "_products_v_version_variants_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v_version_variants" ADD CONSTRAINT "_products_v_version_variants_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_volume_discounts" ADD CONSTRAINT "_products_v_version_volume_discounts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_personalization_fields" ADD CONSTRAINT "_products_v_version_personalization_fields_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_production_days" ADD CONSTRAINT "_products_v_version_production_days_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_packaging" ADD CONSTRAINT "_products_v_version_packaging_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v" ADD CONSTRAINT "_products_v_parent_id_products_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v" ADD CONSTRAINT "_products_v_version_category_id_categories_id_fk" FOREIGN KEY ("version_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v_numbers" ADD CONSTRAINT "_products_v_numbers_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_rels" ADD CONSTRAINT "_products_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_rels" ADD CONSTRAINT "_products_v_rels_occasions_fk" FOREIGN KEY ("occasions_id") REFERENCES "public"."occasions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_rels" ADD CONSTRAINT "_products_v_rels_tags_fk" FOREIGN KEY ("tags_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_rels" ADD CONSTRAINT "_products_v_rels_attribute_terms_fk" FOREIGN KEY ("attribute_terms_id") REFERENCES "public"."attribute_terms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_rels" ADD CONSTRAINT "_products_v_rels_addons_fk" FOREIGN KEY ("addons_id") REFERENCES "public"."addons"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories" ADD CONSTRAINT "categories_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "occasions" ADD CONSTRAINT "occasions_hero_image_id_media_id_fk" FOREIGN KEY ("hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "attribute_terms" ADD CONSTRAINT "attribute_terms_attribute_id_attributes_id_fk" FOREIGN KEY ("attribute_id") REFERENCES "public"."attributes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "attribute_terms" ADD CONSTRAINT "attribute_terms_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "addons" ADD CONSTRAINT "addons_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_occasions_fk" FOREIGN KEY ("occasions_id") REFERENCES "public"."occasions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_attributes_fk" FOREIGN KEY ("attributes_id") REFERENCES "public"."attributes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_attribute_terms_fk" FOREIGN KEY ("attribute_terms_id") REFERENCES "public"."attribute_terms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_addons_fk" FOREIGN KEY ("addons_id") REFERENCES "public"."addons"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_tags_fk" FOREIGN KEY ("tags_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "store_settings_numbers" ADD CONSTRAINT "store_settings_numbers_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."store_settings"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "products_gallery_order_idx" ON "products_gallery" USING btree ("_order");
  CREATE INDEX "products_gallery_parent_id_idx" ON "products_gallery" USING btree ("_parent_id");
  CREATE INDEX "products_gallery_image_idx" ON "products_gallery" USING btree ("image_id");
  CREATE INDEX "products_option_groups_order_idx" ON "products_option_groups" USING btree ("_order");
  CREATE INDEX "products_option_groups_parent_id_idx" ON "products_option_groups" USING btree ("_parent_id");
  CREATE INDEX "products_option_groups_attribute_idx" ON "products_option_groups" USING btree ("attribute_id");
  CREATE INDEX "products_variants_order_idx" ON "products_variants" USING btree ("_order");
  CREATE INDEX "products_variants_parent_id_idx" ON "products_variants" USING btree ("_parent_id");
  CREATE INDEX "products_variants_image_idx" ON "products_variants" USING btree ("image_id");
  CREATE INDEX "products_volume_discounts_order_idx" ON "products_volume_discounts" USING btree ("_order");
  CREATE INDEX "products_volume_discounts_parent_id_idx" ON "products_volume_discounts" USING btree ("_parent_id");
  CREATE INDEX "products_personalization_fields_order_idx" ON "products_personalization_fields" USING btree ("_order");
  CREATE INDEX "products_personalization_fields_parent_id_idx" ON "products_personalization_fields" USING btree ("_parent_id");
  CREATE INDEX "products_production_days_order_idx" ON "products_production_days" USING btree ("_order");
  CREATE INDEX "products_production_days_parent_id_idx" ON "products_production_days" USING btree ("_parent_id");
  CREATE INDEX "products_packaging_order_idx" ON "products_packaging" USING btree ("_order");
  CREATE INDEX "products_packaging_parent_id_idx" ON "products_packaging" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "products_slug_idx" ON "products" USING btree ("slug");
  CREATE INDEX "products_category_idx" ON "products" USING btree ("category_id");
  CREATE INDEX "products_updated_at_idx" ON "products" USING btree ("updated_at");
  CREATE INDEX "products_created_at_idx" ON "products" USING btree ("created_at");
  CREATE INDEX "products__status_idx" ON "products" USING btree ("_status");
  CREATE INDEX "products_numbers_order_parent_idx" ON "products_numbers" USING btree ("order","parent_id");
  CREATE INDEX "products_rels_order_idx" ON "products_rels" USING btree ("order");
  CREATE INDEX "products_rels_parent_idx" ON "products_rels" USING btree ("parent_id");
  CREATE INDEX "products_rels_path_idx" ON "products_rels" USING btree ("path");
  CREATE INDEX "products_rels_occasions_id_idx" ON "products_rels" USING btree ("occasions_id");
  CREATE INDEX "products_rels_tags_id_idx" ON "products_rels" USING btree ("tags_id");
  CREATE INDEX "products_rels_attribute_terms_id_idx" ON "products_rels" USING btree ("attribute_terms_id");
  CREATE INDEX "products_rels_addons_id_idx" ON "products_rels" USING btree ("addons_id");
  CREATE INDEX "_products_v_version_gallery_order_idx" ON "_products_v_version_gallery" USING btree ("_order");
  CREATE INDEX "_products_v_version_gallery_parent_id_idx" ON "_products_v_version_gallery" USING btree ("_parent_id");
  CREATE INDEX "_products_v_version_gallery_image_idx" ON "_products_v_version_gallery" USING btree ("image_id");
  CREATE INDEX "_products_v_version_option_groups_order_idx" ON "_products_v_version_option_groups" USING btree ("_order");
  CREATE INDEX "_products_v_version_option_groups_parent_id_idx" ON "_products_v_version_option_groups" USING btree ("_parent_id");
  CREATE INDEX "_products_v_version_option_groups_attribute_idx" ON "_products_v_version_option_groups" USING btree ("attribute_id");
  CREATE INDEX "_products_v_version_variants_order_idx" ON "_products_v_version_variants" USING btree ("_order");
  CREATE INDEX "_products_v_version_variants_parent_id_idx" ON "_products_v_version_variants" USING btree ("_parent_id");
  CREATE INDEX "_products_v_version_variants_image_idx" ON "_products_v_version_variants" USING btree ("image_id");
  CREATE INDEX "_products_v_version_volume_discounts_order_idx" ON "_products_v_version_volume_discounts" USING btree ("_order");
  CREATE INDEX "_products_v_version_volume_discounts_parent_id_idx" ON "_products_v_version_volume_discounts" USING btree ("_parent_id");
  CREATE INDEX "_products_v_version_personalization_fields_order_idx" ON "_products_v_version_personalization_fields" USING btree ("_order");
  CREATE INDEX "_products_v_version_personalization_fields_parent_id_idx" ON "_products_v_version_personalization_fields" USING btree ("_parent_id");
  CREATE INDEX "_products_v_version_production_days_order_idx" ON "_products_v_version_production_days" USING btree ("_order");
  CREATE INDEX "_products_v_version_production_days_parent_id_idx" ON "_products_v_version_production_days" USING btree ("_parent_id");
  CREATE INDEX "_products_v_version_packaging_order_idx" ON "_products_v_version_packaging" USING btree ("_order");
  CREATE INDEX "_products_v_version_packaging_parent_id_idx" ON "_products_v_version_packaging" USING btree ("_parent_id");
  CREATE INDEX "_products_v_parent_idx" ON "_products_v" USING btree ("parent_id");
  CREATE INDEX "_products_v_version_version_slug_idx" ON "_products_v" USING btree ("version_slug");
  CREATE INDEX "_products_v_version_version_category_idx" ON "_products_v" USING btree ("version_category_id");
  CREATE INDEX "_products_v_version_version_updated_at_idx" ON "_products_v" USING btree ("version_updated_at");
  CREATE INDEX "_products_v_version_version_created_at_idx" ON "_products_v" USING btree ("version_created_at");
  CREATE INDEX "_products_v_version_version__status_idx" ON "_products_v" USING btree ("version__status");
  CREATE INDEX "_products_v_created_at_idx" ON "_products_v" USING btree ("created_at");
  CREATE INDEX "_products_v_updated_at_idx" ON "_products_v" USING btree ("updated_at");
  CREATE INDEX "_products_v_latest_idx" ON "_products_v" USING btree ("latest");
  CREATE INDEX "_products_v_numbers_order_parent_idx" ON "_products_v_numbers" USING btree ("order","parent_id");
  CREATE INDEX "_products_v_rels_order_idx" ON "_products_v_rels" USING btree ("order");
  CREATE INDEX "_products_v_rels_parent_idx" ON "_products_v_rels" USING btree ("parent_id");
  CREATE INDEX "_products_v_rels_path_idx" ON "_products_v_rels" USING btree ("path");
  CREATE INDEX "_products_v_rels_occasions_id_idx" ON "_products_v_rels" USING btree ("occasions_id");
  CREATE INDEX "_products_v_rels_tags_id_idx" ON "_products_v_rels" USING btree ("tags_id");
  CREATE INDEX "_products_v_rels_attribute_terms_id_idx" ON "_products_v_rels" USING btree ("attribute_terms_id");
  CREATE INDEX "_products_v_rels_addons_id_idx" ON "_products_v_rels" USING btree ("addons_id");
  CREATE UNIQUE INDEX "categories_slug_idx" ON "categories" USING btree ("slug");
  CREATE INDEX "categories_parent_idx" ON "categories" USING btree ("parent_id");
  CREATE INDEX "categories_image_idx" ON "categories" USING btree ("image_id");
  CREATE INDEX "categories_updated_at_idx" ON "categories" USING btree ("updated_at");
  CREATE INDEX "categories_created_at_idx" ON "categories" USING btree ("created_at");
  CREATE UNIQUE INDEX "occasions_slug_idx" ON "occasions" USING btree ("slug");
  CREATE INDEX "occasions_hero_image_idx" ON "occasions" USING btree ("hero_image_id");
  CREATE INDEX "occasions_updated_at_idx" ON "occasions" USING btree ("updated_at");
  CREATE INDEX "occasions_created_at_idx" ON "occasions" USING btree ("created_at");
  CREATE UNIQUE INDEX "attributes_slug_idx" ON "attributes" USING btree ("slug");
  CREATE INDEX "attributes_updated_at_idx" ON "attributes" USING btree ("updated_at");
  CREATE INDEX "attributes_created_at_idx" ON "attributes" USING btree ("created_at");
  CREATE INDEX "attribute_terms_attribute_idx" ON "attribute_terms" USING btree ("attribute_id");
  CREATE UNIQUE INDEX "attribute_terms_slug_idx" ON "attribute_terms" USING btree ("slug");
  CREATE INDEX "attribute_terms_image_idx" ON "attribute_terms" USING btree ("image_id");
  CREATE INDEX "attribute_terms_updated_at_idx" ON "attribute_terms" USING btree ("updated_at");
  CREATE INDEX "attribute_terms_created_at_idx" ON "attribute_terms" USING btree ("created_at");
  CREATE UNIQUE INDEX "addons_slug_idx" ON "addons" USING btree ("slug");
  CREATE INDEX "addons_image_idx" ON "addons" USING btree ("image_id");
  CREATE INDEX "addons_updated_at_idx" ON "addons" USING btree ("updated_at");
  CREATE INDEX "addons_created_at_idx" ON "addons" USING btree ("created_at");
  CREATE UNIQUE INDEX "tags_slug_idx" ON "tags" USING btree ("slug");
  CREATE INDEX "tags_updated_at_idx" ON "tags" USING btree ("updated_at");
  CREATE INDEX "tags_created_at_idx" ON "tags" USING btree ("created_at");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "media_sizes_thumbnail_sizes_thumbnail_filename_idx" ON "media" USING btree ("sizes_thumbnail_filename");
  CREATE INDEX "media_sizes_card_sizes_card_filename_idx" ON "media" USING btree ("sizes_card_filename");
  CREATE INDEX "media_sizes_feed_sizes_feed_filename_idx" ON "media" USING btree ("sizes_feed_filename");
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_products_id_idx" ON "payload_locked_documents_rels" USING btree ("products_id");
  CREATE INDEX "payload_locked_documents_rels_categories_id_idx" ON "payload_locked_documents_rels" USING btree ("categories_id");
  CREATE INDEX "payload_locked_documents_rels_occasions_id_idx" ON "payload_locked_documents_rels" USING btree ("occasions_id");
  CREATE INDEX "payload_locked_documents_rels_attributes_id_idx" ON "payload_locked_documents_rels" USING btree ("attributes_id");
  CREATE INDEX "payload_locked_documents_rels_attribute_terms_id_idx" ON "payload_locked_documents_rels" USING btree ("attribute_terms_id");
  CREATE INDEX "payload_locked_documents_rels_addons_id_idx" ON "payload_locked_documents_rels" USING btree ("addons_id");
  CREATE INDEX "payload_locked_documents_rels_tags_id_idx" ON "payload_locked_documents_rels" USING btree ("tags_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");
  CREATE INDEX "store_settings_numbers_order_parent_idx" ON "store_settings_numbers" USING btree ("order","parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "products_gallery" CASCADE;
  DROP TABLE "products_option_groups" CASCADE;
  DROP TABLE "products_variants" CASCADE;
  DROP TABLE "products_volume_discounts" CASCADE;
  DROP TABLE "products_personalization_fields" CASCADE;
  DROP TABLE "products_production_days" CASCADE;
  DROP TABLE "products_packaging" CASCADE;
  DROP TABLE "products" CASCADE;
  DROP TABLE "products_numbers" CASCADE;
  DROP TABLE "products_rels" CASCADE;
  DROP TABLE "_products_v_version_gallery" CASCADE;
  DROP TABLE "_products_v_version_option_groups" CASCADE;
  DROP TABLE "_products_v_version_variants" CASCADE;
  DROP TABLE "_products_v_version_volume_discounts" CASCADE;
  DROP TABLE "_products_v_version_personalization_fields" CASCADE;
  DROP TABLE "_products_v_version_production_days" CASCADE;
  DROP TABLE "_products_v_version_packaging" CASCADE;
  DROP TABLE "_products_v" CASCADE;
  DROP TABLE "_products_v_numbers" CASCADE;
  DROP TABLE "_products_v_rels" CASCADE;
  DROP TABLE "categories" CASCADE;
  DROP TABLE "occasions" CASCADE;
  DROP TABLE "attributes" CASCADE;
  DROP TABLE "attribute_terms" CASCADE;
  DROP TABLE "addons" CASCADE;
  DROP TABLE "tags" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TABLE "store_settings" CASCADE;
  DROP TABLE "store_settings_numbers" CASCADE;
  DROP TYPE "public"."enum_products_personalization_fields_type";
  DROP TYPE "public"."enum_products_min_qty_scope";
  DROP TYPE "public"."enum_products_fiscal_annex";
  DROP TYPE "public"."enum_products_status";
  DROP TYPE "public"."enum__products_v_version_personalization_fields_type";
  DROP TYPE "public"."enum__products_v_version_min_qty_scope";
  DROP TYPE "public"."enum__products_v_version_fiscal_annex";
  DROP TYPE "public"."enum__products_v_version_status";
  DROP TYPE "public"."enum_attributes_display_type";
  DROP TYPE "public"."enum_media_kind";
  DROP TYPE "public"."enum_users_role";`)
}
