import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1710000000000 implements MigrationInterface {
  name = "InitialSchema1710000000000";

  async up(queryRunner: QueryRunner) {
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" varchar(24) PRIMARY KEY,
        "name" varchar(100) NOT NULL,
        "email" varchar(254) NOT NULL,
        "password_hash" varchar(128) NOT NULL,
        "password_salt" varchar(64) NOT NULL,
        "plan" varchar(20) NOT NULL DEFAULT 'Free',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "resume_count" integer NOT NULL DEFAULT 0,
        "two_factor_secret" text,
        "two_factor_pending_secret" text,
        "two_factor_pending_expires_at" timestamptz,
        "two_factor_last_counter" bigint
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "users_email_unique" ON "users" ("email")`);
    await queryRunner.query(`
      CREATE TABLE "resume_requests" (
        "id" varchar(24) PRIMARY KEY,
        "user_id" varchar(24) NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "status" varchar(20) NOT NULL DEFAULT 'new',
        "name" varchar(100) NOT NULL,
        "email" varchar(254) NOT NULL,
        "phone" varchar(40) NOT NULL,
        "target_role" varchar(120) NOT NULL,
        "experience" text NOT NULL,
        "education" text NOT NULL DEFAULT '',
        "skills" text NOT NULL DEFAULT '',
        "summary" text NOT NULL DEFAULT '',
        "links" text NOT NULL DEFAULT '',
        "additional_info" text NOT NULL DEFAULT '',
        "job_description" text NOT NULL DEFAULT '',
        "resume_language" varchar(20) NOT NULL DEFAULT 'English',
        "resume_template" varchar(20) NOT NULL DEFAULT 'Professional'
      )
    `);
    await queryRunner.query(`CREATE INDEX "resume_requests_user_id_idx" ON "resume_requests" ("user_id")`);
    await queryRunner.query(`
      CREATE TABLE "generated_resumes" (
        "id" varchar(24) PRIMARY KEY,
        "user_id" varchar(24) NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "request_id" varchar(24) NOT NULL REFERENCES "resume_requests"("id") ON DELETE CASCADE,
        "file_name" varchar(150) NOT NULL,
        "content_type" varchar(150) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "file_data" bytea NOT NULL
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "generated_resumes_request_id_unique" ON "generated_resumes" ("request_id")`);
    await queryRunner.query(`CREATE INDEX "generated_resumes_user_id_idx" ON "generated_resumes" ("user_id")`);
    await queryRunner.query(`
      CREATE TABLE "contact_messages" (
        "id" varchar(24) PRIMARY KEY,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "name" varchar(100) NOT NULL,
        "email" varchar(254) NOT NULL,
        "subject" varchar(150) NOT NULL,
        "message" text NOT NULL
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "app_settings" (
        "id" varchar(50) PRIMARY KEY,
        "webhook_url" text,
        "webhook_secret" text,
        "admin_two_factor_secret" text,
        "admin_two_factor_pending_secret" text,
        "admin_two_factor_pending_expires_at" timestamptz,
        "admin_two_factor_last_counter" bigint,
        "content" jsonb,
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "security_rate_limits" (
        "id" varchar(160) PRIMARY KEY,
        "count" integer NOT NULL DEFAULT 0,
        "expires_at" timestamptz NOT NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX "security_rate_limits_expires_at_idx" ON "security_rate_limits" ("expires_at")`);
    await queryRunner.query(`
      CREATE TABLE "password_reset_tokens" (
        "user_id" varchar(24) PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
        "otp_hash" varchar(64) NOT NULL,
        "attempts" integer NOT NULL DEFAULT 0,
        "expires_at" timestamptz NOT NULL
      )
    `);
  }

  async down(queryRunner: QueryRunner) {
    await queryRunner.query(`DROP TABLE "password_reset_tokens"`);
    await queryRunner.query(`DROP TABLE "security_rate_limits"`);
    await queryRunner.query(`DROP TABLE "app_settings"`);
    await queryRunner.query(`DROP TABLE "contact_messages"`);
    await queryRunner.query(`DROP TABLE "generated_resumes"`);
    await queryRunner.query(`DROP TABLE "resume_requests"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
