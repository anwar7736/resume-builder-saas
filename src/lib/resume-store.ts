import { createHmac } from "node:crypto";
import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/mongodb";
import { defaultSiteContent, isSiteContent, type SiteContent } from "@/lib/site-content";

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
};

type RequestDocument = Omit<ResumeRequest, "id"> & { _id: ObjectId };
type SettingsDocument = { _id: string; webhookUrl?: string; content?: unknown };
type ContactDocument = Omit<ContactMessage, "id"> & { _id: ObjectId };
type ContactRateLimitDocument = { _id: string; count: number; expiresAt: Date };

const settingsId = "site-settings";
const contactRateWindowMs = 15 * 60_000;
const contactRateLimit = 5;
let contactRateLimitIndexPromise: Promise<void> | undefined;

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
  return { ...fields, id: _id.toHexString() };
}

export async function createUser(input: {
  name: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
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
    plan: "Free",
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

export async function getResumeRequests(userId?: string) {
  const filter = userId && ObjectId.isValid(userId) ? { userId } : {};
  const requests = await (await getDatabase()).collection<RequestDocument>("resumeRequests")
    .find(filter).sort({ createdAt: -1 }).toArray();
  return requests.map(toResumeRequest);
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

export async function deleteResumeRequest(id: string) {
  if (!ObjectId.isValid(id)) return false;
  const db = await getDatabase();
  const result = await db.collection<RequestDocument>("resumeRequests").findOneAndDelete({ _id: new ObjectId(id) });
  if (!result) return false;
  await db.collection<UserDocument>("users").updateOne(
    { _id: new ObjectId(result.userId), resumeCount: { $gt: 0 } },
    { $inc: { resumeCount: -1 } },
  );
  return true;
}

export async function getWebhookUrl() {
  const settings = await (await getDatabase()).collection<SettingsDocument>("settings").findOne({ _id: settingsId });
  return settings?.webhookUrl ?? "";
}

export async function setWebhookUrl(webhookUrl: string) {
  await (await getDatabase()).collection<SettingsDocument>("settings").updateOne(
    { _id: settingsId },
    { $set: { webhookUrl } },
    { upsert: true },
  );
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
