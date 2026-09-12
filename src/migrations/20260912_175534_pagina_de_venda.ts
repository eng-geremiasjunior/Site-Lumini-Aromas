import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "products_acabamento" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"titulo" varchar,
  	"texto" varchar,
  	"detalhe" varchar,
  	"imagem_id" integer
  );
  
  CREATE TABLE "products_como_funciona" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"titulo" varchar,
  	"texto" varchar
  );
  
  CREATE TABLE "products_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"pergunta" varchar,
  	"resposta" varchar
  );
  
  CREATE TABLE "_products_v_version_acabamento" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"titulo" varchar,
  	"texto" varchar,
  	"detalhe" varchar,
  	"imagem_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_products_v_version_como_funciona" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"titulo" varchar,
  	"texto" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_products_v_version_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"pergunta" varchar,
  	"resposta" varchar,
  	"_uuid" varchar
  );
  
  ALTER TABLE "products_variants" ADD COLUMN "descricao" varchar;
  ALTER TABLE "products" ADD COLUMN "promessa_titulo" varchar;
  ALTER TABLE "products" ADD COLUMN "promessa_texto" varchar;
  ALTER TABLE "products" ADD COLUMN "secao_aromas_titulo" varchar;
  ALTER TABLE "products" ADD COLUMN "secao_aromas_texto" varchar;
  ALTER TABLE "products" ADD COLUMN "secao_personalizacao_titulo" varchar;
  ALTER TABLE "products" ADD COLUMN "secao_personalizacao_texto" varchar;
  ALTER TABLE "_products_v_version_variants" ADD COLUMN "descricao" varchar;
  ALTER TABLE "_products_v" ADD COLUMN "version_promessa_titulo" varchar;
  ALTER TABLE "_products_v" ADD COLUMN "version_promessa_texto" varchar;
  ALTER TABLE "_products_v" ADD COLUMN "version_secao_aromas_titulo" varchar;
  ALTER TABLE "_products_v" ADD COLUMN "version_secao_aromas_texto" varchar;
  ALTER TABLE "_products_v" ADD COLUMN "version_secao_personalizacao_titulo" varchar;
  ALTER TABLE "_products_v" ADD COLUMN "version_secao_personalizacao_texto" varchar;
  ALTER TABLE "products_acabamento" ADD CONSTRAINT "products_acabamento_imagem_id_media_id_fk" FOREIGN KEY ("imagem_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_acabamento" ADD CONSTRAINT "products_acabamento_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_como_funciona" ADD CONSTRAINT "products_como_funciona_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_faq" ADD CONSTRAINT "products_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_acabamento" ADD CONSTRAINT "_products_v_version_acabamento_imagem_id_media_id_fk" FOREIGN KEY ("imagem_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v_version_acabamento" ADD CONSTRAINT "_products_v_version_acabamento_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_como_funciona" ADD CONSTRAINT "_products_v_version_como_funciona_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_faq" ADD CONSTRAINT "_products_v_version_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "products_acabamento_order_idx" ON "products_acabamento" USING btree ("_order");
  CREATE INDEX "products_acabamento_parent_id_idx" ON "products_acabamento" USING btree ("_parent_id");
  CREATE INDEX "products_acabamento_imagem_idx" ON "products_acabamento" USING btree ("imagem_id");
  CREATE INDEX "products_como_funciona_order_idx" ON "products_como_funciona" USING btree ("_order");
  CREATE INDEX "products_como_funciona_parent_id_idx" ON "products_como_funciona" USING btree ("_parent_id");
  CREATE INDEX "products_faq_order_idx" ON "products_faq" USING btree ("_order");
  CREATE INDEX "products_faq_parent_id_idx" ON "products_faq" USING btree ("_parent_id");
  CREATE INDEX "_products_v_version_acabamento_order_idx" ON "_products_v_version_acabamento" USING btree ("_order");
  CREATE INDEX "_products_v_version_acabamento_parent_id_idx" ON "_products_v_version_acabamento" USING btree ("_parent_id");
  CREATE INDEX "_products_v_version_acabamento_imagem_idx" ON "_products_v_version_acabamento" USING btree ("imagem_id");
  CREATE INDEX "_products_v_version_como_funciona_order_idx" ON "_products_v_version_como_funciona" USING btree ("_order");
  CREATE INDEX "_products_v_version_como_funciona_parent_id_idx" ON "_products_v_version_como_funciona" USING btree ("_parent_id");
  CREATE INDEX "_products_v_version_faq_order_idx" ON "_products_v_version_faq" USING btree ("_order");
  CREATE INDEX "_products_v_version_faq_parent_id_idx" ON "_products_v_version_faq" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "products_acabamento" CASCADE;
  DROP TABLE "products_como_funciona" CASCADE;
  DROP TABLE "products_faq" CASCADE;
  DROP TABLE "_products_v_version_acabamento" CASCADE;
  DROP TABLE "_products_v_version_como_funciona" CASCADE;
  DROP TABLE "_products_v_version_faq" CASCADE;
  ALTER TABLE "products_variants" DROP COLUMN "descricao";
  ALTER TABLE "products" DROP COLUMN "promessa_titulo";
  ALTER TABLE "products" DROP COLUMN "promessa_texto";
  ALTER TABLE "products" DROP COLUMN "secao_aromas_titulo";
  ALTER TABLE "products" DROP COLUMN "secao_aromas_texto";
  ALTER TABLE "products" DROP COLUMN "secao_personalizacao_titulo";
  ALTER TABLE "products" DROP COLUMN "secao_personalizacao_texto";
  ALTER TABLE "_products_v_version_variants" DROP COLUMN "descricao";
  ALTER TABLE "_products_v" DROP COLUMN "version_promessa_titulo";
  ALTER TABLE "_products_v" DROP COLUMN "version_promessa_texto";
  ALTER TABLE "_products_v" DROP COLUMN "version_secao_aromas_titulo";
  ALTER TABLE "_products_v" DROP COLUMN "version_secao_aromas_texto";
  ALTER TABLE "_products_v" DROP COLUMN "version_secao_personalizacao_titulo";
  ALTER TABLE "_products_v" DROP COLUMN "version_secao_personalizacao_texto";`)
}
