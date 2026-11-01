import { NextRequest, NextResponse } from "next/server";
import { adminCookieName, isValidAdminSession } from "@/lib/admin-session";
import { getSiteContent, getWebhookUrl, hasWebhookSecret, setSiteContent, setWebhookSecret, setWebhookUrl } from "@/lib/resume-store";
import { isSiteContent, type SiteContent } from "@/lib/site-content";

export async function GET(request: NextRequest) {
  if (!isValidAdminSession(request.cookies.get(adminCookieName)?.value)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    const [webhookUrl, webhookSecretConfigured, content] = await Promise.all([
      getWebhookUrl(),
      hasWebhookSecret(),
      getSiteContent(),
    ]);
    return NextResponse.json(
      { webhookUrl, webhookSecretConfigured, content },
      { headers: { "Cache-Control": "no-store" } },
    );
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
  let webhookUrl: string | undefined;
  if ("webhookUrl" in payload) {
    if (typeof payload.webhookUrl !== "string" || payload.webhookUrl.length > 2048) {
      return NextResponse.json({ error: "Enter a valid webhook URL." }, { status: 400 });
    }
    webhookUrl = payload.webhookUrl.trim();
    if (!webhookUrl) {
      return NextResponse.json({ error: "Enter the n8n webhook URL before saving." }, { status: 400 });
    }
    try {
      const parsed = new URL(webhookUrl);
      const localDevelopmentUrl = process.env.NODE_ENV !== "production" &&
        parsed.protocol === "http:" &&
        ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
      if (parsed.protocol !== "https:" && !localDevelopmentUrl) throw new Error("HTTPS is required");
    } catch {
      return NextResponse.json({ error: "Use an HTTPS webhook URL (HTTP localhost is allowed during development)." }, { status: 400 });
    }
  }
  let webhookSecret: string | undefined;
  if ("webhookSecret" in payload) {
    if (typeof payload.webhookSecret !== "string" || payload.webhookSecret.length > 512) {
      return NextResponse.json({ error: "Enter a valid webhook secret." }, { status: 400 });
    }
    webhookSecret = payload.webhookSecret.trim();
    if (webhookSecret && webhookSecret.length < 32) {
      return NextResponse.json({ error: "The webhook secret must be at least 32 characters." }, { status: 400 });
    }
  }
  let content: SiteContent | undefined;
  if ("content" in payload) {
    if (!isSiteContent(payload.content)) {
      return NextResponse.json({ error: "Site content is incomplete or has invalid types." }, { status: 400 });
    }
    content = payload.content;
  }
  try {
    if (webhookUrl !== undefined) await setWebhookUrl(webhookUrl);
    if (webhookSecret !== undefined) await setWebhookSecret(webhookSecret);
    if (content !== undefined) await setSiteContent(content);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unable to save admin settings.", error);
    return NextResponse.json({ error: "Unable to save settings." }, { status: 500 });
  }
}
