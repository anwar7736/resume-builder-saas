import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email.server";
import { addContactMessage, consumeContactRateLimit } from "@/lib/resume-store";

export async function POST(request: NextRequest) {
  let payload: unknown;
  try {
    const body = await request.text();
    if (Buffer.byteLength(body, "utf8") > 5000) return NextResponse.json({ error: "Message is too large." }, { status: 413 });
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Submit a valid message." }, { status: 400 });
  }
  if (typeof payload !== "object" || payload === null ||
      !("name" in payload) || !("email" in payload) || !("subject" in payload) || !("message" in payload) ||
      typeof payload.name !== "string" || typeof payload.email !== "string" ||
      typeof payload.subject !== "string" || typeof payload.message !== "string") {
    return NextResponse.json({ error: "Complete all contact form fields." }, { status: 400 });
  }
  const name = payload.name.trim();
  const email = payload.email.trim().toLowerCase();
  const subject = payload.subject.replace(/[\r\n]+/g, " ").trim();
  const message = payload.message.trim();
  if (name.length < 2 || name.length > 100 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      subject.length < 2 || subject.length > 150 || message.length < 10 || message.length > 3000) {
    return NextResponse.json({ error: "Check the name, email, subject, and message lengths." }, { status: 400 });
  }
  try {
    const ipAddress = request.headers.get("x-real-ip")?.trim() ||
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    if (!await consumeContactRateLimit(ipAddress)) {
      return NextResponse.json({ error: "Too many messages were sent. Please try again in 15 minutes." }, { status: 429 });
    }
    const messageId = await addContactMessage({ name, email, subject, message });
    const adminEmail = process.env.ADMIN_EMAIL?.trim();
    const notifications = await Promise.allSettled([
      adminEmail
        ? sendEmail({
            to: adminEmail,
            replyTo: email,
            subject: "New ResumeCraft contact message",
            text: [`From: ${name} <${email}>`, `Subject: ${subject}`, "", message].join("\n"),
          })
        : Promise.reject(new Error("ADMIN_EMAIL is required for contact notifications.")),
      sendEmail({
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
      return NextResponse.json({
        success: true,
        emailSent: false,
        message: "Your message was saved, but an email notification could not be sent. It is available in the admin inbox.",
      }, { status: 201 });
    }
    return NextResponse.json({ success: true, emailSent: true }, { status: 201 });
  } catch (error) {
    console.error("Unable to process contact message.", error);
    return NextResponse.json({ error: "Unable to send your message right now. Please try again later." }, { status: 500 });
  }
}
