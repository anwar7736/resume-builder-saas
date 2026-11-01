import { createHmac } from "node:crypto";
import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/mongodb";
import { defaultSiteContent, isSiteContent, type SiteContent } from "@/lib/site-content";
import { decryptTwoFactorSecret, encryptTwoFactorSecret } from "@/lib/two-factor.server";

export type ResumeRequestStatus = "new" | "in-progress" | "completed";
export type AccountPlan = "Free" | "Premium" | "Platinum";

export type ResumeRequest = {
  id: string;
  userId: string;
  createdAt: string;
  status: ResumeRequestStatus;
  name: string;
  email: string;
  phone: string;
  targetRole: string;
  experience: string;
  education: string;
  skills: string;
  summary: string;
  links: string;
  additionalInfo: string;
  jobDescription: string;
  resumeLanguage: "English" | "Bangla";
  resumeTemplate: "Minimal" | "Modern" | "Professional";
};

export type GeneratedResume = {
  id: string;
  requestId: string;
  fileName: string;
  contentType: string;
  createdAt: string;
};

export type UserAccount = {
  id: string;
  name: string;
  email: string;
  plan: AccountPlan;
  createdAt: string;
  resumeCount: number;
};

export type ContactMessage = {
  id: string;
  createdAt: string;
  name: string;
  email: string;
  subject: string;
  message: string;
};

type UserDocument = Omit<UserAccount, "id"> & {
  _id: ObjectId;
  passwordHash: string;
  passwordSalt: string;
  twoFactorSecret?: string;
  twoFactorPendingSecret?: string;
  twoFactorPendingExpiresAt?: Date;
  twoFactorLastCounter?: number;
};

type RequestDocument = Omit<ResumeRequest, "id"> & { _id: ObjectId };
type SettingsDocument = {
  _id: string;
  webhookUrl?: string;
  webhookSecret?: string;
  adminTwoFactorSecret?: string;
  adminTwoFactorPendingSecret?: string;
  adminTwoFactorPendingExpiresAt?: Date;
  adminTwoFactorLastCounter?: number;
  content?: unknown;
};
type ContactDocument = Omit<ContactMessage, "id"> & { _id: ObjectId };
type GeneratedResumeDocument = Omit<GeneratedResume, "id"> & {
  _id: ObjectId;
  userId: string;
  fileData: string;
};
type ContactRateLimitDocument = { _id: string; count: number; expiresAt: Date };

const settingsId = "site-settings";
const contactRateWindowMs = 15 * 60_000;
const contactRateLimit = 5;
let contactRateLimitIndexPromise: Promise<void> | undefined;
let generatedResumeIndexPromise: Promise<void> | undefined;
let twoFactorRateLimitIndexPromise: Promise<void> | undefined;

function toUserAccount(user: UserDocument): UserAccount {
  return {
    id: user._id.toHexString(),
    name: user.name,
    email: user.email,
    plan: user.plan,
    createdAt: user.createdAt,
    resumeCount: user.resumeCount,
  };
}

function toResumeRequest(request: RequestDocument): ResumeRequest {
  const { _id, ...fields } = request;
  return {
    ...fields,
    jobDescription: fields.jobDescription ?? "",
    resumeLanguage: fields.resumeLanguage ?? "English",
    resumeTemplate: fields.resumeTemplate ?? "Professional",
    id: _id.toHexString(),
  };
}

export async function createUser(input: {
  name: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  plan?: AccountPlan;
}) {
  const db = await getDatabase();
  const users = db.collection<UserDocument>("users");
  await users.createIndex({ email: 1 }, { unique: true });
  const user: UserDocument = {
    _id: new ObjectId(),
    name: input.name,
    email: input.email,
    passwordHash: input.passwordHash,
    passwordSalt: input.passwordSalt,
    plan: input.plan ?? "Free",
    createdAt: new Date().toISOString(),
    resumeCount: 0,
  };
  await users.insertOne(user);
  return toUserAccount(user);
}

