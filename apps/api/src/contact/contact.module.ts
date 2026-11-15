import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdminSessionGuard } from "../common/session.guards";
import { EmailService } from "../common/email.service";
import { RateLimitService } from "../common/rate-limit.service";
import { ContactMessageEntity, SecurityRateLimitEntity } from "../database/entities";
import { AdminMessagesController, ContactController } from "./contact.controller";
import { ContactService } from "./contact.service";

@Module({
  imports: [TypeOrmModule.forFeature([ContactMessageEntity, SecurityRateLimitEntity])],
  controllers: [ContactController, AdminMessagesController],
  providers: [ContactService, RateLimitService, EmailService, AdminSessionGuard],
})
export class ContactModule {}
