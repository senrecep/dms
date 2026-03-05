CREATE TYPE "public"."car_action_status" AS ENUM('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."car_attachment_section" AS ENUM('REQUEST', 'ROOT_CAUSE', 'IMMEDIATE_ACTION', 'CORRECTIVE_ACTION', 'CLOSURE');--> statement-breakpoint
CREATE TYPE "public"."car_status" AS ENUM('OPEN', 'ROOT_CAUSE_ANALYSIS', 'IMMEDIATE_ACTION', 'PLANNED_ACTION', 'ACTION_RESULTS', 'PENDING_CLOSURE', 'CLOSED', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "car_action_team" (
	"id" text PRIMARY KEY NOT NULL,
	"corrective_action_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "car_activity_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"car_id" text NOT NULL,
	"corrective_action_id" text,
	"user_id" text NOT NULL,
	"action" text NOT NULL,
	"details" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "car_attachments" (
	"id" text PRIMARY KEY NOT NULL,
	"car_id" text NOT NULL,
	"corrective_action_id" text,
	"section" "car_attachment_section" NOT NULL,
	"file_path" text NOT NULL,
	"file_name" text NOT NULL,
	"file_size" integer,
	"mime_type" text,
	"uploaded_by_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "car_corrective_actions" (
	"id" text PRIMARY KEY NOT NULL,
	"car_id" text NOT NULL,
	"description" text NOT NULL,
	"owner_id" text NOT NULL,
	"target_date" timestamp with time zone NOT NULL,
	"status" "car_action_status" DEFAULT 'OPEN' NOT NULL,
	"completed_at" timestamp with time zone,
	"results" text,
	"cost" text,
	"created_by_id" text NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "car_immediate_actions" (
	"id" text PRIMARY KEY NOT NULL,
	"car_id" text NOT NULL,
	"description" text NOT NULL,
	"created_by_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "car_customers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "car_customers_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "car_operations" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "car_operations_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "car_processes" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "car_processes_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "car_products" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "car_products_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "car_sources" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "car_sources_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "car_systems" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "car_systems_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "car_notification_users" (
	"id" text PRIMARY KEY NOT NULL,
	"car_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "car_root_cause_analyses" (
	"id" text PRIMARY KEY NOT NULL,
	"car_id" text NOT NULL,
	"description" text NOT NULL,
	"created_by_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "corrective_action_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"car_code" text NOT NULL,
	"status" "car_status" DEFAULT 'OPEN' NOT NULL,
	"source_id" text NOT NULL,
	"system_id" text,
	"process_id" text,
	"customer_id" text,
	"product_id" text,
	"operation_id" text,
	"related_standard" text,
	"nonconformity_description" text NOT NULL,
	"requester_id" text NOT NULL,
	"requester_department_id" text NOT NULL,
	"responsible_department_id" text NOT NULL,
	"assignee_id" text NOT NULL,
	"target_completion_date" timestamp with time zone NOT NULL,
	"closing_date" timestamp with time zone,
	"closed_by_id" text,
	"closing_approval_note" text,
	"dms_document_id" text,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "corrective_action_requests_car_code_unique" UNIQUE("car_code")
);
--> statement-breakpoint
CREATE TABLE "user_permissions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"permission" text NOT NULL,
	"granted_by_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "car_action_team" ADD CONSTRAINT "car_action_team_corrective_action_id_car_corrective_actions_id_fk" FOREIGN KEY ("corrective_action_id") REFERENCES "public"."car_corrective_actions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "car_action_team" ADD CONSTRAINT "car_action_team_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "car_activity_logs" ADD CONSTRAINT "car_activity_logs_car_id_corrective_action_requests_id_fk" FOREIGN KEY ("car_id") REFERENCES "public"."corrective_action_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "car_activity_logs" ADD CONSTRAINT "car_activity_logs_corrective_action_id_car_corrective_actions_id_fk" FOREIGN KEY ("corrective_action_id") REFERENCES "public"."car_corrective_actions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "car_activity_logs" ADD CONSTRAINT "car_activity_logs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "car_attachments" ADD CONSTRAINT "car_attachments_car_id_corrective_action_requests_id_fk" FOREIGN KEY ("car_id") REFERENCES "public"."corrective_action_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "car_attachments" ADD CONSTRAINT "car_attachments_corrective_action_id_car_corrective_actions_id_fk" FOREIGN KEY ("corrective_action_id") REFERENCES "public"."car_corrective_actions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "car_attachments" ADD CONSTRAINT "car_attachments_uploaded_by_id_user_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "car_corrective_actions" ADD CONSTRAINT "car_corrective_actions_car_id_corrective_action_requests_id_fk" FOREIGN KEY ("car_id") REFERENCES "public"."corrective_action_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "car_corrective_actions" ADD CONSTRAINT "car_corrective_actions_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "car_corrective_actions" ADD CONSTRAINT "car_corrective_actions_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "car_immediate_actions" ADD CONSTRAINT "car_immediate_actions_car_id_corrective_action_requests_id_fk" FOREIGN KEY ("car_id") REFERENCES "public"."corrective_action_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "car_immediate_actions" ADD CONSTRAINT "car_immediate_actions_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "car_notification_users" ADD CONSTRAINT "car_notification_users_car_id_corrective_action_requests_id_fk" FOREIGN KEY ("car_id") REFERENCES "public"."corrective_action_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "car_notification_users" ADD CONSTRAINT "car_notification_users_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "car_root_cause_analyses" ADD CONSTRAINT "car_root_cause_analyses_car_id_corrective_action_requests_id_fk" FOREIGN KEY ("car_id") REFERENCES "public"."corrective_action_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "car_root_cause_analyses" ADD CONSTRAINT "car_root_cause_analyses_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corrective_action_requests" ADD CONSTRAINT "corrective_action_requests_source_id_car_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."car_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corrective_action_requests" ADD CONSTRAINT "corrective_action_requests_system_id_car_systems_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."car_systems"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corrective_action_requests" ADD CONSTRAINT "corrective_action_requests_process_id_car_processes_id_fk" FOREIGN KEY ("process_id") REFERENCES "public"."car_processes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corrective_action_requests" ADD CONSTRAINT "corrective_action_requests_customer_id_car_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."car_customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corrective_action_requests" ADD CONSTRAINT "corrective_action_requests_product_id_car_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."car_products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corrective_action_requests" ADD CONSTRAINT "corrective_action_requests_operation_id_car_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "public"."car_operations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corrective_action_requests" ADD CONSTRAINT "corrective_action_requests_requester_id_user_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corrective_action_requests" ADD CONSTRAINT "corrective_action_requests_requester_department_id_departments_id_fk" FOREIGN KEY ("requester_department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corrective_action_requests" ADD CONSTRAINT "corrective_action_requests_responsible_department_id_departments_id_fk" FOREIGN KEY ("responsible_department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corrective_action_requests" ADD CONSTRAINT "corrective_action_requests_assignee_id_user_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corrective_action_requests" ADD CONSTRAINT "corrective_action_requests_closed_by_id_user_id_fk" FOREIGN KEY ("closed_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corrective_action_requests" ADD CONSTRAINT "corrective_action_requests_dms_document_id_documents_id_fk" FOREIGN KEY ("dms_document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_granted_by_id_user_id_fk" FOREIGN KEY ("granted_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "car_action_team_action_user_idx" ON "car_action_team" USING btree ("corrective_action_id","user_id");--> statement-breakpoint
CREATE INDEX "car_action_team_corrective_action_id_idx" ON "car_action_team" USING btree ("corrective_action_id");--> statement-breakpoint
CREATE INDEX "car_action_team_user_id_idx" ON "car_action_team" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "car_activity_logs_car_id_idx" ON "car_activity_logs" USING btree ("car_id");--> statement-breakpoint
CREATE INDEX "car_activity_logs_user_id_idx" ON "car_activity_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "car_activity_logs_action_idx" ON "car_activity_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "car_activity_logs_car_created_idx" ON "car_activity_logs" USING btree ("car_id","created_at");--> statement-breakpoint
CREATE INDEX "car_activity_logs_user_created_idx" ON "car_activity_logs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "car_attachments_car_id_idx" ON "car_attachments" USING btree ("car_id");--> statement-breakpoint
CREATE INDEX "car_attachments_corrective_action_id_idx" ON "car_attachments" USING btree ("corrective_action_id");--> statement-breakpoint
CREATE INDEX "car_attachments_section_idx" ON "car_attachments" USING btree ("section");--> statement-breakpoint
CREATE INDEX "car_corrective_actions_car_id_idx" ON "car_corrective_actions" USING btree ("car_id");--> statement-breakpoint
CREATE INDEX "car_corrective_actions_owner_id_idx" ON "car_corrective_actions" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "car_corrective_actions_status_idx" ON "car_corrective_actions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "car_corrective_actions_target_date_idx" ON "car_corrective_actions" USING btree ("target_date");--> statement-breakpoint
CREATE INDEX "car_immediate_actions_car_id_idx" ON "car_immediate_actions" USING btree ("car_id");--> statement-breakpoint
CREATE INDEX "car_customers_name_idx" ON "car_customers" USING btree ("name");--> statement-breakpoint
CREATE INDEX "car_customers_is_deleted_idx" ON "car_customers" USING btree ("is_deleted");--> statement-breakpoint
CREATE INDEX "car_operations_name_idx" ON "car_operations" USING btree ("name");--> statement-breakpoint
CREATE INDEX "car_operations_is_deleted_idx" ON "car_operations" USING btree ("is_deleted");--> statement-breakpoint
CREATE INDEX "car_processes_name_idx" ON "car_processes" USING btree ("name");--> statement-breakpoint
CREATE INDEX "car_processes_is_deleted_idx" ON "car_processes" USING btree ("is_deleted");--> statement-breakpoint
CREATE INDEX "car_products_name_idx" ON "car_products" USING btree ("name");--> statement-breakpoint
CREATE INDEX "car_products_is_deleted_idx" ON "car_products" USING btree ("is_deleted");--> statement-breakpoint
CREATE INDEX "car_sources_name_idx" ON "car_sources" USING btree ("name");--> statement-breakpoint
CREATE INDEX "car_sources_is_deleted_idx" ON "car_sources" USING btree ("is_deleted");--> statement-breakpoint
CREATE INDEX "car_systems_name_idx" ON "car_systems" USING btree ("name");--> statement-breakpoint
CREATE INDEX "car_systems_is_deleted_idx" ON "car_systems" USING btree ("is_deleted");--> statement-breakpoint
CREATE UNIQUE INDEX "car_notification_users_car_user_idx" ON "car_notification_users" USING btree ("car_id","user_id");--> statement-breakpoint
CREATE INDEX "car_notification_users_car_id_idx" ON "car_notification_users" USING btree ("car_id");--> statement-breakpoint
CREATE INDEX "car_notification_users_user_id_idx" ON "car_notification_users" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "car_root_cause_car_id_idx" ON "car_root_cause_analyses" USING btree ("car_id");--> statement-breakpoint
CREATE INDEX "car_status_idx" ON "corrective_action_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "car_source_id_idx" ON "corrective_action_requests" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "car_requester_id_idx" ON "corrective_action_requests" USING btree ("requester_id");--> statement-breakpoint
CREATE INDEX "car_assignee_id_idx" ON "corrective_action_requests" USING btree ("assignee_id");--> statement-breakpoint
CREATE INDEX "car_requester_department_id_idx" ON "corrective_action_requests" USING btree ("requester_department_id");--> statement-breakpoint
CREATE INDEX "car_responsible_department_id_idx" ON "corrective_action_requests" USING btree ("responsible_department_id");--> statement-breakpoint
CREATE INDEX "car_target_completion_date_idx" ON "corrective_action_requests" USING btree ("target_completion_date");--> statement-breakpoint
CREATE INDEX "car_is_deleted_idx" ON "corrective_action_requests" USING btree ("is_deleted");--> statement-breakpoint
CREATE INDEX "car_status_is_deleted_idx" ON "corrective_action_requests" USING btree ("status","is_deleted");--> statement-breakpoint
CREATE UNIQUE INDEX "user_permissions_user_permission_idx" ON "user_permissions" USING btree ("user_id","permission");--> statement-breakpoint
CREATE INDEX "user_permissions_user_id_idx" ON "user_permissions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_permissions_permission_idx" ON "user_permissions" USING btree ("permission");