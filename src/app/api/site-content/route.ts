import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getSiteContent } from "@/lib/resume-store";

export async function GET() {
  try {
    const { contact, navigation } = await getSiteContent();
    const publicContact = {
      ...contact,
      supportAvatar: contact.supportAvatar.startsWith("data:image/")
        ? `/api/support-avatar?v=${createHash("sha256").update(contact.supportAvatar).digest("hex").slice(0, 16)}`
        : contact.supportAvatar,
    };
    return NextResponse.json({ contact: publicContact, navigation }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Unable to load support contact options.", error);
    return NextResponse.json({ error: "Unable to load contact options." }, { status: 500 });
  }
}
