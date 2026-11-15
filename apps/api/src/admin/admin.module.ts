import { Module } from "@nestjs/common";
import { AdminSessionGuard } from "../common/session.guards";
import { AuthModule } from "../auth/auth.module";
import { ResumesModule } from "../resumes/resumes.module";
import { SettingsModule } from "../settings/settings.module";
import { AdminController } from "./admin.controller";

@Module({
  imports: [AuthModule, ResumesModule, SettingsModule],
  controllers: [AdminController],
  providers: [AdminSessionGuard],
})
export class AdminModule {}
