CREATE TABLE IF NOT EXISTS "attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_path" text NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"file_size" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "conversation_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"is_muted" boolean DEFAULT false NOT NULL,
	"last_read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar(16) DEFAULT 'direct' NOT NULL,
	"last_message_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "message_receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" varchar(16) DEFAULT 'sent' NOT NULL,
	"read_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"reply_to_id" uuid,
	"content" text NOT NULL,
	"message_type" varchar(16) DEFAULT 'text' NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "otp_challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone_number" varchar(32),
	"identifier" varchar(255),
	"type" varchar(16) DEFAULT 'phone' NOT NULL,
	"otp_hash" varchar(128) NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"resend_available_at" timestamp with time zone NOT NULL,
	"is_consumed" boolean DEFAULT false NOT NULL,
	"ip_address" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" varchar(128) NOT NULL,
	"ip_address" varchar(64),
	"user_agent" text,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_active_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"blocker_id" uuid NOT NULL,
	"blocked_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"contact_user_id" uuid NOT NULL,
	"custom_name" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_privacy_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"last_seen_visibility" varchar(16) DEFAULT 'everyone' NOT NULL,
	"online_visibility" varchar(16) DEFAULT 'everyone' NOT NULL,
	"avatar_visibility" varchar(16) DEFAULT 'everyone' NOT NULL,
	"about_visibility" varchar(16) DEFAULT 'everyone' NOT NULL,
	"read_receipts_enabled" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone_number" varchar(32),
	"phone_country_code" varchar(8),
	"email" varchar(255),
	"display_name" varchar(100),
	"avatar_url" text,
	"about" text DEFAULT 'Hey there! I am using MatrixChat.',
	"last_seen_at" timestamp with time zone,
	"is_online" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "otp_challenges" ALTER COLUMN "phone_number" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "otp_challenges" ADD COLUMN IF NOT EXISTS "identifier" varchar(255);--> statement-breakpoint
ALTER TABLE "otp_challenges" ADD COLUMN IF NOT EXISTS "type" varchar(16) DEFAULT 'phone' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "phone_number" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "phone_country_code" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email" varchar(255);--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_email_unique') THEN
    ALTER TABLE "users" ADD CONSTRAINT "users_email_unique" UNIQUE("email");
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_phone_number_unique') THEN
    ALTER TABLE "users" ADD CONSTRAINT "users_phone_number_unique" UNIQUE("phone_number");
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sessions_token_hash_unique') THEN
    ALTER TABLE "sessions" ADD CONSTRAINT "sessions_token_hash_unique" UNIQUE("token_hash");
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_privacy_settings_user_id_unique') THEN
    ALTER TABLE "user_privacy_settings" ADD CONSTRAINT "user_privacy_settings_user_id_unique" UNIQUE("user_id");
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "attachments" ADD CONSTRAINT "attachments_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "message_receipts" ADD CONSTRAINT "message_receipts_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "message_receipts" ADD CONSTRAINT "message_receipts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocker_id_users_id_fk" FOREIGN KEY ("blocker_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocked_id_users_id_fk" FOREIGN KEY ("blocked_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "user_contacts" ADD CONSTRAINT "user_contacts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "user_contacts" ADD CONSTRAINT "user_contacts_contact_user_id_users_id_fk" FOREIGN KEY ("contact_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "user_privacy_settings" ADD CONSTRAINT "user_privacy_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_attachments_message" ON "attachments" USING btree ("message_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_participant_unique" ON "conversation_participants" USING btree ("conversation_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_participant_user" ON "conversation_participants" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_participant_conv" ON "conversation_participants" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_conv_last_message" ON "conversations" USING btree ("last_message_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_receipt_message_user" ON "message_receipts" USING btree ("message_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_receipt_user" ON "message_receipts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_messages_conv_created" ON "messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_messages_sender" ON "messages" USING btree ("sender_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_otp_identifier" ON "otp_challenges" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_otp_phone" ON "otp_challenges" USING btree ("phone_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_otp_created_at" ON "otp_challenges" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sessions_user" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sessions_token_hash" ON "sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_user_block_unique" ON "user_blocks" USING btree ("blocker_id","blocked_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_block_blocker" ON "user_blocks" USING btree ("blocker_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_user_contact_unique" ON "user_contacts" USING btree ("user_id","contact_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_contact_user" ON "user_contacts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_users_phone" ON "users" USING btree ("phone_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_users_email" ON "users" USING btree ("email");