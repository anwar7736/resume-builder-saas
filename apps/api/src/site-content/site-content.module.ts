import { Module } from "@nestjs/common";
import { SettingsModule } from "../settings/settings.module";
import { SiteContentController } from "./site-content.controller";

@Module({
  imports: [SettingsModule],
  controllers: [SiteContentController],
})
export class SiteContentModule {}
