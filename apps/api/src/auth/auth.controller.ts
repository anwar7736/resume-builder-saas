import { randomInt } from "node:crypto";
import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Req,
  Res,
} from "@nestjs/common";
import type { Request, Response } from "express";
import QRCode from "qrcode";
import {
  createOtpAuthUri,
  createUserSession,
  generateTotpSecret,
  getUserIdFromSession,
  hashPassword,
  verifyPassword,
  verifyTotpCode,
} from "../common/auth-crypto";
import { isRecord, normalizeEmail, validEmail } from "../common/identity";
import { USER_COOKIE_NAME } from "../common/session.guards";
import { AuthService } from "./auth.service";
import { EmailService } from "../common/email.service";
import { ConflictException } from "@nestjs/common";

function setUserCookie(response: Response, token: string, maxAge: number) {
  response.cookie(USER_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: maxAge * 1000,
  });
}

function isDuplicateEmail(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly email: EmailService,
  ) {}

  @Post("register")
  async register(@Body() payload: unknown, @Res() response: Response) {
    if (!isRecord(payload) || typeof payload.name !== "string" ||
        typeof payload.email !== "string" || typeof payload.password !== "string") {
      return response.status(400).json({ error: "Enter your name, email, and password." });
    }
    const name = payload.name.trim();
    const email = normalizeEmail(payload.email);
    if (name.length < 2 || name.length > 100 || !validEmail(email) ||
        payload.password.length < 8 || payload.password.length > 128) {
      return response.status(400).json({
        error: "Enter a valid name and email. Passwords must be 8 to 128 characters.",
      });
    }
    try {
      const credentials = await hashPassword(payload.password);
      const user = await this.auth.createUser({ name, email, ...credentials });
      setUserCookie(response, createUserSession(user.id), 30 * 24 * 60 * 60);
      return response.status(201).json({ success: true });
    } catch (error) {
      if (error instanceof ConflictException || isDuplicateEmail(error)) {
        return response.status(409).json({ error: "An account with this email already exists." });
      }
      console.error("Unable to create user account.", error);
      return response.status(500).json({ error: "Unable to create your account right now." });
    }
  }

  @Post("session")
  async signIn(@Body() payload: unknown, @Res() response: Response) {
    if (!isRecord(payload) || typeof payload.email !== "string" || typeof payload.password !== "string") {
      return response.status(400).json({ error: "Enter your email and password." });
    }
    const totpCode = typeof payload.totpCode === "string" ? payload.totpCode : "";
    if (payload.email.length > 254 || payload.password.length > 128 || totpCode.length > 6) {
      return response.status(400).json({ error: "Invalid email or password." });
    }
    try {
      const user = await this.auth.findUserByEmail(normalizeEmail(payload.email));
      if (!user || !await verifyPassword(payload.password, user.passwordSalt, user.passwordHash)) {
        return response.status(401).json({ error: "Email or password is incorrect." });
      }
      const twoFactor = await this.auth.getUserTwoFactorState(user.id);
      if (!twoFactor) return response.status(401).json({ error: "Account not found." });
      if (twoFactor.enabled) {
        if (!totpCode) return response.status(200).json({ requiresTwoFactor: true });
        if (!await this.auth.consumeTwoFactorAttempt(`user:${user.id}`)) {
          return response.status(429).json({ error: "Too many authenticator attempts. Try again in 15 minutes." });
        }
        const counter = twoFactor.secret ? verifyTotpCode(twoFactor.secret, totpCode) : null;
        if (counter === null || (twoFactor.lastCounter !== undefined && counter <= twoFactor.lastCounter) ||
            !await this.auth.consumeUserTwoFactorCounter(user.id, counter)) {
          return response.status(401).json({
            error: "Enter a valid, unused authenticator code.",
            code: "invalid_two_factor",
          });
        }
      }
      setUserCookie(response, createUserSession(user.id), 30 * 24 * 60 * 60);
      return response.status(200).json({ success: true });
    } catch (error) {
      console.error("Unable to sign in.", error);
      return response.status(500).json({ error: "Unable to sign in right now." });
    }
  }

  @Delete("session")
  signOut(@Res() response: Response) {
    return response.status(200)
      .clearCookie(USER_COOKIE_NAME, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      })
      .json({ success: true });
  }

  @Get("me")
  async me(@Req() request: Request, @Res() response: Response) {
    const userId = getUserIdFromSession(request.cookies?.[USER_COOKIE_NAME]);
    if (!userId) return response.setHeader("Cache-Control", "no-store").status(200).json({ user: null });
    try {
      const user = await this.auth.findUserById(userId);
      return response.setHeader("Cache-Control", "no-store").status(200).json({ user });
    } catch (error) {
      console.error("Unable to load account.", error);
      return response.status(500).json({ error: "Unable to load account." });
    }
  }

  @Patch("profile")
  async updateProfile(@Req() request: Request, @Body() payload: unknown, @Res() response: Response) {
    const userId = getUserIdFromSession(request.cookies?.[USER_COOKIE_NAME]);
    if (!userId) return response.status(401).json({ error: "Sign in to update your profile." });
    if (!isRecord(payload) || typeof payload.name !== "string" ||
        typeof payload.email !== "string" || typeof payload.currentPassword !== "string" ||
        !payload.currentPassword || payload.currentPassword.length > 128 ||
        (payload.newPassword !== undefined && typeof payload.newPassword !== "string") ||
        (payload.confirmPassword !== undefined && typeof payload.confirmPassword !== "string")) {
      return response.status(400).json({ error: "Enter your name, email, and current password." });
    }
    const newPassword = payload.newPassword ?? "";
    const confirmPassword = payload.confirmPassword ?? "";
    if (newPassword && (newPassword.length < 8 || newPassword.length > 128)) {
      return response.status(400).json({
        error: "New password must be between 8 and 128 characters.",
        code: "invalid_new_password",
      });
    }
    if ((newPassword || confirmPassword) && newPassword !== confirmPassword) {
      return response.status(400).json({
        error: "New password and confirmation do not match.",
        code: "password_mismatch",
      });
    }
    const name = payload.name.trim();
    const email = normalizeEmail(payload.email);
    if (name.length < 2 || name.length > 100 || !validEmail(email)) {
      return response.status(400).json({ error: "Enter a valid name and email address." });
    }
    try {
      const user = await this.auth.findCredentialsById(userId);
      if (!user) return response.status(404).json({ error: "Account not found." });
      if (!await verifyPassword(payload.currentPassword, user.passwordSalt, user.passwordHash)) {
        return response.status(403).json({ error: "Your current password is incorrect." });
      }
      const credentials = newPassword ? await hashPassword(newPassword) : {};
      const updated = await this.auth.updateUserProfile(userId, { name, email, ...credentials });
      return updated
        ? response.status(200).json({ success: true, profile: { name, email } })
        : response.status(404).json({ error: "Account not found." });
    } catch (error) {
      if (isDuplicateEmail(error)) {
        return response.status(409).json({ error: "An account with this email already exists." });
      }
      console.error("Unable to update user profile.", error);
      return response.status(500).json({ error: "Unable to update your profile." });
    }
  }

  @Post("password-reset/request")
  async requestPasswordReset(@Req() request: Request, @Body() payload: unknown, @Res() response: Response) {
    if (!isRecord(payload) || typeof payload.email !== "string" || payload.email.length > 254 ||
        !validEmail(normalizeEmail(payload.email))) {
      return response.status(400).json({ error: "Enter a valid email address.", field: "email" });
    }
    const email = normalizeEmail(payload.email);
    const ipAddress = request.ip || request.headers["x-real-ip"]?.toString() ||
      request.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() || "unknown";
    try {
      const [ipAllowed, emailAllowed] = await Promise.all([
        this.auth.consumePasswordResetRateLimit(`request-ip:${ipAddress}`, 5),
        this.auth.consumePasswordResetRateLimit(`request-email:${email}`, 3),
      ]);
      if (!ipAllowed || !emailAllowed) {
        return response.status(429).json({
          error: "Too many reset requests. Please try again in 15 minutes.",
          field: "email",
        });
      }
      const user = await this.auth.findUserByEmail(email);
      if (!user) {
        return response.status(200).json({
          success: true,
          message: "If an account exists for that email, a password reset code will be sent.",
        });
      }
      const otp = randomInt(0, 1_000_000).toString().padStart(6, "0");
      await this.auth.createPasswordResetOtp(user.id, otp, new Date(Date.now() + 10 * 60_000));
      try {
        await this.email.send({
          to: user.email,
          subject: "Your ResumeCraft password reset code",
          text: [
            `Hi ${user.name},`,
            "",
            `Your password reset code is: ${otp}`,
            "",
            "This code expires in 10 minutes and can only be used once.",
            "",
            "If you did not request a password reset, you can ignore this email.",
          ].join("\n"),
        });
      } catch (error) {
        await this.auth.deletePasswordResetOtp(user.id);
        console.error("Unable to deliver password reset email.", error);
        return response.status(502).json({
          error: "We couldn't send a reset code right now. Please try again later.",
        });
      }
      return response.status(200).json({
        success: true,
        message: "If an account exists for that email, a password reset code will be sent.",
      });
    } catch (error) {
      console.error("Unable to process password reset request.", error);
      return response.status(500).json({ error: "Unable to process your request right now." });
    }
  }

  @Post("password-reset/confirm")
  async confirmPasswordReset(@Req() request: Request, @Body() payload: unknown, @Res() response: Response) {
    if (!isRecord(payload) || typeof payload.email !== "string" ||
        typeof payload.otp !== "string" || typeof payload.password !== "string") {
      return response.status(400).json({ error: "Enter the code and a new password.", field: "otp" });
    }
    const email = normalizeEmail(payload.email);
    if (!validEmail(email)) return response.status(400).json({ error: "Enter a valid email address.", field: "email" });
    if (!/^\d{6}$/.test(payload.otp)) {
      return response.status(400).json({ error: "Enter the 6-digit code from your email.", field: "otp" });
    }
    if (payload.password.length < 8 || payload.password.length > 128) {
      return response.status(400).json({
        error: "Password must be between 8 and 128 characters.",
        field: "password",
      });
    }
    const ipAddress = request.ip || request.headers["x-real-ip"]?.toString() ||
      request.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() || "unknown";
    try {
      const [ipAllowed, emailAllowed] = await Promise.all([
        this.auth.consumePasswordResetRateLimit(`confirm-ip:${ipAddress}`, 10),
        this.auth.consumePasswordResetRateLimit(`confirm-email:${email}`, 10),
      ]);
      if (!ipAllowed || !emailAllowed) {
        return response.status(429).json({ error: "Too many attempts. Please try again in 15 minutes.", field: "otp" });
      }
      const user = await this.auth.findUserByEmail(email);
      if (!user || !await this.auth.consumePasswordResetOtp(user.id, payload.otp)) {
        return response.status(400).json({
          error: "The code is incorrect or expired. Request a new code and try again.",
          field: "otp",
        });
      }
      const credentials = await hashPassword(payload.password);
      const updated = await this.auth.updateUserProfile(user.id, {
        name: user.name,
        email: user.email,
        ...credentials,
      });
      return updated
        ? response.status(200).json({ success: true })
        : response.status(400).json({ error: "Account not found.", field: "email" });
    } catch (error) {
      console.error("Unable to reset account password.", error);
      return response.status(500).json({ error: "Unable to reset your password right now." });
    }
  }

  @Get("two-factor")
  async getUserTwoFactor(@Req() request: Request, @Res() response: Response) {
    const userId = getUserIdFromSession(request.cookies?.[USER_COOKIE_NAME]);
    if (!userId) return response.status(401).json({ error: "Sign in to manage two-factor authentication." });
    try {
      const state = await this.auth.getUserTwoFactorState(userId);
      return state
        ? response.setHeader("Cache-Control", "no-store").status(200).json({ enabled: state.enabled })
        : response.status(404).json({ error: "Account not found." });
    } catch (error) {
      console.error("Unable to read user two-factor settings.", error);
      return response.status(500).json({ error: "Unable to load two-factor settings." });
    }
  }

  @Post("two-factor")
  async updateUserTwoFactor(
    @Req() request: Request,
    @Body() payload: unknown,
    @Res() response: Response,
  ) {
    const userId = getUserIdFromSession(request.cookies?.[USER_COOKIE_NAME]);
    if (!userId) return response.status(401).json({ error: "Sign in to manage two-factor authentication." });
    if (!isRecord(payload) || typeof payload.action !== "string") {
      return response.status(400).json({ error: "Choose a valid two-factor action." });
    }
    try {
      const state = await this.auth.getUserTwoFactorState(userId);
      if (!state) return response.status(404).json({ error: "Account not found." });
      if (payload.action === "setup") {
        const user = await this.auth.findCredentialsById(userId);
        if (typeof payload.password !== "string" || payload.password.length > 128 || !user ||
            !await verifyPassword(payload.password, user.passwordSalt, user.passwordHash)) {
          return response.status(403).json({ error: "Enter your current password to continue." });
        }
        if (state.enabled) {
          return response.status(409).json({ error: "Two-factor authentication is already enabled." });
        }
        const secret = generateTotpSecret();
        const otpAuthUrl = createOtpAuthUri(user.email, secret, "ResumeCraft AI");
        const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl, {
          errorCorrectionLevel: "M",
          margin: 1,
          width: 240,
        });
        await this.auth.setUserTwoFactorPendingSecret(userId, secret);
        return response.setHeader("Cache-Control", "no-store").status(200).json({ secret, otpAuthUrl, qrCodeDataUrl });
      }
      if (payload.action === "enable") {
        if (state.enabled) {
          return response.status(409).json({ error: "Two-factor authentication is already enabled." });
        }
        if (typeof payload.code !== "string" || !state.pendingSecret) {
          return response.status(400).json({ error: "Start setup again and enter the authenticator code." });
        }
        if (!await this.auth.consumeTwoFactorAttempt(`user:${userId}:setup`)) {
          return response.status(429).json({ error: "Too many authenticator attempts. Try again in 15 minutes." });
        }
        const counter = verifyTotpCode(state.pendingSecret, payload.code);
        if (counter === null) {
          return response.status(400).json({ error: "Enter the current 6-digit authenticator code." });
        }
        if (!await this.auth.enableUserTwoFactor(userId, state.pendingSecret, counter)) {
          return response.status(500).json({ error: "Unable to enable two-factor authentication." });
        }
        return response.status(200).json({ success: true, enabled: true });
      }
      if (payload.action === "disable") {
        const user = await this.auth.findCredentialsById(userId);
        if (typeof payload.password !== "string" || payload.password.length > 128 || !user ||
            !await verifyPassword(payload.password, user.passwordSalt, user.passwordHash)) {
          return response.status(403).json({ error: "Enter your current password to continue." });
        }
        if (!state.enabled || !state.secret || typeof payload.code !== "string") {
          return response.status(400).json({
            error: "Two-factor authentication is not enabled or the code is missing.",
          });
        }
        if (!await this.auth.consumeTwoFactorAttempt(`user:${userId}`)) {
          return response.status(429).json({ error: "Too many authenticator attempts. Try again in 15 minutes." });
        }
        const counter = verifyTotpCode(state.secret, payload.code);
        if (counter === null || (state.lastCounter !== undefined && counter <= state.lastCounter) ||
            !await this.auth.consumeUserTwoFactorCounter(userId, counter)) {
          return response.status(400).json({ error: "Enter a valid, unused authenticator code." });
        }
        await this.auth.disableUserTwoFactor(userId);
        return response.status(200).json({ success: true, enabled: false });
      }
      return response.status(400).json({ error: "Choose a valid two-factor action." });
    } catch (error) {
      console.error("Unable to update user two-factor settings.", error);
      return response.status(500).json({ error: "Unable to update two-factor settings." });
    }
  }
}
