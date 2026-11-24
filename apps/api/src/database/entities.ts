import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "users" })
@Index("users_email_unique", ["email"], { unique: true })
export class UserEntity {
  @PrimaryColumn({ type: "varchar", length: 24 })
  id!: string;

  @Column({ type: "varchar", length: 100 })
  name!: string;

  @Column({ type: "varchar", length: 254 })
  email!: string;

  @Column({ name: "password_hash", type: "varchar", length: 128 })
  passwordHash!: string;

  @Column({ name: "password_salt", type: "varchar", length: 64 })
  passwordSalt!: string;

  @Column({ type: "varchar", length: 20, default: "Free" })
  plan!: "Free" | "Premium" | "Platinum";

  @Column({ name: "plan_expires_at", type: "timestamptz", nullable: true })
  planExpiresAt!: Date | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @Column({ name: "resume_count", type: "integer", default: 0 })
  resumeCount!: number;

  @Column({ name: "two_factor_secret", type: "text", nullable: true })
  twoFactorSecret!: string | null;

  @Column({ name: "two_factor_pending_secret", type: "text", nullable: true })
  twoFactorPendingSecret!: string | null;

  @Column({ name: "two_factor_pending_expires_at", type: "timestamptz", nullable: true })
  twoFactorPendingExpiresAt!: Date | null;

  @Column({ name: "two_factor_last_counter", type: "bigint", nullable: true })
  twoFactorLastCounter!: string | null;
}

@Entity({ name: "payment_transactions" })
@Index("payment_transactions_transaction_id_unique", ["transactionId"], { unique: true })
@Index("payment_transactions_user_id_idx", ["userId"])
export class PaymentTransactionEntity {
  @PrimaryColumn({ type: "varchar", length: 24 })
  id!: string;

  @Column({ name: "user_id", type: "varchar", length: 24 })
  userId!: string;

  @Column({ type: "varchar", length: 20 })
  plan!: "Premium" | "Platinum";

  @Column({ name: "transaction_id", type: "varchar", length: 24 })
  transactionId!: string;

  @Column({ type: "numeric", precision: 10, scale: 2 })
  amount!: string;

  @Column({ type: "varchar", length: 3, default: "BDT" })
  currency!: string;

  @Column({ type: "varchar", length: 20, default: "pending" })
  status!: "pending" | "paid" | "failed" | "cancelled";

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @Column({ name: "paid_at", type: "timestamptz", nullable: true })
  paidAt!: Date | null;

  @Column({ name: "expires_at", type: "timestamptz", nullable: true })
  expiresAt!: Date | null;
}

@Entity({ name: "resume_requests" })
@Index("resume_requests_user_id_idx", ["userId"])
export class ResumeRequestEntity {
  @PrimaryColumn({ type: "varchar", length: 24 })
  id!: string;

  @Column({ name: "user_id", type: "varchar", length: 24 })
  userId!: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @Column({ type: "varchar", length: 20, default: "new" })
  status!: "new" | "in-progress" | "completed";

  @Column({ type: "varchar", length: 100 })
  name!: string;

  @Column({ type: "varchar", length: 254 })
  email!: string;

  @Column({ type: "varchar", length: 40 })
  phone!: string;

  @Column({ name: "target_role", type: "varchar", length: 120 })
  targetRole!: string;

  @Column({ type: "text" })
  experience!: string;

  @Column({ type: "text", default: "" })
  education!: string;

  @Column({ type: "text", default: "" })
  skills!: string;

  @Column({ type: "text", default: "" })
  summary!: string;

  @Column({ type: "text", default: "" })
  links!: string;

  @Column({ name: "additional_info", type: "text", default: "" })
  additionalInfo!: string;

  @Column({ name: "job_description", type: "text", default: "" })
  jobDescription!: string;

  @Column({ name: "resume_language", type: "varchar", length: 20, default: "English" })
  resumeLanguage!: "English" | "Bangla";

  @Column({ name: "resume_template", type: "varchar", length: 20, default: "Professional" })
  resumeTemplate!: "Minimal" | "Modern" | "Professional";
}

@Entity({ name: "generated_resumes" })
@Index("generated_resumes_request_id_unique", ["requestId"], { unique: true })
@Index("generated_resumes_user_id_idx", ["userId"])
export class GeneratedResumeEntity {
  @PrimaryColumn({ type: "varchar", length: 24 })
  id!: string;

  @Column({ name: "user_id", type: "varchar", length: 24 })
  userId!: string;

  @Column({ name: "request_id", type: "varchar", length: 24 })
  requestId!: string;

  @Column({ name: "file_name", type: "varchar", length: 150 })
  fileName!: string;

  @Column({ name: "content_type", type: "varchar", length: 150 })
  contentType!: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @Column({ name: "file_data", type: "bytea" })
  fileData!: Buffer;
}

@Entity({ name: "contact_messages" })
export class ContactMessageEntity {
  @PrimaryColumn({ type: "varchar", length: 24 })
  id!: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @Column({ type: "varchar", length: 100 })
  name!: string;

  @Column({ type: "varchar", length: 254 })
  email!: string;

  @Column({ type: "varchar", length: 150 })
  subject!: string;

  @Column({ type: "text" })
  message!: string;
}

@Entity({ name: "app_settings" })
export class AppSettingsEntity {
  @PrimaryColumn({ type: "varchar", length: 50 })
  id!: string;

  @Column({ name: "webhook_url", type: "text", nullable: true })
  webhookUrl!: string | null;

  @Column({ name: "webhook_secret", type: "text", nullable: true })
  webhookSecret!: string | null;

  @Column({ name: "admin_two_factor_secret", type: "text", nullable: true })
  adminTwoFactorSecret!: string | null;

  @Column({ name: "admin_two_factor_pending_secret", type: "text", nullable: true })
  adminTwoFactorPendingSecret!: string | null;

  @Column({ name: "admin_two_factor_pending_expires_at", type: "timestamptz", nullable: true })
  adminTwoFactorPendingExpiresAt!: Date | null;

  @Column({ name: "admin_two_factor_last_counter", type: "bigint", nullable: true })
  adminTwoFactorLastCounter!: string | null;

  @Column({ type: "jsonb", nullable: true })
  content!: unknown;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}

@Entity({ name: "security_rate_limits" })
export class SecurityRateLimitEntity {
  @PrimaryColumn({ type: "varchar", length: 160 })
  id!: string;

  @Column({ type: "integer", default: 0 })
  count!: number;

  @Column({ name: "expires_at", type: "timestamptz" })
  expiresAt!: Date;
}

@Entity({ name: "password_reset_tokens" })
export class PasswordResetTokenEntity {
  @PrimaryColumn({ name: "user_id", type: "varchar", length: 24 })
  userId!: string;

  @Column({ name: "otp_hash", type: "varchar", length: 64 })
  otpHash!: string;

  @Column({ type: "integer", default: 0 })
  attempts!: number;

  @Column({ name: "expires_at", type: "timestamptz" })
  expiresAt!: Date;
}
