import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AppSettingsEntity } from "../database/entities";
import { SettingsService } from "./settings.service";

@Module({
  imports: [TypeOrmModule.forFeature([AppSettingsEntity])],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
