import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { decryptSecret, encryptSecret } from "../common/auth-crypto";
import { AppSettingsEntity } from "../database/entities";
import { defaultSiteContent, isSiteContent, SiteContent } from "../site-content/site-content";

const settingsId = "site-settings";

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(AppSettingsEntity)
    private readonly settingsRepository: Repository<AppSettingsEntity>,
  ) {}

  async getSettings() {
    return this.settingsRepository.findOneBy({ id: settingsId });
  }

  async getWebhookConfiguration() {
    const settings = await this.getSettings();
    return {
      url: settings?.webhookUrl ?? "",
      secret: settings?.webhookSecret ? decryptSecret(settings.webhookSecret) : "",
    };
  }

  async getWebhookUrl() {
    return (await this.getSettings())?.webhookUrl ?? "";
  }

  async hasWebhookSecret() {
    return Boolean((await this.getSettings())?.webhookSecret);
  }

  async setWebhookUrl(webhookUrl: string) {
    await this.settingsRepository.upsert({ id: settingsId, webhookUrl }, ["id"]);
  }

  async setWebhookSecret(webhookSecret: string) {
    await this.settingsRepository.upsert({
      id: settingsId,
      webhookSecret: webhookSecret ? encryptSecret(webhookSecret) : null,
    }, ["id"]);
  }

  async getSiteContent(): Promise<SiteContent> {
    const content = (await this.getSettings())?.content;
    if (!isSiteContent(content)) return defaultSiteContent;
    return {
      ...content,
      contact: { ...defaultSiteContent.contact, ...content.contact },
    };
  }

  async setSiteContent(content: SiteContent) {
    await this.settingsRepository.upsert({ id: settingsId, content }, ["id"]);
  }

  async getAdminTwoFactorState() {
    const settings = await this.getSettings();
    const pendingSecret = settings?.adminTwoFactorPendingSecret &&
      settings.adminTwoFactorPendingExpiresAt &&
      settings.adminTwoFactorPendingExpiresAt > new Date()
      ? decryptSecret(settings.adminTwoFactorPendingSecret)
      : undefined;
    return {
      enabled: Boolean(settings?.adminTwoFactorSecret),
      secret: settings?.adminTwoFactorSecret ? decryptSecret(settings.adminTwoFactorSecret) : undefined,
      pendingSecret,
      lastCounter: settings?.adminTwoFactorLastCounter
        ? Number(settings.adminTwoFactorLastCounter)
        : undefined,
    };
  }

  async setAdminTwoFactorPendingSecret(secret: string) {
    await this.settingsRepository.upsert({
      id: settingsId,
      adminTwoFactorPendingSecret: encryptSecret(secret),
      adminTwoFactorPendingExpiresAt: new Date(Date.now() + 10 * 60_000),
    }, ["id"]);
  }

  async enableAdminTwoFactor(secret: string, counter: number) {
    await this.settingsRepository.upsert({
      id: settingsId,
      adminTwoFactorSecret: encryptSecret(secret),
      adminTwoFactorLastCounter: String(counter),
      adminTwoFactorPendingSecret: null,
      adminTwoFactorPendingExpiresAt: null,
    }, ["id"]);
  }

  async disableAdminTwoFactor() {
    const settings = await this.getSettings();
    if (!settings) return;
    settings.adminTwoFactorSecret = null;
    settings.adminTwoFactorPendingSecret = null;
    settings.adminTwoFactorPendingExpiresAt = null;
    settings.adminTwoFactorLastCounter = null;
    await this.settingsRepository.save(settings);
  }

  async consumeAdminTwoFactorCounter(counter: number) {
    const result = await this.settingsRepository
      .createQueryBuilder()
      .update(AppSettingsEntity)
      .set({ adminTwoFactorLastCounter: String(counter) })
      .where("id = :id", { id: settingsId })
      .andWhere("admin_two_factor_secret IS NOT NULL")
      .andWhere("(admin_two_factor_last_counter IS NULL OR admin_two_factor_last_counter < :counter)", { counter })
      .execute();
    return result.affected === 1;
  }
}
