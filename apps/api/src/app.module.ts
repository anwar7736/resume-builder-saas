import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdminModule } from "./admin/admin.module";
import { AuthModule } from "./auth/auth.module";
import { ContactModule } from "./contact/contact.module";
import {
  AppSettingsEntity,
  ContactMessageEntity,
  GeneratedResumeEntity,
  PasswordResetTokenEntity,
  PaymentTransactionEntity,
  ResumeRequestEntity,
  SecurityRateLimitEntity,
  UserEntity,
} from "./database/entities";
import { HealthController } from "./health.controller";
import { ResumesModule } from "./resumes/resumes.module";
import { PaymentsModule } from "./payments/payments.module";
import { SiteContentModule } from "./site-content/site-content.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: [".env.local", "../.env.local", ".env"] }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: "postgres" as const,
        url: config.getOrThrow<string>("DATABASE_URL"),
        ssl: config.get<string>("DATABASE_SSL") === "true"
          ? { rejectUnauthorized: true }
          : undefined,
        extra: { max: Number(config.get<string>("DATABASE_POOL_MAX") ?? 5) },
        autoLoadEntities: true,
        entities: [
          UserEntity,
          ResumeRequestEntity,
          GeneratedResumeEntity,
          ContactMessageEntity,
          AppSettingsEntity,
          SecurityRateLimitEntity,
          PasswordResetTokenEntity,
          PaymentTransactionEntity,
        ],
        synchronize: false,
        retryAttempts: 2,
        retryDelay: 1000,
      }),
    }),
    AuthModule,
    AdminModule,
    ContactModule,
    ResumesModule,
    PaymentsModule,
    SiteContentModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
