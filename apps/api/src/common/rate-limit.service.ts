import { Injectable } from "@nestjs/common";
import { createHmac } from "node:crypto";
import { DataSource } from "typeorm";

@Injectable()
export class RateLimitService {
  constructor(private readonly dataSource: DataSource) {}

  async consume(subject: string, limit: number, windowMs = 15 * 60_000) {
    const secret = process.env.AUTH_SECRET?.trim() || process.env.ADMIN_SESSION_SECRET?.trim();
    if (!secret || secret.length < 32) throw new Error("A session secret is required for rate limiting.");
    const windowId = Math.floor(Date.now() / windowMs);
    const keyHash = createHmac("sha256", secret).update(subject).digest("hex");
    const id = `${keyHash}:${windowId}`;
    const expiresAt = new Date((windowId + 2) * windowMs);
    const result = await this.dataSource.query(
      `INSERT INTO security_rate_limits (id, count, expires_at)
       VALUES ($1, 1, $2)
       ON CONFLICT (id) DO UPDATE
       SET count = security_rate_limits.count + 1
       RETURNING count`,
      [id, expiresAt],
    ) as { count: number }[];
    return Number(result[0]?.count ?? 0) <= limit;
  }
}
