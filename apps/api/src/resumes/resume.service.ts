import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, MoreThan, Repository } from "typeorm";
import { isDocumentId, newId } from "../common/identity";
import { resolveEffectivePlan } from "../common/plan-entitlement";
import {
  GeneratedResumeEntity,
  PaymentTransactionEntity,
  ResumeRequestEntity,
  UserEntity,
} from "../database/entities";
import { SettingsService } from "../settings/settings.service";

export type NewResumeRequest = Omit<
  ResumeRequestEntity,
  "id" | "createdAt" | "status"
>;

@Injectable()
export class ResumeService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    @InjectRepository(ResumeRequestEntity)
    private readonly requests: Repository<ResumeRequestEntity>,
    @InjectRepository(GeneratedResumeEntity)
    private readonly resumes: Repository<GeneratedResumeEntity>,
    private readonly settings: SettingsService,
    private readonly dataSource: DataSource,
  ) {}

  async getResumeRequests(userId?: string) {
    const requests = await this.requests.find({
      ...(userId ? { where: { userId } } : {}),
      order: { createdAt: "DESC" },
    });
    return requests.map((request) => this.toResumeRequest(request));
  }

  async getResumeRequestById(id: string, userId?: string) {
    if (!isDocumentId(id)) return null;
    const request = await this.requests.findOneBy({
      id,
      ...(userId ? { userId } : {}),
    });
    return request ? this.toResumeRequest(request) : null;
  }

  async addResumeRequest(input: NewResumeRequest) {
    if (!isDocumentId(input.userId)) return { request: null, limit: 0 };
    return this.dataSource.transaction(async (manager) => {
      const users = manager.getRepository(UserEntity);
      const requestRepository = manager.getRepository(ResumeRequestEntity);
      const user = await users.findOneBy({ id: input.userId });
      if (!user) return { request: null, limit: 0 };
      const content = await this.settings.getSiteContent();
      const now = new Date();
      const activePayment = await manager.getRepository(PaymentTransactionEntity).findOne({
        where: { userId: user.id, status: "paid", expiresAt: MoreThan(now) },
        order: { paidAt: "DESC" },
      });
      const { plan: activePlan } = resolveEffectivePlan(user, activePayment, now);
      const plan = content.plans.find((item) => item.id === activePlan);
      if (!plan) throw new Error(`The ${activePlan} plan is missing from site settings.`);
      const limit = plan.resumeLimit;
      const update = users.createQueryBuilder()
        .update(UserEntity)
        .set({ resumeCount: () => "resume_count + 1" })
        .where("id = :id", { id: user.id });
      if (limit !== null) update.andWhere("resume_count < :limit", { limit });
      const reserved = await update.execute();
      if (!reserved.affected) return { request: null, limit: limit ?? -1 };

      const created = requestRepository.create({
        ...input,
        id: newId(),
        status: "new",
      });
      try {
        await requestRepository.save(created);
      } catch (error) {
        await users.decrement({ id: user.id }, "resumeCount", 1);
        throw error;
      }
      return { request: this.toResumeRequest(created), limit: limit ?? -1 };
    });
  }

  async updateResumeRequestStatus(id: string, status: ResumeRequestEntity["status"]) {
    if (!isDocumentId(id)) return false;
    const result = await this.requests.update({ id }, { status });
    return Boolean(result.affected);
  }

  async updateResumeRequest(
    id: string,
    input: Omit<ResumeRequestEntity, "id" | "userId" | "createdAt" | "status">,
  ) {
    if (!isDocumentId(id)) return false;
    const result = await this.requests.update({ id }, input);
    return Boolean(result.affected);
  }

  async deleteResumeRequest(id: string) {
    if (!isDocumentId(id)) return false;
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(ResumeRequestEntity);
      const request = await repository.findOneBy({ id });
      if (!request) return false;
      await repository.delete({ id });
      await manager.getRepository(UserEntity)
        .createQueryBuilder()
        .update(UserEntity)
        .set({ resumeCount: () => "GREATEST(resume_count - 1, 0)" })
        .where("id = :userId", { userId: request.userId })
        .execute();
      return true;
    });
  }

  async getWebhookConfiguration() {
    return this.settings.getWebhookConfiguration();
  }

  async getGeneratedResumes(userId: string) {
    const rows = await this.resumes.find({
      where: { userId },
      order: { createdAt: "DESC" },
      select: {
        id: true,
        userId: true,
        requestId: true,
        fileName: true,
        contentType: true,
        createdAt: true,
      },
    });
    return rows.map((resume) => this.toGeneratedResume(resume));
  }

  async getGeneratedResumeById(id: string, userId: string) {
    if (!isDocumentId(id)) return null;
    return this.resumes.findOneBy({ id, userId });
  }

  async addGeneratedResume(input: {
    userId: string;
    requestId: string;
    fileName: string;
    contentType: string;
    fileData: Buffer;
  }) {
    const id = newId();
    await this.dataSource.query(
      `INSERT INTO generated_resumes
       (id, user_id, request_id, file_name, content_type, file_data, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, now())
       ON CONFLICT (request_id) DO UPDATE SET
         user_id = EXCLUDED.user_id,
         file_name = EXCLUDED.file_name,
         content_type = EXCLUDED.content_type,
         file_data = EXCLUDED.file_data,
         created_at = now()`,
      [id, input.userId, input.requestId, input.fileName, input.contentType, input.fileData],
    );
    const saved = await this.resumes.findOneBy({ requestId: input.requestId });
    if (!saved) throw new Error("The generated resume was not saved.");
    return this.toGeneratedResume(saved);
  }

  async deleteGeneratedResume(id: string, userId: string) {
    if (!isDocumentId(id)) return false;
    const result = await this.resumes.delete({ id, userId });
    return Boolean(result.affected);
  }

  async getUserById(id: string) {
    if (!isDocumentId(id)) return null;
    return this.users.findOneBy({ id });
  }

  async getAccountResumeCount(userId: string) {
    return this.requests.countBy({ userId });
  }

  private toResumeRequest(request: ResumeRequestEntity) {
    return {
      id: request.id,
      userId: request.userId,
      createdAt: request.createdAt.toISOString(),
      status: request.status,
      name: request.name,
      email: request.email,
      phone: request.phone,
      targetRole: request.targetRole,
      experience: request.experience,
      education: request.education ?? "",
      skills: request.skills ?? "",
      summary: request.summary ?? "",
      links: request.links ?? "",
      additionalInfo: request.additionalInfo ?? "",
      jobDescription: request.jobDescription ?? "",
      resumeLanguage: request.resumeLanguage ?? "English",
      resumeTemplate: request.resumeTemplate ?? "Professional",
    };
  }

  private toGeneratedResume(resume: GeneratedResumeEntity) {
    return {
      id: resume.id,
      requestId: resume.requestId,
      fileName: resume.fileName,
      contentType: resume.contentType,
      createdAt: resume.createdAt.toISOString(),
    };
  }
}