export async function findUserByEmail(email: string) {
  const user = await (await getDatabase()).collection<UserDocument>("users").findOne({ email });
  return user;
}

export async function findUserCredentialsById(id: string) {
  if (!ObjectId.isValid(id)) return null;
  return (await getDatabase()).collection<UserDocument>("users").findOne({ _id: new ObjectId(id) });
}

export async function getUserTwoFactorState(id: string) {
  if (!ObjectId.isValid(id)) return null;
  const user = await (await getDatabase()).collection<UserDocument>("users")
    .findOne({ _id: new ObjectId(id) }, {
      projection: {
        twoFactorSecret: 1,
        twoFactorPendingSecret: 1,
        twoFactorPendingExpiresAt: 1,
        twoFactorLastCounter: 1,
      },
    });
  if (!user) return null;
  return {
    enabled: Boolean(user.twoFactorSecret),
    secret: user.twoFactorSecret ? decryptTwoFactorSecret(user.twoFactorSecret) : undefined,
    pendingSecret: user.twoFactorPendingSecret &&
      user.twoFactorPendingExpiresAt && user.twoFactorPendingExpiresAt > new Date()
      ? decryptTwoFactorSecret(user.twoFactorPendingSecret)
      : undefined,
    lastCounter: user.twoFactorLastCounter,
  };
}

export async function setUserTwoFactorPendingSecret(id: string, secret: string) {
  if (!ObjectId.isValid(id)) return false;
  const result = await (await getDatabase()).collection<UserDocument>("users").updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        twoFactorPendingSecret: encryptTwoFactorSecret(secret),
        twoFactorPendingExpiresAt: new Date(Date.now() + 10 * 60_000),
      },
    },
  );
  return result.matchedCount === 1;
}

export async function enableUserTwoFactor(id: string, secret: string, lastCounter: number) {
  if (!ObjectId.isValid(id)) return false;
  const result = await (await getDatabase()).collection<UserDocument>("users").updateOne(
    { _id: new ObjectId(id) },
    {
      $set: { twoFactorSecret: encryptTwoFactorSecret(secret), twoFactorLastCounter: lastCounter },
      $unset: { twoFactorPendingSecret: true, twoFactorPendingExpiresAt: true },
    },
  );
  return result.matchedCount === 1;
}

export async function disableUserTwoFactor(id: string) {
  if (!ObjectId.isValid(id)) return false;
  const result = await (await getDatabase()).collection<UserDocument>("users").updateOne(
    { _id: new ObjectId(id) },
    { $unset: {
      twoFactorSecret: true,
      twoFactorPendingSecret: true,
      twoFactorPendingExpiresAt: true,
      twoFactorLastCounter: true,
    } },
  );
  return result.matchedCount === 1;
}

export async function consumeUserTwoFactorCounter(id: string, counter: number) {
  if (!ObjectId.isValid(id)) return false;
  const result = await (await getDatabase()).collection<UserDocument>("users").updateOne(
    {
      _id: new ObjectId(id),
      twoFactorSecret: { $exists: true },
      $or: [
        { twoFactorLastCounter: { $exists: false } },
        { twoFactorLastCounter: { $lt: counter } },
      ],
    },
    { $set: { twoFactorLastCounter: counter } },
  );
  return result.modifiedCount === 1;
}

export async function findUserById(id: string) {
  if (!ObjectId.isValid(id)) return null;
  const user = await (await getDatabase()).collection<UserDocument>("users").findOne({ _id: new ObjectId(id) });
  return user ? toUserAccount(user) : null;
}

export async function getUsers() {
  const users = await (await getDatabase()).collection<UserDocument>("users").find().sort({ createdAt: -1 }).toArray();
  return users.map(toUserAccount);
}

