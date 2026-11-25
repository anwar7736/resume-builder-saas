import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { isRecord, newId } from "../common/identity";
import { PaymentTransactionEntity, UserEntity } from "../database/entities";
import { SettingsService } from "../settings/settings.service";

type PaidPlan = "Premium" | "Platinum";

function isPaidPlan(value: unknown): value is PaidPlan {
  return value === "Premium" || value === "Platinum";
}

function packageAmountBdt(plan: PaidPlan, price: string) {
  const match = /^(?:৳\s*|BDT\s*)?((?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?)(?:\s*BDT)?$/i.exec(price.trim());
  if (!match) {
    throw new ServiceUnavailableException(
      `${plan} package price must be a positive BDT amount, such as BDT 500.`,
    );
  }
  const amount = match[1].replace(/,/g, "");
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0 || numericAmount > 99_999_999.99) {
    throw new ServiceUnavailableException(`${plan} package price is outside the supported BDT range.`);
  }
  return amount;
}

function amountInPaisa(value: unknown) {
  const text = typeof value === "number" || typeof value === "string" ? String(value) : "";
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) return null;
  const amount = Number(text);
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) : null;
}

function addOneMonth(date: Date) {
  const result = new Date(date);
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + 1);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(PaymentTransactionEntity)
    private readonly payments: Repository<PaymentTransactionEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    private readonly settings: SettingsService,
  ) {}

  async getPlans() {
    const enabled = this.isConfigured();
    const content = await this.settings.getSiteContent();
    return {
      plans: (["Premium", "Platinum"] as const).map((id) => ({
        id,
        amountBdt: Number(packageAmountBdt(
          id,
          content.plans.find((plan) => plan.id === id)?.price ?? "",
        )),
        enabled,
      })),
    };
  }

  async createCheckout(userId: string, payload: unknown) {
    if (!isRecord(payload) || !isPaidPlan(payload.plan) ||
        typeof payload.phone !== "string" || typeof payload.address !== "string" ||
        typeof payload.city !== "string" || typeof payload.postcode !== "string") {
      throw new BadRequestException("Choose a plan and enter your phone and billing address.");
    }

    const phone = payload.phone.replace(/[\s-]/g, "");
    const address = payload.address.trim();
    const city = payload.city.trim();
    const postcode = payload.postcode.trim();
    if (!/^(?:\+?88)?01[3-9]\d{8}$/.test(phone) ||
        address.length < 3 || address.length > 200 ||
        city.length < 2 || city.length > 100 ||
        !/^\d{4,10}$/.test(postcode)) {
      throw new BadRequestException("Enter a valid Bangladesh mobile number and billing address.");
    }

    this.requireConfiguration();
    const user = await this.users.findOneBy({ id: userId });
    if (!user) throw new BadRequestException("Your account could not be found. Please sign in again.");
    const currentPlan = user.planExpiresAt && user.planExpiresAt <= new Date() ? "Free" : user.plan;
    if (currentPlan !== "Free" && !user.planExpiresAt) {
      throw new BadRequestException("Your current plan was assigned without an expiry. Contact support to change it.");
    }
    const planRank = { Free: 0, Premium: 1, Platinum: 2 } as const;
    if (planRank[payload.plan] < planRank[currentPlan]) {
      throw new BadRequestException("Your current plan is higher. You can renew it from the Plans page.");
    }

    const transactionId = newId();
    const content = await this.settings.getSiteContent();
    const packagePlan = content.plans.find((plan) => plan.id === payload.plan);
    if (!packagePlan) {
      throw new ServiceUnavailableException(`${payload.plan} package price is not configured.`);
    }
    const amount = packageAmountBdt(payload.plan, packagePlan.price);
    await this.payments.save(this.payments.create({
      id: newId(),
      userId,
      plan: payload.plan,
      transactionId,
      amount: Number(amount).toFixed(2),
      currency: "BDT",
      status: "pending",
      paidAt: null,
      expiresAt: null,
    }));

    const gateway = this.isLive()
      ? "https://securepay.sslcommerz.com/gwprocess/v4/api.php"
      : "https://sandbox.sslcommerz.com/gwprocess/v4/api.php";
    const frontend = this.getFrontendOrigin();
    const callback = `${frontend}/api/payments/sslcommerz`;
    const form = new URLSearchParams({
      store_id: this.config.getOrThrow<string>("SSLCOMMERZ_STORE_ID").trim(),
      store_passwd: this.config.getOrThrow<string>("SSLCOMMERZ_STORE_PASSWORD").trim(),
      total_amount: amount,
      currency: "BDT",
      tran_id: transactionId,
      success_url: `${callback}/success`,
      fail_url: `${callback}/fail`,
      cancel_url: `${callback}/cancel`,
      ipn_url: `${callback}/ipn`,
      cus_name: user.name,
      cus_email: user.email,
      cus_add1: address,
      cus_city: city,
      cus_postcode: postcode,
      cus_country: "Bangladesh",
      cus_phone: phone,
      shipping_method: "NO",
      product_name: `ResumeCraft ${payload.plan} monthly plan`,
      product_category: "Digital Service",
      product_profile: "non-physical-goods",
    });

    try {
      const response = await fetch(gateway, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form,
        redirect: "error",
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) throw new Error(`SSLCommerz returned HTTP ${response.status}.`);
      const result: unknown = await response.json();
      const paymentUrl = isRecord(result) && result.status === "SUCCESS" &&
        typeof result.GatewayPageURL === "string"
        ? this.validateGatewayUrl(result.GatewayPageURL)
        : null;
      if (!paymentUrl) throw new Error("SSLCommerz did not return a valid checkout URL.");
      return { redirectUrl: paymentUrl };
    } catch (error) {
      await this.payments.update({ transactionId, status: "pending" }, { status: "failed" });
      console.error("Unable to start an SSLCommerz checkout.", error);
      throw new BadGatewayException("We couldn't start the payment. Please try again.");
    }
  }

  async verifyAndActivate(transactionId: string, validationId: string) {
    if (!transactionId || !validationId) return null;
    const payment = await this.payments.findOneBy({ transactionId });
    if (!payment) return null;
    if (payment.status === "paid") return payment;

    const verified = await this.validatePayment(validationId, payment);
    if (!verified) return null;

    return this.dataSource.transaction(async (manager) => {
      const transactions = manager.getRepository(PaymentTransactionEntity);
      const current = await transactions.findOne({
        where: { transactionId },
        lock: { mode: "pessimistic_write" },
      });
      if (!current) return null;
      if (current.status === "paid") return current;

      const users = manager.getRepository(UserEntity);
      const user = await users.findOne({
        where: { id: current.userId },
        lock: { mode: "pessimistic_write" },
      });
      if (!user) return null;
      const now = new Date();
      const extensionBase = user.planExpiresAt && user.planExpiresAt > now
        ? user.planExpiresAt
        : now;
      const expiresAt = addOneMonth(extensionBase);
      current.status = "paid";
      current.paidAt = now;
      current.expiresAt = expiresAt;
      user.plan = current.plan;
      user.planExpiresAt = expiresAt;
      await users.save(user);
      return transactions.save(current);
    });
  }

  async markUnsuccessful(transactionId: string, status: "failed" | "cancelled") {
    if (!transactionId) return;
    await this.payments.update(
      { transactionId, status: "pending" },
      { status },
    );
  }

  getReturnUrl(result: "success" | "failed" | "cancelled" | "verification_error", plan?: PaidPlan) {
    const url = new URL("/pricing", this.getFrontendOrigin());
    url.searchParams.set("payment", result);
    if (plan) url.searchParams.set("plan", plan);
    return url.toString();
  }

  private async validatePayment(validationId: string, payment: PaymentTransactionEntity) {
    const endpoint = this.isLive()
      ? "https://securepay.sslcommerz.com/validator/api/validationserverAPI.php"
      : "https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php";
    const query = new URLSearchParams({
      val_id: validationId,
      store_id: this.config.getOrThrow<string>("SSLCOMMERZ_STORE_ID").trim(),
      store_passwd: this.config.getOrThrow<string>("SSLCOMMERZ_STORE_PASSWORD").trim(),
      format: "json",
    });
    const response = await fetch(`${endpoint}?${query.toString()}`, {
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`SSLCommerz validation returned HTTP ${response.status}.`);
    const result: unknown = await response.json();
    if (!isRecord(result) || !["VALID", "VALIDATED"].includes(String(result.status)) ||
        result.val_id !== validationId ||
        result.tran_id !== payment.transactionId ||
        String(result.currency).toUpperCase() !== payment.currency ||
        amountInPaisa(result.amount) !== amountInPaisa(payment.amount)) {
      return false;
    }
    return true;
  }

  private validateGatewayUrl(value: string) {
    try {
      const url = new URL(value);
      const expectedHost = this.isLive() ? "securepay.sslcommerz.com" : "sandbox.sslcommerz.com";
      return url.protocol === "https:" && url.hostname === expectedHost ? url.toString() : null;
    } catch {
      return null;
    }
  }

  private isLive() {
    const value = this.config.get<string>("SSLCOMMERZ_IS_LIVE")?.trim().toLowerCase();
    if (value && value !== "true" && value !== "false") {
      throw new ServiceUnavailableException("SSLCOMMERZ_IS_LIVE must be true or false.");
    }
    return value === "true";
  }

  private isConfigured() {
    return Boolean(
      this.config.get<string>("SSLCOMMERZ_STORE_ID")?.trim() &&
      this.config.get<string>("SSLCOMMERZ_STORE_PASSWORD")?.trim() &&
      (this.config.get<string>("FRONTEND_URL")?.trim() ||
        this.config.get<string>("FRONTEND_ORIGINS")?.split(",")[0]?.trim()),
    );
  }

  private requireConfiguration() {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        "SSLCommerz is not configured. Set its store credentials and FRONTEND_URL on the API server.",
      );
    }
    this.isLive();
    this.getFrontendOrigin();
  }

  private getFrontendOrigin() {
    const configured = this.config.get<string>("FRONTEND_URL")?.trim() ||
      this.config.get<string>("FRONTEND_ORIGINS")?.split(",")[0]?.trim();
    if (!configured) {
      throw new ServiceUnavailableException("FRONTEND_URL must be set on the API server.");
    }
    let url: URL;
    try {
      url = new URL(configured);
    } catch {
      throw new ServiceUnavailableException("FRONTEND_URL must be a valid site origin.");
    }
    const isLocalHttp = this.config.get<string>("NODE_ENV") !== "production" &&
      url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname);
    if ((url.protocol !== "https:" && !isLocalHttp) || url.username || url.password) {
      throw new ServiceUnavailableException("FRONTEND_URL must use HTTPS outside local development.");
    }
    return url.origin;
  }
}
