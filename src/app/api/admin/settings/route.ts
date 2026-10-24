import { NextRequest, NextResponse } from "next/server";
import { adminCookieName, isValidAdminSession } from "@/lib/admin-session";
import { getSiteContent, getWebhookUrl, setSiteContent, setWebhookUrl } from "@/lib/resume-store";
import { isSiteContent } from "@/lib/site-content";

export async function GET(request: NextRequest) {
  if (!isValidAdminSession(request.cookies.get(adminCookieName)?.value)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    const [webhookUrl, content] = await Promise.all([getWebhookUrl(), getSiteContent()]);
    return NextResponse.json({ webhookUrl, content }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Unable to read admin settings.", error);
    return NextResponse.json({ error: "Unable to load settings." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!isValidAdminSession(request.cookies.get(adminCookieName)?.value)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid settings." }, { status: 400 });
  }
  if (typeof payload !== "object" || payload === null) {
    return NextResponse.json({ error: "Invalid settings." }, { status: 400 });
  }
  try {
    if ("webhookUrl" in payload) {
      if (typeof payload.webhookUrl !== "string" || payload.webhookUrl.length > 2048) {
        return NextResponse.json({ error: "Enter a valid webhook URL." }, { status: 400 });
      }
      const webhookUrl = payload.webhookUrl.trim();
      if (webhookUrl) {
        try {
          const parsed = new URL(webhookUrl);
          if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error("Invalid protocol");
        } catch {
          return NextResponse.json({ error: "Webhook URL must start with http:// or https://." }, { status: 400 });
        }
      }
      await setWebhookUrl(webhookUrl);
    }
    if ("content" in payload) {
      if (!isSiteContent(payload.content)) {
        return NextResponse.json({ error: "Site content is incomplete or has invalid types." }, { status: 400 });
      }
      await setSiteContent(payload.content);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unable to save admin settings.", error);
    return NextResponse.json({ error: "Unable to save settings." }, { status: 500 });
  }
}
