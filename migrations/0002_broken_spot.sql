CREATE TABLE "robots_field_purchases" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"field_key" text NOT NULL,
	"stripe_payment_intent_id" text,
	"amount" integer NOT NULL,
	"purchased_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_domain_cooldowns" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"domain" text NOT NULL,
	"last_scan_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "robots_field_purchases" ADD CONSTRAINT "robots_field_purchases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_domain_cooldowns" ADD CONSTRAINT "user_domain_cooldowns_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_robots_field_unique" ON "robots_field_purchases" USING btree ("user_id","field_key");--> statement-breakpoint
CREATE UNIQUE INDEX "user_domain_cooldown_unique" ON "user_domain_cooldowns" USING btree ("user_id","domain");