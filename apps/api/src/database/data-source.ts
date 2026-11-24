import "reflect-metadata";
import "dotenv/config";
import { DataSource } from "typeorm";
import {
  AppSettingsEntity,
  ContactMessageEntity,
  GeneratedResumeEntity,
  PasswordResetTokenEntity,
  PaymentTransactionEntity,
  ResumeRequestEntity,
  SecurityRateLimitEntity,
  UserEntity,
} from "./entities";

const databaseUrl = process.env.MIGRATIONS_DATABASE_URL || process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("MIGRATIONS_DATABASE_URL or DATABASE_URL is required to run database migrations.");
}

export default new DataSource({
  type: "postgres",
  url: databaseUrl,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: true } : undefined,
  extra: { max: Number(process.env.DATABASE_POOL_MAX ?? 5) },
  entities: [
    UserEntity,
    ResumeRequestEntity,
    GeneratedResumeEntity,
    ContactMessageEntity,
    AppSettingsEntity,
    SecurityRateLimitEntity,
    PasswordResetTokenEntity,
    PaymentTransactionEntity,
  ],
  migrations: [__dirname + "/migrations/*{.js,.ts}"],
  synchronize: false,
});
