import { createHash } from "node:crypto";
import { connection, NextRequest, NextResponse } from "next/server";
import { getSiteContent } from "@/lib/resume-store";

export async function GET(request: NextRequest) {
  await connection();
  try {
    const avatar = (await getSiteContent()).contact.supportAvatar;
    const expectedVersion = createHash("sha256").update(avatar).digest("hex").slice(0, 16);
    if (request.nextUrl.searchParams.get("v") !== expectedVersion) {
      return NextResponse.json({ error: "Support avatar has changed." }, { status: 404 });
    }

    const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+=*)$/i.exec(avatar);
    if (!match) return NextResponse.json({ error: "Support avatar is not an uploaded image." }, { status: 404 });
    const contentType = match[1]?.toLowerCase() === "jpeg" ? "image/jpeg" : `image/${match[1]?.toLowerCase()}`;
    const image = Buffer.from(match[2] ?? "", "base64");
    if (image.byteLength > 1024 * 1024) {
      return NextResponse.json({ error: "Support avatar exceeds the 1 MB limit." }, { status: 404 });
    }
    return new Response(image, {
      headers: {
        "Cache-Control": "public, max-age=3600, immutable",
        "Content-Length": String(image.byteLength),
        "Content-Type": contentType,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Unable to load support avatar.", error);
    return NextResponse.json({ error: "Unable to load support avatar." }, { status: 500 });
  }
}
