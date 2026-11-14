import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { RateLimitService } from "../common/rate-limit.service";
import { isDocumentId, newId } from "../common/identity";
import { ContactMessageEntity } from "../database/entities";

@Injectable()
export class ContactService {
  constructor(
    @InjectRepository(ContactMessageEntity)
    private readonly messages: Repository<ContactMessageEntity>,
    private readonly rateLimits: RateLimitService,
  ) {}

  consumeContactRateLimit(ipAddress: string) {
    return this.rateLimits.consume(`contact:${ipAddress}`, 5);
  }

  async addContactMessage(message: Pick<ContactMessageEntity, "name" | "email" | "subject" | "message">) {
    const saved = await this.messages.save(this.messages.create({ id: newId(), ...message }));
    return saved.id;
  }

  async getContactMessages() {
    const messages = await this.messages.find({ order: { createdAt: "DESC" } });
    return messages.map((message) => this.toMessage(message));
  }

  async deleteContactMessage(id: string) {
    if (!isDocumentId(id)) return false;
    const result = await this.messages.delete({ id });
    return Boolean(result.affected);
  }

  async updateContactMessage(
    id: string,
    input: Pick<ContactMessageEntity, "name" | "email" | "subject" | "message">,
  ) {
    if (!isDocumentId(id)) return false;
    const result = await this.messages.update({ id }, input);
    return Boolean(result.affected);
  }

  private toMessage(message: ContactMessageEntity) {
    return {
      id: message.id,
      createdAt: message.createdAt.toISOString(),
      name: message.name,
      email: message.email,
      subject: message.subject,
      message: message.message,
    };
  }
}
