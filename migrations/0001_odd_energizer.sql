CREATE TABLE "llms_field_purchases" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"field_key" text NOT NULL,
	"stripe_payment_intent_id" text,
	"amount" integer NOT NULL,
	"purchased_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "llms_field_purchases" ADD CONSTRAINT "llms_field_purchases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_field_unique" ON "llms_field_purchases" USING btree ("user_id","field_key");