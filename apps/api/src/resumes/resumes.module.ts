import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "../auth/auth.module";
import { UserSessionGuard } from "../common/session.guards";
import {
  AppSettingsEntity,
  GeneratedResumeEntity,
  PaymentTransactionEntity,
  ResumeRequestEntity,
  UserEntity,
} from "../database/entities";
import { SettingsModule } from "../settings/settings.module";
import { ResumeController } from "./resumes.controller";
import { ResumeService } from "./resume.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AppSettingsEntity,
      GeneratedResumeEntity,
      PaymentTransactionEntity,
      ResumeRequestEntity,
      UserEntity,
    ]),
    AuthModule,
    SettingsModule,
  ],
  controllers: [ResumeController],
  providers: [ResumeService, UserSessionGuard],
  exports: [ResumeService],
})
export class ResumesModule {}
