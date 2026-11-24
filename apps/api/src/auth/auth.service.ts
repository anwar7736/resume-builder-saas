import { ConflictException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { createHmac } from "node:crypto";
import { Repository } from "typeorm";
import { decryptSecret, encryptSecret, hashPassword } from "../common/auth-crypto";
import { newId } from "../common/identity";
import { RateLimitService } from "../common/rate-limit.service";
import {
  PasswordResetTokenEntity,
  UserEntity,
} from "../database/entities";
import { SettingsService } from "../settings/settings.service";

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    @InjectRepository(PasswordResetTokenEntity)
    private readonly resetTokens: Repository<PasswordResetTokenEntity>,
    private readonly rateLimits: RateLimitService,
    private readonly settings: SettingsService,
  ) {}

  async createUser(input: {
    name: string;
    email: string;
    passwordHash: string;
    passwordSalt: string;
    plan?: UserEntity["plan"];
  }) {
    const user = this.users.create({
      id: newId(),
      ...input,
      plan: input.plan ?? "Free",
      resumeCount: 0,
    });
    try {
      return this.toAccount(await this.users.save(user));
    } catch (error) {
      if (this.isUniqueViolation(error)) throw new ConflictException("An account with this email already exists.");
      throw error;
    }
  }

  async findUserByEmail(email: string) {
    return this.users.findOneBy({ email });
  }

  async findCredentialsById(id: string) {
    return this.users.findOneBy({ id });
  }

  async findUserById(id: string) {
    const user = await this.users.findOneBy({ id });
    return user ? this.toAccount(user) : null;
  }

  async getUsers() {
    const users = await this.users.find({ order: { createdAt: "DESC" } });
    return users.map((user) => this.toAccount(user));
  }

  async updateUser(id: string, input: Pick<UserEntity, "name" | "email" | "plan">) {
    const user = await this.users.findOneBy({ id });
    if (!user) return null;
    const result = await this.users.update({ id }, {
      ...input,
      ...(user.plan !== input.plan ? { planExpiresAt: null } : {}),
    });
    if (!result.affected) return null;
    return this.findUserById(id);
  }

  async updateUserProfile(id: string, input: {
    name: string;
    email: string;
    passwordHash?: string;
    passwordSalt?: string;
  }) {
    const result = await this.users.update({ id }, input);
    if (!result.affected) return false;
    if (input.passwordHash) await this.resetTokens.delete({ userId: id });
    return true;
  }

  async updateUserPassword(id: string, password: string) {
    const credentials = await hashPassword(password);
    const result = await this.users.update({ id }, credentials);
    if (!result.affected) return false;
    await this.resetTokens.delete({ userId: id });
    return true;
  }

  async deleteUser(id: string) {
    const result = await this.users.delete({ id });
    return Boolean(result.affected);
  }

  async getUserTwoFactorState(id: string) {
    const user = await this.users.findOneBy({ id });
    if (!user) return null;
    const pendingSecret = user.twoFactorPendingSecret && user.twoFactorPendingExpiresAt &&
      user.twoFactorPendingExpiresAt > new Date()
      ? decryptSecret(user.twoFactorPendingSecret)
      : undefined;
    return {
      enabled: Boolean(user.twoFactorSecret),
      secret: user.twoFactorSecret ? decryptSecret(user.twoFactorSecret) : undefined,
      pendingSecret,
      lastCounter: user.twoFactorLastCounter ? Number(user.twoFactorLastCounter) : undefined,
    };
  }

  async setUserTwoFactorPendingSecret(id: string, secret: string) {
    const result = await this.users.update({ id }, {
      twoFactorPendingSecret: encryptSecret(secret),
      twoFactorPendingExpiresAt: new Date(Date.now() + 10 * 60_000),
    });
    return Boolean(result.affected);
  }

  async enableUserTwoFactor(id: string, secret: string, counter: number) {
    const result = await this.users.update({ id }, {
      twoFactorSecret: encryptSecret(secret),
      twoFactorLastCounter: String(counter),
      twoFactorPendingSecret: null,
      twoFactorPendingExpiresAt: null,
    });
    return Boolean(result.affected);
  }

  async disableUserTwoFactor(id: string) {
    const result = await this.users.update({ id }, {
      twoFactorSecret: null,
      twoFactorPendingSecret: null,
      twoFactorPendingExpiresAt: null,
      twoFactorLastCounter: null,
    });
    return Boolean(result.affected);
  }

  async consumeUserTwoFactorCounter(id: string, counter: number) {
    const result = await this.users
      .createQueryBuilder()
      .update(UserEntity)
      .set({ twoFactorLastCounter: String(counter) })
      .where("id = :id AND two_factor_secret IS NOT NULL", { id })
      .andWhere("(two_factor_last_counter IS NULL OR two_factor_last_counter < :counter)", { counter })
      .execute();
    return result.affected === 1;
  }

  async consumeTwoFactorAttempt(subject: string) {
    return this.rateLimits.consume(`two-factor:${subject}`, 5);
  }

  async createPasswordResetOtp(userId: string, otp: string, expiresAt: Date) {
    const secret = this.passwordResetSecret();
    const otpHash = createHmac("sha256", secret).update(`${userId}:${otp}`).digest("hex");
    await this.resetTokens.save(this.resetTokens.create({ userId, otpHash, attempts: 0, expiresAt }));
  }

  async deletePasswordResetOtp(userId: string) {
    await this.resetTokens.delete({ userId });
  }

  async consumePasswordResetOtp(userId: string, otp: string) {
    const otpHash = createHmac("sha256", this.passwordResetSecret()).update(`${userId}:${otp}`).digest("hex");
    const consumed = await this.resetTokens
      .createQueryBuilder()
      .delete()
      .where("user_id = :userId AND otp_hash = :otpHash AND expires_at > :now AND attempts < 5", {
        userId,
        otpHash,
        now: new Date(),
      })
      .execute();
    if (consumed.affected === 1) return true;
    await this.resetTokens
      .createQueryBuilder()
      .update(PasswordResetTokenEntity)
      .set({ attempts: () => "attempts + 1" })
      .where("user_id = :userId AND expires_at > :now AND attempts < 5", { userId, now: new Date() })
      .execute();
    return false;
  }

  async consumePasswordResetRateLimit(subject: string, limit: number) {
    return this.rateLimits.consume(`password-reset:${subject}`, limit);
  }

  getAdminTwoFactorState() {
    return this.settings.getAdminTwoFactorState();
  }

  setAdminTwoFactorPendingSecret(secret: string) {
    return this.settings.setAdminTwoFactorPendingSecret(secret);
  }

  enableAdminTwoFactor(secret: string, counter: number) {
    return this.settings.enableAdminTwoFactor(secret, counter);
  }

  disableAdminTwoFactor() {
    return this.settings.disableAdminTwoFactor();
  }

  consumeAdminTwoFactorCounter(counter: number) {
    return this.settings.consumeAdminTwoFactorCounter(counter);
  }

  private passwordResetSecret() {
    const secret = process.env.AUTH_SECRET?.trim() || process.env.ADMIN_SESSION_SECRET?.trim();
    if (!secret || secret.length < 32) throw new Error("A session secret is required for password reset.");
    return secret;
  }

  private isUniqueViolation(error: unknown) {
    return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
  }

  private toAccount(user: UserEntity) {
    const plan = user.planExpiresAt && user.planExpiresAt <= new Date() ? "Free" : user.plan;
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      plan,
      planExpiresAt: plan === "Free" ? null : user.planExpiresAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
      resumeCount: user.resumeCount,
    };
  }
}
