import { randomInt } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email.server";
import {
  consumePasswordResetRateLimit,
  createPasswordResetOtp,
  deletePasswordResetOtp,
  findUserByEmail,
} from "@/lib/resume-store";
import { normalizeEmail } from "@/lib/user-auth";

const genericResponse = () => NextResponse.json({
  success: true,
  message: "If an account exists for that email, a password reset code will be sent.",
});

export async function POST(request: NextRequest) {
  let payload: unknown;
  try {
    const body = await request.text();
    if (Buffer.byteLength(body, "utf8") > 2000) {
      return NextResponse.json({ error: "The request is too large." }, { status: 413 });
    }
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Enter a valid email address.", field: "email" }, { status: 400 });
  }
  if (typeof payload !== "object" || payload === null || !("email" in payload) ||
      typeof payload.email !== "string" || payload.email.length > 254) {
    return NextResponse.json({ error: "Enter a valid email address.", field: "email" }, { status: 400 });
  }
  const email = normalizeEmail(payload.email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address.", field: "email" }, { status: 400 });
  }

  const ipAddress = request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  try {
    const [ipAllowed, emailAllowed] = await Promise.all([
      consumePasswordResetRateLimit(`request-ip:${ipAddress}`, 5),
      consumePasswordResetRateLimit(`request-email:${email}`, 3),
    ]);
    if (!ipAllowed || !emailAllowed) {
      return NextResponse.json(
        { error: "Too many reset requests. Please try again in 15 minutes.", field: "email" },
        { status: 429 },
      );
    }

    const user = await findUserByEmail(email);
    if (!user) return genericResponse();

    const otp = randomInt(0, 1_000_000).toString().padStart(6, "0");
    const userId = user._id.toHexString();
    await createPasswordResetOtp(userId, otp, new Date(Date.now() + 10 * 60_000));
    try {
      await sendEmail({
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
      await deletePasswordResetOtp(userId);
      console.error("Unable to deliver password reset email.", error);
      return NextResponse.json(
        { error: "We couldn't send a reset code right now. Please try again later." },
        { status: 502 },
      );
    }
    return genericResponse();
  } catch (error) {
    console.error("Unable to process password reset request.", error);
    return NextResponse.json({ error: "Unable to process your request right now." }, { status: 500 });
  }
}
