import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserSessionGuard } from "../common/session.guards";
import { PaymentTransactionEntity, UserEntity } from "../database/entities";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";

@Module({
  imports: [TypeOrmModule.forFeature([PaymentTransactionEntity, UserEntity])],
  controllers: [PaymentsController],
  providers: [PaymentsService, UserSessionGuard],
})
export class PaymentsModule {}
