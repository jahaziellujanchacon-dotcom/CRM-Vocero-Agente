CREATE TABLE "lead_routing" (
	"organization_id" text PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"last_assigned_user_id" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lead_routing_member" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"receives_leads" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lead" ADD COLUMN "assigned_user_id" text;--> statement-breakpoint
ALTER TABLE "lead" ADD COLUMN "assigned_at" timestamp;--> statement-breakpoint
ALTER TABLE "lead_routing" ADD CONSTRAINT "lead_routing_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_routing_member" ADD CONSTRAINT "lead_routing_member_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_routing_member" ADD CONSTRAINT "lead_routing_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "lead_routing_member_org_user_uq" ON "lead_routing_member" USING btree ("organization_id","user_id");--> statement-breakpoint
ALTER TABLE "lead" ADD CONSTRAINT "lead_assigned_user_id_user_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lead_org_assignee_idx" ON "lead" USING btree ("organization_id","assigned_user_id");