export async function updateUserPlan(id: string, plan: AccountPlan) {
  if (!ObjectId.isValid(id)) return false;
  const result = await (await getDatabase()).collection<UserDocument>("users").updateOne(
    { _id: new ObjectId(id) },
    { $set: { plan } },
  );
  return result.matchedCount === 1;
}

export async function updateUser(id: string, input: { name: string; email: string; plan: AccountPlan }) {
  if (!ObjectId.isValid(id)) return false;
  const result = await (await getDatabase()).collection<UserDocument>("users").updateOne(
    { _id: new ObjectId(id) },
    { $set: input },
  );
  return result.matchedCount === 1;
}

export async function deleteUser(id: string) {
  if (!ObjectId.isValid(id)) return false;
  const db = await getDatabase();
  const userId = new ObjectId(id);
  const user = await db.collection<UserDocument>("users").findOne({ _id: userId }, { projection: { _id: 1 } });
  if (!user) return false;
  await Promise.all([
    db.collection<RequestDocument>("resumeRequests").deleteMany({ userId: id }),
    db.collection<GeneratedResumeDocument>("generatedResumes").deleteMany({ userId: id }),
  ]);
  const result = await db.collection<UserDocument>("users").deleteOne({ _id: userId });
  return result.deletedCount === 1;
}

export async function getResumeRequests(userId?: string) {
  const filter = userId && ObjectId.isValid(userId) ? { userId } : {};
  const requests = await (await getDatabase()).collection<RequestDocument>("resumeRequests")
    .find(filter).sort({ createdAt: -1 }).toArray();
  return requests.map(toResumeRequest);
}

export async function getResumeRequestById(id: string, userId?: string) {
  if (!ObjectId.isValid(id)) return null;
  const filter = userId ? { _id: new ObjectId(id), userId } : { _id: new ObjectId(id) };
  const request = await (await getDatabase()).collection<RequestDocument>("resumeRequests").findOne(filter);
  return request ? toResumeRequest(request) : null;
}

export async function addResumeRequest(request: Omit<ResumeRequest, "id" | "createdAt" | "status">) {
  if (!ObjectId.isValid(request.userId)) return { request: null, limit: 0 };
  const db = await getDatabase();
  const users = db.collection<UserDocument>("users");
  const userId = new ObjectId(request.userId);
  const user = await users.findOne({ _id: userId });
  if (!user) return { request: null, limit: 0 };
  const content = await getSiteContent();
  const plan = content.plans.find((item) => item.id === user.plan);
  if (!plan) throw new Error(`The ${user.plan} plan is missing from site settings.`);
  const limit = plan.resumeLimit;
  const filter = limit === null
    ? { _id: userId }
    : { _id: userId, resumeCount: { $lt: limit } };
  const reserved = await users.updateOne(filter, { $inc: { resumeCount: 1 } });
  if (!reserved.modifiedCount) return { request: null, limit: limit ?? -1 };

  const created: RequestDocument = {
    ...request,
    _id: new ObjectId(),
    createdAt: new Date().toISOString(),
    status: "new",
  };
  try {
    await db.collection<RequestDocument>("resumeRequests").insertOne(created);
  } catch (error) {
    await users.updateOne({ _id: userId }, { $inc: { resumeCount: -1 } });
    throw error;
  }
  return { request: toResumeRequest(created), limit: limit ?? -1 };
}

export async function updateResumeRequestStatus(id: string, status: ResumeRequestStatus) {
  if (!ObjectId.isValid(id)) return false;
  const result = await (await getDatabase()).collection<RequestDocument>("resumeRequests").updateOne(
    { _id: new ObjectId(id) },
    { $set: { status } },
  );
  return result.matchedCount === 1;
}

export async function updateResumeRequest(
  id: string,
  input: Omit<ResumeRequest, "id" | "userId" | "createdAt" | "status">,
) {
  if (!ObjectId.isValid(id)) return false;
  const result = await (await getDatabase()).collection<RequestDocument>("resumeRequests").updateOne(
    { _id: new ObjectId(id) },
    { $set: input },
  );
  return result.matchedCount === 1;
}

