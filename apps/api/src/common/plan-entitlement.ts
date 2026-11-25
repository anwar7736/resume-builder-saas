import type { PaymentTransactionEntity, UserEntity } from "../database/entities";

export function resolveEffectivePlan(
  user: Pick<UserEntity, "plan" | "planExpiresAt">,
  activePayment: Pick<PaymentTransactionEntity, "plan" | "status" | "expiresAt"> | null,
  now: Date,
) {
  if (
    activePayment?.status === "paid" &&
    activePayment.expiresAt &&
    activePayment.expiresAt > now
  ) {
    return { plan: activePayment.plan, planExpiresAt: activePayment.expiresAt };
  }
  if (user.planExpiresAt && user.planExpiresAt <= now) {
    return { plan: "Free" as const, planExpiresAt: null };
  }
  return { plan: user.plan, planExpiresAt: user.planExpiresAt };
}
