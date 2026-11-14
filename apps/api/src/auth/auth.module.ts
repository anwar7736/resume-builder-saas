import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { EmailService } from "../common/email.service";
import { RateLimitService } from "../common/rate-limit.service";
import { AdminSessionGuard } from "../common/session.guards";
import {
  AppSettingsEntity,
  PasswordResetTokenEntity,
  SecurityRateLimitEntity,
  UserEntity,
} from "../database/entities";
import { SettingsModule } from "../settings/settings.module";
import { AdminAuthController } from "./admin-auth.controller";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AppSettingsEntity,
      PasswordResetTokenEntity,
      SecurityRateLimitEntity,
      UserEntity,
    ]),
    SettingsModule,
  ],
  controllers: [AuthController, AdminAuthController],
  providers: [AuthService, EmailService, RateLimitService, AdminSessionGuard],
  exports: [AuthService],
})
export class AuthModule {}
