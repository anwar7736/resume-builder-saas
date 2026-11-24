"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/toast-provider";

const paymentMessages = {
  success: "Payment verified. Your plan is active for one month; it will not renew automatically.",
  failed: "Payment was not completed. No plan change was made; you can try again.",
  cancelled: "Payment was cancelled. No plan change was made.",
  verification_error: "We couldn't verify the payment yet. Please contact support before trying again.",
} as const;

export function PaymentStatusNotice() {
  const searchParams = useSearchParams();
  const toast = useToast();
  const notified = useRef<string | null>(null);
  const status = searchParams.get("payment");
  const message = status === "success" || status === "failed" ||
    status === "cancelled" || status === "verification_error"
    ? paymentMessages[status]
    : null;
  const plan = searchParams.get("plan");
  const safePlan = plan === "Premium" || plan === "Platinum" ? plan : null;
  const displayMessage = status === "success" && safePlan
    ? `Payment verified. Your ${safePlan} plan is active for one month; it will not renew automatically.`
    : message;

  useEffect(() => {
    if (!status || !displayMessage || notified.current === status) return;
    notified.current = status;
    if (status === "success") toast.success(displayMessage);
    else if (status === "verification_error") toast.info(displayMessage);
    else toast.error(displayMessage);
  }, [displayMessage, status, toast]);

  if (!displayMessage) return null;
  return <p className={`payment-status payment-status-${status}`} role={status === "success" ? "status" : "alert"}>
    {displayMessage}
  </p>;
}
