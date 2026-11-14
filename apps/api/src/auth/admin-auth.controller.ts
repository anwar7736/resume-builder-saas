import { Body, Controller, Delete, Get, Post, Req, Res, UseGuards } from "@nestjs/common";
import type { Request, Response } from "express";
import QRCode from "qrcode";
import {
  createAdminSession,
  createOtpAuthUri,
  generateTotpSecret,
  isValidAdminSession,
  sessionDurationSeconds,
  verifyAdminCredentials,
  verifyConfiguredAdminPassword,
  verifyTotpCode,
} from "../common/auth-crypto";
import { isRecord } from "../common/identity";
import { ADMIN_COOKIE_NAME, AdminSessionGuard } from "../common/session.guards";
import { RateLimitService } from "../common/rate-limit.service";
import { SettingsService } from "../settings/settings.service";
import { AuthService } from "./auth.service";

@Controller("admin")
export class AdminAuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly settings: SettingsService,
    private readonly rateLimits: RateLimitService,
  ) {}

  @Get("session")
  sessionStatus(@Req() request: Request, @Res() response: Response) {
    const configured = Boolean(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD &&
      process.env.DATABASE_URL &&
      [process.env.AUTH_SECRET, process.env.ADMIN_SESSION_SECRET]
        .some((secret) => secret && secret.length >= 32));
    const authenticated = isValidAdminSession(request.cookies?.[ADMIN_COOKIE_NAME]);
    return response.setHeader("Cache-Control", "no-store").status(200).json({
      configured,
      authenticated,
    });
  }

  @Post("session")
  async signIn(@Body() payload: unknown, @Res() response: Response) {
    if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD ||
        !process.env.DATABASE_URL ||
        ![process.env.AUTH_SECRET, process.env.ADMIN_SESSION_SECRET].some((secret) => secret && secret.length >= 32)) {
      return response.status(503).json({
        error: "Admin login is not configured. Set ADMIN_EMAIL, ADMIN_PASSWORD, DATABASE_URL, and a session secret.",
      });
    }
    if (!isRecord(payload) || typeof payload.email !== "string" ||
        typeof payload.password !== "string" || !verifyAdminCredentials(payload.email, payload.password)) {
      return response.status(401).json({ error: "The email or password is incorrect." });
    }
    const totpCode = payload.totpCode;
    if (totpCode !== undefined && (typeof totpCode !== "string" || totpCode.length > 6)) {
      return response.status(400).json({ error: "Enter a valid authenticator code." });
    }
    try {
      const state = await this.auth.getAdminTwoFactorState();
      if (state.enabled) {
        if (!totpCode) return response.status(200).json({ requiresTwoFactor: true });
        if (!await this.auth.consumeTwoFactorAttempt("admin")) {
          return response.status(429).json({ error: "Too many authenticator attempts. Try again in 15 minutes." });
        }
        const counter = state.secret ? verifyTotpCode(state.secret, totpCode) : null;
        if (counter === null || (state.lastCounter !== undefined && counter <= state.lastCounter) ||
            !await this.auth.consumeAdminTwoFactorCounter(counter)) {
          return response.status(401).json({
            error: "Enter a valid, unused authenticator code.",
            code: "invalid_two_factor",
          });
        }
      }
      response.cookie(ADMIN_COOKIE_NAME, createAdminSession(), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: sessionDurationSeconds() * 1000,
      });
      return response.status(200).json({ success: true });
    } catch (error) {
      console.error("Unable to sign in administrator.", error);
      return response.status(500).json({ error: "Unable to verify admin sign-in." });
    }
  }

  @Delete("session")
  signOut(@Res() response: Response) {
    return response.status(200).clearCookie(ADMIN_COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    }).json({ success: true });
  }

  @Get("two-factor")
  @UseGuards(AdminSessionGuard)
  async getAdminTwoFactor(@Res() response: Response) {
    try {
      const state = await this.auth.getAdminTwoFactorState();
      return response.setHeader("Cache-Control", "no-store").status(200).json({ enabled: state.enabled });
    } catch (error) {
      console.error("Unable to read admin two-factor settings.", error);
      return response.status(500).json({ error: "Unable to load two-factor settings." });
    }
  }

  @Post("two-factor")
  @UseGuards(AdminSessionGuard)
  async updateAdminTwoFactor(@Body() payload: unknown, @Res() response: Response) {
    if (!isRecord(payload) || typeof payload.action !== "string") {
      return response.status(400).json({ error: "Choose a valid two-factor action." });
    }
    try {
      const state = await this.auth.getAdminTwoFactorState();
      if (payload.action === "setup") {
        if (typeof payload.password !== "string" || payload.password.length > 128 ||
            !verifyConfiguredAdminPassword(payload.password)) {
          return response.status(403).json({ error: "Enter the current admin password to continue." });
        }
        if (state.enabled) {
          return response.status(409).json({ error: "Two-factor authentication is already enabled." });
        }
        const email = process.env.ADMIN_EMAIL?.trim();
        if (!email) return response.status(503).json({ error: "Admin email is not configured." });
        const secret = generateTotpSecret();
        const otpAuthUrl = createOtpAuthUri(email, secret, "ResumeCraft AI Admin");
        const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl, {
          errorCorrectionLevel: "M",
          margin: 1,
          width: 240,
        });
        await this.auth.setAdminTwoFactorPendingSecret(secret);
        return response.setHeader("Cache-Control", "no-store").status(200).json({
          secret,
          otpAuthUrl,
          qrCodeDataUrl,
        });
      }
      if (payload.action === "enable") {
        if (state.enabled) {
          return response.status(409).json({ error: "Two-factor authentication is already enabled." });
        }
        if (typeof payload.code !== "string" || !state.pendingSecret) {
          return response.status(400).json({ error: "Start setup again and enter the authenticator code." });
        }
        if (!await this.rateLimits.consume("two-factor:admin:setup", 5)) {
          return response.status(429).json({ error: "Too many authenticator attempts. Try again in 15 minutes." });
        }
        const counter = verifyTotpCode(state.pendingSecret, payload.code);
        if (counter === null) {
          return response.status(400).json({ error: "Enter the current 6-digit authenticator code." });
        }
        await this.auth.enableAdminTwoFactor(state.pendingSecret, counter);
        return response.status(200).json({ success: true, enabled: true });
      }
      if (payload.action === "disable") {
        if (typeof payload.password !== "string" || payload.password.length > 128 ||
            !verifyConfiguredAdminPassword(payload.password)) {
          return response.status(403).json({ error: "Enter the current admin password to continue." });
        }
        if (!state.enabled || !state.secret || typeof payload.code !== "string") {
          return response.status(400).json({
            error: "Two-factor authentication is not enabled or the code is missing.",
          });
        }
        if (!await this.auth.consumeTwoFactorAttempt("admin")) {
          return response.status(429).json({ error: "Too many authenticator attempts. Try again in 15 minutes." });
        }
        const counter = verifyTotpCode(state.secret, payload.code);
        if (counter === null || (state.lastCounter !== undefined && counter <= state.lastCounter) ||
            !await this.auth.consumeAdminTwoFactorCounter(counter)) {
          return response.status(400).json({ error: "Enter a valid, unused authenticator code." });
        }
        await this.auth.disableAdminTwoFactor();
        return response.status(200).json({ success: true, enabled: false });
      }
      return response.status(400).json({ error: "Choose a valid two-factor action." });
    } catch (error) {
      console.error("Unable to update admin two-factor settings.", error);
      return response.status(500).json({ error: "Unable to update two-factor settings." });
    }
  }
}