export async function deleteResumeRequest(id: string) {
  if (!ObjectId.isValid(id)) return false;
  const db = await getDatabase();
  const request = await db.collection<RequestDocument>("resumeRequests").findOne({ _id: new ObjectId(id) });
  if (!request) return false;
  await db.collection<GeneratedResumeDocument>("generatedResumes").deleteMany({ requestId: id });
  const result = await db.collection<RequestDocument>("resumeRequests").deleteOne({ _id: new ObjectId(id) });
  if (!result.deletedCount) return false;
  await db.collection<UserDocument>("users").updateOne(
    { _id: new ObjectId(request.userId), resumeCount: { $gt: 0 } },
    { $inc: { resumeCount: -1 } },
  );
  return true;
}

export async function getWebhookUrl() {
  const settings = await (await getDatabase()).collection<SettingsDocument>("settings").findOne({ _id: settingsId });
  return settings?.webhookUrl ?? "";
}

export async function getWebhookConfiguration() {
  const settings = await (await getDatabase()).collection<SettingsDocument>("settings").findOne({ _id: settingsId });
  return {
    url: settings?.webhookUrl ?? "",
    secret: settings?.webhookSecret ? decryptTwoFactorSecret(settings.webhookSecret) : "",
  };
}

export async function hasWebhookSecret() {
  const settings = await (await getDatabase()).collection<SettingsDocument>("settings")
    .findOne({ _id: settingsId }, { projection: { webhookSecret: 1 } });
  return Boolean(settings?.webhookSecret);
}

export async function setWebhookUrl(webhookUrl: string) {
  await (await getDatabase()).collection<SettingsDocument>("settings").updateOne(
    { _id: settingsId },
    { $set: { webhookUrl } },
    { upsert: true },
  );
}

export async function setWebhookSecret(webhookSecret: string) {
  const settings = (await getDatabase()).collection<SettingsDocument>("settings");
  if (webhookSecret) {
    await settings.updateOne(
      { _id: settingsId },
      { $set: { webhookSecret: encryptTwoFactorSecret(webhookSecret) } },
      { upsert: true },
    );
  } else {
    await settings.updateOne({ _id: settingsId }, { $unset: { webhookSecret: true } });
  }
}

export async function getAdminTwoFactorState() {
  const settings = await (await getDatabase()).collection<SettingsDocument>("settings")
    .findOne({ _id: settingsId }, {
      projection: {
        adminTwoFactorSecret: 1,
        adminTwoFactorPendingSecret: 1,
        adminTwoFactorPendingExpiresAt: 1,
        adminTwoFactorLastCounter: 1,
      },
    });
  return {
    enabled: Boolean(settings?.adminTwoFactorSecret),
    secret: settings?.adminTwoFactorSecret ? decryptTwoFactorSecret(settings.adminTwoFactorSecret) : undefined,
    pendingSecret: settings?.adminTwoFactorPendingSecret &&
      settings.adminTwoFactorPendingExpiresAt && settings.adminTwoFactorPendingExpiresAt > new Date()
      ? decryptTwoFactorSecret(settings.adminTwoFactorPendingSecret)
      : undefined,
    lastCounter: settings?.adminTwoFactorLastCounter,
  };
}

export async function setAdminTwoFactorPendingSecret(secret: string) {
  await (await getDatabase()).collection<SettingsDocument>("settings").updateOne(
    { _id: settingsId },
    {
      $set: {
        adminTwoFactorPendingSecret: encryptTwoFactorSecret(secret),
        adminTwoFactorPendingExpiresAt: new Date(Date.now() + 10 * 60_000),
      },
    },
    { upsert: true },
  );
}

