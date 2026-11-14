import "reflect-metadata";
import "dotenv/config";
import { MongoClient } from "mongodb";
import dataSource from "./data-source";

type MongoDocument = Record<string, unknown> & { _id?: unknown };

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function idValue(value: unknown) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "toHexString" in value &&
      typeof value.toHexString === "function") {
    return value.toHexString();
  }
  throw new Error("Encountered a MongoDB document without a supported identifier.");
}

function dateValue(value: unknown) {
  const date = value instanceof Date ? value : new Date(String(value ?? ""));
  if (Number.isNaN(date.getTime())) throw new Error("Encountered a document with an invalid date.");
  return date;
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

async function main() {
  if (process.env.ALLOW_MONGODB_IMPORT !== "true") {
    throw new Error("Set ALLOW_MONGODB_IMPORT=true to explicitly enable this one-time import.");
  }
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required for the import.");
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for the import.");

  const mongo = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10_000 });
  await mongo.connect();
  await dataSource.initialize();
  try {
    const database = mongo.db(process.env.MONGODB_DB || "resumecraft");
    const users = await database.collection<MongoDocument>("users").find().toArray();
    const requests = await database.collection<MongoDocument>("resumeRequests").find().toArray();
    const resumes = await database.collection<MongoDocument>("generatedResumes").find().toArray();
    const messages = await database.collection<MongoDocument>("contactMessages").find().toArray();
    const settingsDocuments = await database.collection<MongoDocument>("settings").find().toArray();
    const settings = settingsDocuments.find((document) => String(document._id) === "site-settings");
    const resetTokens = await database.collection<MongoDocument>("passwordResetTokens").find().toArray();

    await dataSource.transaction(async (manager) => {
      for (const user of users) {
        const id = idValue(user._id);
        const plan = ["Free", "Premium", "Platinum"].includes(stringValue(user.plan))
          ? stringValue(user.plan)
          : "Free";
        const requestCount = requests.filter((request) => stringValue(request.userId) === id).length;
        await manager.query(
          `INSERT INTO users (
            id, name, email, password_hash, password_salt, plan, created_at, resume_count,
            two_factor_secret, two_factor_pending_secret, two_factor_pending_expires_at, two_factor_last_counter
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name, email = EXCLUDED.email, password_hash = EXCLUDED.password_hash,
            password_salt = EXCLUDED.password_salt, plan = EXCLUDED.plan, created_at = EXCLUDED.created_at,
            resume_count = EXCLUDED.resume_count, two_factor_secret = EXCLUDED.two_factor_secret,
            two_factor_pending_secret = EXCLUDED.two_factor_pending_secret,
            two_factor_pending_expires_at = EXCLUDED.two_factor_pending_expires_at,
            two_factor_last_counter = EXCLUDED.two_factor_last_counter`,
          [
            id,
            stringValue(user.name),
            stringValue(user.email).trim().toLowerCase(),
            stringValue(user.passwordHash),
            stringValue(user.passwordSalt),
            plan,
            dateValue(user.createdAt),
            numberValue(user.resumeCount, requestCount),
            user.twoFactorSecret ?? null,
            user.twoFactorPendingSecret ?? null,
            user.twoFactorPendingExpiresAt ? dateValue(user.twoFactorPendingExpiresAt) : null,
            user.twoFactorLastCounter === undefined ? null : String(user.twoFactorLastCounter),
          ],
        );
      }

      for (const request of requests) {
        await manager.query(
          `INSERT INTO resume_requests (
            id, user_id, created_at, status, name, email, phone, target_role, experience, education,
            skills, summary, links, additional_info, job_description, resume_language, resume_template
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
          ON CONFLICT (id) DO UPDATE SET
            user_id = EXCLUDED.user_id, created_at = EXCLUDED.created_at, status = EXCLUDED.status,
            name = EXCLUDED.name, email = EXCLUDED.email, phone = EXCLUDED.phone,
            target_role = EXCLUDED.target_role, experience = EXCLUDED.experience,
            education = EXCLUDED.education, skills = EXCLUDED.skills, summary = EXCLUDED.summary,
            links = EXCLUDED.links, additional_info = EXCLUDED.additional_info,
            job_description = EXCLUDED.job_description, resume_language = EXCLUDED.resume_language,
            resume_template = EXCLUDED.resume_template`,
          [
            idValue(request._id),
            stringValue(request.userId),
            dateValue(request.createdAt),
            stringValue(request.status, "new"),
            stringValue(request.name),
            stringValue(request.email),
            stringValue(request.phone),
            stringValue(request.targetRole),
            stringValue(request.experience),
            stringValue(request.education),
            stringValue(request.skills),
            stringValue(request.summary),
            stringValue(request.links),
            stringValue(request.additionalInfo),
            stringValue(request.jobDescription),
            stringValue(request.resumeLanguage, "English"),
            stringValue(request.resumeTemplate, "Professional"),
          ],
        );
      }

      for (const resume of resumes) {
        const data = resume.fileData;
        const fileData = Buffer.isBuffer(data)
          ? data
          : Buffer.from(stringValue(data), "base64");
        await manager.query(
          `INSERT INTO generated_resumes (
            id, user_id, request_id, file_name, content_type, created_at, file_data
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (request_id) DO UPDATE SET
            user_id = EXCLUDED.user_id, file_name = EXCLUDED.file_name,
            content_type = EXCLUDED.content_type, created_at = EXCLUDED.created_at,
            file_data = EXCLUDED.file_data`,
          [
            idValue(resume._id),
            stringValue(resume.userId),
            stringValue(resume.requestId),
            stringValue(resume.fileName, "resume"),
            stringValue(resume.contentType, "application/octet-stream"),
            dateValue(resume.createdAt),
            fileData,
          ],
        );
      }

      for (const message of messages) {
        await manager.query(
          `INSERT INTO contact_messages (id, created_at, name, email, subject, message)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (id) DO UPDATE SET
            created_at = EXCLUDED.created_at, name = EXCLUDED.name,
            email = EXCLUDED.email, subject = EXCLUDED.subject, message = EXCLUDED.message`,
          [
            idValue(message._id),
            dateValue(message.createdAt),
            stringValue(message.name),
            stringValue(message.email),
            stringValue(message.subject),
            stringValue(message.message),
          ],
        );
      }

      if (settings) {
        await manager.query(
          `INSERT INTO app_settings (
            id, webhook_url, webhook_secret, admin_two_factor_secret,
            admin_two_factor_pending_secret, admin_two_factor_pending_expires_at,
            admin_two_factor_last_counter, content, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())
          ON CONFLICT (id) DO UPDATE SET
            webhook_url = EXCLUDED.webhook_url, webhook_secret = EXCLUDED.webhook_secret,
            admin_two_factor_secret = EXCLUDED.admin_two_factor_secret,
            admin_two_factor_pending_secret = EXCLUDED.admin_two_factor_pending_secret,
            admin_two_factor_pending_expires_at = EXCLUDED.admin_two_factor_pending_expires_at,
            admin_two_factor_last_counter = EXCLUDED.admin_two_factor_last_counter,
            content = EXCLUDED.content, updated_at = now()`,
          [
            "site-settings",
            settings.webhookUrl ?? null,
            settings.webhookSecret ?? null,
            settings.adminTwoFactorSecret ?? null,
            settings.adminTwoFactorPendingSecret ?? null,
            settings.adminTwoFactorPendingExpiresAt
              ? dateValue(settings.adminTwoFactorPendingExpiresAt)
              : null,
            settings.adminTwoFactorLastCounter === undefined
              ? null
              : String(settings.adminTwoFactorLastCounter),
            settings.content ?? null,
          ],
        );
      }

      for (const token of resetTokens) {
        if (typeof token.otpHash !== "string" || !token.expiresAt ||
            dateValue(token.expiresAt) <= new Date()) continue;
        const userId = stringValue(token.userId, idValue(token._id));
        await manager.query(
          `INSERT INTO password_reset_tokens (user_id, otp_hash, attempts, expires_at)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (user_id) DO UPDATE SET
            otp_hash = EXCLUDED.otp_hash, attempts = EXCLUDED.attempts, expires_at = EXCLUDED.expires_at`,
          [userId, token.otpHash, numberValue(token.attempts), dateValue(token.expiresAt)],
        );
      }
    });

    console.log(JSON.stringify({
      imported: {
        users: users.length,
        resumeRequests: requests.length,
        generatedResumes: resumes.length,
        contactMessages: messages.length,
        passwordResetTokens: resetTokens.length,
        settings: settings ? 1 : 0,
      },
    }));
  } finally {
    await Promise.all([mongo.close(), dataSource.destroy()]);
  }
}

void main().catch((error: unknown) => {
  console.error("MongoDB import failed.", error);
  process.exitCode = 1;
});
