import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_occasions_event_type" AS ENUM('Casamento', 'Bodas', '15 anos', 'Batizado', 'Maternidade', 'Aniversário', 'Corporativo');
  CREATE TABLE "occasions_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"pergunta" varchar NOT NULL,
  	"resposta" varchar NOT NULL
  );
  
  CREATE TABLE "occasions_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer
  );
  
  ALTER TABLE "occasions" ADD COLUMN "event_type" "enum_occasions_event_type";
  ALTER TABLE "occasions_faq" ADD CONSTRAINT "occasions_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."occasions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "occasions_rels" ADD CONSTRAINT "occasions_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."occasions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "occasions_rels" ADD CONSTRAINT "occasions_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "occasions_faq_order_idx" ON "occasions_faq" USING btree ("_order");
  CREATE INDEX "occasions_faq_parent_id_idx" ON "occasions_faq" USING btree ("_parent_id");
  CREATE INDEX "occasions_rels_order_idx" ON "occasions_rels" USING btree ("order");
  CREATE INDEX "occasions_rels_parent_idx" ON "occasions_rels" USING btree ("parent_id");
  CREATE INDEX "occasions_rels_path_idx" ON "occasions_rels" USING btree ("path");
  CREATE INDEX "occasions_rels_media_id_idx" ON "occasions_rels" USING btree ("media_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "occasions_faq" CASCADE;
  DROP TABLE "occasions_rels" CASCADE;
  ALTER TABLE "occasions" DROP COLUMN "event_type";
  DROP TYPE "public"."enum_occasions_event_type";`)
}
