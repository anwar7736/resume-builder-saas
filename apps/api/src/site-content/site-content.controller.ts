import { createHash } from "node:crypto";
import { Controller, Get, Query, Res } from "@nestjs/common";
import type { Response } from "express";
import { SettingsService } from "../settings/settings.service";

@Controller()
export class SiteContentController {
  constructor(private readonly settings: SettingsService) {}

  @Get("site-content")
  async getSiteContent(@Res() response: Response) {
    try {
      const { contact, navigation } = await this.settings.getSiteContent();
      const publicContact = {
        ...contact,
        supportAvatar: contact.supportAvatar.startsWith("data:image/")
          ? `/api/support-avatar?v=${createHash("sha256").update(contact.supportAvatar).digest("hex").slice(0, 16)}`
          : contact.supportAvatar,
      };
      return response.setHeader("Cache-Control", "no-store").status(200).json({
        contact: publicContact,
        navigation,
      });
    } catch (error) {
      console.error("Unable to load support contact options.", error);
      return response.status(500).json({ error: "Unable to load contact options." });
    }
  }

  @Get("site-content/full")
  async getFullSiteContent(@Res() response: Response) {
    try {
      return response.setHeader("Cache-Control", "no-store").status(200).json({
        content: await this.settings.getSiteContent(),
      });
    } catch (error) {
      console.error("Unable to load site content.", error);
      return response.status(500).json({ error: "Unable to load site content." });
    }
  }

  @Get("support-avatar")
  async getSupportAvatar(@Query("v") version: string | undefined, @Res() response: Response) {
    try {
      const avatar = (await this.settings.getSiteContent()).contact.supportAvatar;
      const expectedVersion = createHash("sha256").update(avatar).digest("hex").slice(0, 16);
      if (version !== expectedVersion) {
        return response.status(404).json({ error: "Support avatar has changed." });
      }
      const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+=*)$/i.exec(avatar);
      if (!match) return response.status(404).json({ error: "Support avatar is not an uploaded image." });
      const contentType = match[1]?.toLowerCase() === "jpeg" ? "image/jpeg" : `image/${match[1]?.toLowerCase()}`;
      const image = Buffer.from(match[2] ?? "", "base64");
      if (image.byteLength > 1024 * 1024) {
        return response.status(404).json({ error: "Support avatar exceeds the 1 MB limit." });
      }
      return response.status(200).set({
        "Cache-Control": "public, max-age=3600, immutable",
        "Content-Length": String(image.byteLength),
        "Content-Type": contentType,
        "X-Content-Type-Options": "nosniff",
      }).send(image);
    } catch (error) {
      console.error("Unable to load support avatar.", error);
      return response.status(500).json({ error: "Unable to load support avatar." });
    }
  }
}