export async function enableAdminTwoFactor(secret: string, lastCounter: number) {
  await (await getDatabase()).collection<SettingsDocument>("settings").updateOne(
    { _id: settingsId },
    {
      $set: {
        adminTwoFactorSecret: encryptTwoFactorSecret(secret),
        adminTwoFactorLastCounter: lastCounter,
      },
      $unset: { adminTwoFactorPendingSecret: true, adminTwoFactorPendingExpiresAt: true },
    },
    { upsert: true },
  );
}

export async function disableAdminTwoFactor() {
  await (await getDatabase()).collection<SettingsDocument>("settings").updateOne(
    { _id: settingsId },
    { $unset: {
      adminTwoFactorSecret: true,
      adminTwoFactorPendingSecret: true,
      adminTwoFactorPendingExpiresAt: true,
      adminTwoFactorLastCounter: true,
    } },
  );
}

export async function consumeAdminTwoFactorCounter(counter: number) {
  const result = await (await getDatabase()).collection<SettingsDocument>("settings").updateOne(
    {
      _id: settingsId,
      adminTwoFactorSecret: { $exists: true },
      $or: [
        { adminTwoFactorLastCounter: { $exists: false } },
        { adminTwoFactorLastCounter: { $lt: counter } },
      ],
    },
    { $set: { adminTwoFactorLastCounter: counter } },
  );
  return result.modifiedCount === 1;
}

export async function addGeneratedResume(input: {
  userId: string;
  requestId: string;
  fileName: string;
  contentType: string;
  fileData: string;
}) {
  const collection = (await getDatabase()).collection<GeneratedResumeDocument>("generatedResumes");
  if (!generatedResumeIndexPromise) {
    generatedResumeIndexPromise = collection.createIndex({ requestId: 1 }, { unique: true })
      .then(() => undefined)
      .catch((error: unknown) => {
        generatedResumeIndexPromise = undefined;
        throw error;
      });
  }
  await generatedResumeIndexPromise;
  await collection.updateOne(
    { requestId: input.requestId },
    {
      $set: { ...input, createdAt: new Date().toISOString() },
      $setOnInsert: { _id: new ObjectId() },
    },
    { upsert: true },
  );
  const document = await collection.findOne({ requestId: input.requestId });
  if (!document) throw new Error("The generated resume was not saved.");
  return toGeneratedResume(document);
}

function toGeneratedResume(resume: GeneratedResumeDocument): GeneratedResume {
  return {
    id: resume._id.toHexString(),
    requestId: resume.requestId,
    fileName: resume.fileName,
    contentType: resume.contentType,
    createdAt: resume.createdAt,
  };
}

export async function getGeneratedResumes(userId: string) {
  const resumes = await (await getDatabase()).collection<GeneratedResumeDocument>("generatedResumes")
    .find({ userId }).sort({ createdAt: -1 }).toArray();
  return resumes.map(toGeneratedResume);
}

export async function getGeneratedResumeById(id: string, userId: string) {
  if (!ObjectId.isValid(id)) return null;
  return (await getDatabase()).collection<GeneratedResumeDocument>("generatedResumes")
    .findOne({ _id: new ObjectId(id), userId });
}

export async function deleteGeneratedResume(id: string, userId: string) {
  if (!ObjectId.isValid(id)) return false;
  const result = await (await getDatabase()).collection<GeneratedResumeDocument>("generatedResumes")
    .deleteOne({ _id: new ObjectId(id), userId });
  return result.deletedCount === 1;
}

export async function getSiteContent(): Promise<SiteContent> {
  const settings = await (await getDatabase()).collection<SettingsDocument>("settings").findOne({ _id: settingsId });
  if (!isSiteContent(settings?.content)) return defaultSiteContent;
  return {
    ...settings.content,
    contact: { ...defaultSiteContent.contact, ...settings.content.contact },
  };
}

