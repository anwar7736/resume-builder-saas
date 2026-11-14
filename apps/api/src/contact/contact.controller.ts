import { Body, Controller, Delete, Get, Patch, Post, Query, Req, Res, UseGuards } from "@nestjs/common";
import type { Request, Response } from "express";
import { AdminSessionGuard } from "../common/session.guards";
import { isRecord, normalizeEmail, validEmail } from "../common/identity";
import { EmailService } from "../common/email.service";
import { ContactService } from "./contact.service";

@Controller("contact")
export class ContactController {
  constructor(
    private readonly contacts: ContactService,
    private readonly email: EmailService,
  ) {}

  @Post()
  async submit(@Body() payload: unknown, @Req() request: Request, @Res() response: Response) {
    if (!isRecord(payload) || typeof payload.name !== "string" ||
        typeof payload.email !== "string" || typeof payload.subject !== "string" ||
        typeof payload.message !== "string") {
      return response.status(400).json({ error: "Complete all contact form fields." });
    }
    const name = payload.name.trim();
    const email = normalizeEmail(payload.email);
    const subject = payload.subject.replace(/[\r\n]+/g, " ").trim();
    const message = payload.message.trim();
    if (name.length < 2 || name.length > 100 || !validEmail(email) ||
        subject.length < 2 || subject.length > 150 || message.length < 10 || message.length > 3000) {
      return response.status(400).json({
        error: "Check the name, email, subject, and message lengths.",
      });
    }
    try {
      const ipAddress = request.ip || request.headers["x-real-ip"]?.toString() ||
        request.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() || "unknown";
      if (!await this.contacts.consumeContactRateLimit(ipAddress)) {
        return response.status(429).json({
          error: "Too many messages were sent. Please try again in 15 minutes.",
        });
      }
      const messageId = await this.contacts.addContactMessage({ name, email, subject, message });
      const adminEmail = process.env.ADMIN_EMAIL?.trim();
      const notifications = await Promise.allSettled([
        adminEmail
          ? this.email.send({
              to: adminEmail,
              replyTo: email,
              subject: "New ResumeCraft contact message",
              text: [`From: ${name} <${email}>`, `Subject: ${subject}`, "", message].join("\n"),
            })
          : Promise.reject(new Error("ADMIN_EMAIL is required for contact notifications.")),
        this.email.send({
          to: email,
          subject: "We received your message",
          text: [
            `Hi ${name},`,
            "",
            "Thanks for reaching out. Your message has been received, and our team will get back to you soon.",
            "",
            "Your message:",
            message,
          ].join("\n"),
        }),
      ]);
      const failedCount = notifications.filter((result) => result.status === "rejected").length;
      if (failedCount) {
        console.error("Contact email notification delivery failed.", { messageId, failedCount });
        return response.status(201).json({
          success: true,
          emailSent: false,
          message: "Your message was saved, but an email notification could not be sent. It is available in the admin inbox.",
        });
      }
      return response.status(201).json({ success: true, emailSent: true });
    } catch (error) {
      console.error("Unable to process contact message.", error);
      return response.status(500).json({ error: "Unable to send your message right now. Please try again later." });
    }
  }
}

@Controller("admin/messages")
@UseGuards(AdminSessionGuard)
export class AdminMessagesController {
  constructor(private readonly contacts: ContactService) {}

  @Get()
  async list(@Res() response: Response) {
    try {
      return response.setHeader("Cache-Control", "no-store").status(200).json({
        messages: await this.contacts.getContactMessages(),
      });
    } catch (error) {
      console.error("Unable to load contact messages.", error);
      return response.status(500).json({ error: "Unable to load contact messages." });
    }
  }

  @Delete()
  async remove(@Query("id") id: string | undefined, @Res() response: Response) {
    if (!id) return response.status(400).json({ error: "A message ID is required." });
    try {
      return await this.contacts.deleteContactMessage(id)
        ? response.status(200).json({ success: true })
        : response.status(404).json({ error: "Message not found." });
    } catch (error) {
      console.error("Unable to delete contact message.", error);
      return response.status(500).json({ error: "Unable to delete contact message." });
    }
  }

  @Patch()
  async update(@Body() payload: unknown, @Res() response: Response) {
    if (!isRecord(payload) || typeof payload.id !== "string" ||
        typeof payload.name !== "string" || typeof payload.email !== "string" ||
        typeof payload.subject !== "string" || typeof payload.message !== "string") {
      return response.status(400).json({ error: "Complete every contact message field." });
    }
    const name = payload.name.trim();
    const email = normalizeEmail(payload.email);
    const subject = payload.subject.replace(/[\r\n]+/g, " ").trim();
    const message = payload.message.trim();
    if (name.length < 2 || name.length > 100 || !validEmail(email) ||
        subject.length < 2 || subject.length > 150 || message.length < 10 || message.length > 3000) {
      return response.status(400).json({ error: "Check the name, email, subject, and message lengths." });
    }
    try {
      return await this.contacts.updateContactMessage(payload.id, { name, email, subject, message })
        ? response.status(200).json({ success: true })
        : response.status(404).json({ error: "Message not found." });
    } catch (error) {
      console.error("Unable to update contact message.", error);
      return response.status(500).json({ error: "Unable to update contact message." });
    }
  }
}