export async function setSiteContent(content: SiteContent) {
  await (await getDatabase()).collection<SettingsDocument>("settings").updateOne(
    { _id: settingsId },
    { $set: { content } },
    { upsert: true },
  );
}

export async function addContactMessage(message: Omit<ContactMessage, "id" | "createdAt">) {
  const document: ContactDocument = { ...message, _id: new ObjectId(), createdAt: new Date().toISOString() };
  await (await getDatabase()).collection<ContactDocument>("contactMessages").insertOne(document);
  return document._id.toHexString();
}

export async function consumeContactRateLimit(ipAddress: string) {
  const secret = process.env.AUTH_SECRET?.trim() || process.env.ADMIN_SESSION_SECRET?.trim();
  if (!secret) throw new Error("A session secret is required for contact rate limiting.");

  const db = await getDatabase();
  const collection = db.collection<ContactRateLimitDocument>("contactRateLimits");
  if (!contactRateLimitIndexPromise) {
    contactRateLimitIndexPromise = collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
      .then(() => undefined)
      .catch((error: unknown) => {
        contactRateLimitIndexPromise = undefined;
        throw error;
      });
  }
  await contactRateLimitIndexPromise;

  const now = Date.now();
  const windowId = Math.floor(now / contactRateWindowMs);
  const ipHash = createHmac("sha256", secret).update(ipAddress).digest("hex");
  const id = `${ipHash}:${windowId}`;
  await collection.updateOne(
    { _id: id },
    {
      $inc: { count: 1 },
      $setOnInsert: { expiresAt: new Date((windowId + 2) * contactRateWindowMs) },
    },
    { upsert: true },
  );
  const rate = await collection.findOne({ _id: id }, { projection: { count: 1 } });
  return rate !== null && rate.count <= contactRateLimit;
}

export async function consumeTwoFactorAttempt(subject: string) {
  const secret = process.env.AUTH_SECRET?.trim() || process.env.ADMIN_SESSION_SECRET?.trim();
  if (!secret || secret.length < 32) throw new Error("A session secret is required for authenticator rate limiting.");
  const collection = (await getDatabase()).collection<ContactRateLimitDocument>("twoFactorRateLimits");
  if (!twoFactorRateLimitIndexPromise) {
    twoFactorRateLimitIndexPromise = collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
      .then(() => undefined)
      .catch((error: unknown) => {
        twoFactorRateLimitIndexPromise = undefined;
        throw error;
      });
  }
  await twoFactorRateLimitIndexPromise;
  const now = Date.now();
  const windowId = Math.floor(now / contactRateWindowMs);
  const subjectHash = createHmac("sha256", secret).update(subject).digest("hex");
  const id = `${subjectHash}:${windowId}`;
  await collection.updateOne(
    { _id: id },
    {
      $inc: { count: 1 },
      $setOnInsert: { expiresAt: new Date((windowId + 2) * contactRateWindowMs) },
    },
    { upsert: true },
  );
  const rate = await collection.findOne({ _id: id }, { projection: { count: 1 } });
  return rate !== null && rate.count <= 5;
}

export async function getContactMessages() {
  const messages = await (await getDatabase()).collection<ContactDocument>("contactMessages")
    .find().sort({ createdAt: -1 }).toArray();
  return messages.map(({ _id, ...message }) => ({ ...message, id: _id.toHexString() }));
}

export async function deleteContactMessage(id: string) {
  if (!ObjectId.isValid(id)) return false;
  const result = await (await getDatabase()).collection<ContactDocument>("contactMessages")
    .deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount === 1;
}

export async function updateContactMessage(
  id: string,
  input: Omit<ContactMessage, "id" | "createdAt">,
) {
  if (!ObjectId.isValid(id)) return false;
  const result = await (await getDatabase()).collection<ContactDocument>("contactMessages").updateOne(
    { _id: new ObjectId(id) },
    { $set: input },
  );
  return result.matchedCount === 1;
}
