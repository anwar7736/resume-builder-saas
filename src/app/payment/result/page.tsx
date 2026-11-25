"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type PaymentStatus = "success" | "failed" | "cancelled" | "verification_error" | "unknown";

const results: Record<PaymentStatus, {
  label: string;
  title: string;
  message: string;
  symbol: string;
  tone: string;
}> = {
  success: {
    label: "Payment confirmed",
    title: "Thank you for your payment!",
    message: "Your plan is active. You can continue building and managing your resumes.",
    symbol: "✓",
    tone: "success",
  },
  failed: {
    label: "Payment not completed",
    title: "Your plan hasn't changed",
    message: "The payment did not go through. You can safely return to plans and try again.",
    symbol: "×",
    tone: "failure",
  },
  cancelled: {
    label: "Payment cancelled",
    title: "No changes were made",
    message: "You cancelled the payment. Your current plan remains unchanged.",
    symbol: "×",
    tone: "neutral",
  },
  verification_error: {
    label: "Payment needs checking",
    title: "We're confirming your payment",
    message: "We couldn't verify the result yet. If you may have been charged, please contact support before retrying.",
    symbol: "…",
    tone: "warning",
  },
  unknown: {
    label: "Payment status unavailable",
    title: "We couldn't find this payment result",
    message: "Check your account before starting another payment. Contact support if you need help.",
    symbol: "?",
    tone: "warning",
  },
};

function isPaymentStatus(value: string | null): value is PaymentStatus {
  return value === "success" || value === "failed" || value === "cancelled" ||
    value === "verification_error";
}

export default function PaymentResultPage() {
  const [status, setStatus] = useState<PaymentStatus | null>(null);
  const [plan, setPlan] = useState<string | null>(null);
  const processedReturn = useRef(false);

  useEffect(() => {
    if (processedReturn.current) return;
    processedReturn.current = true;

    const url = new URL(window.location.href);
    const paymentStatus = url.searchParams.get("payment");
    const selectedPlan = url.searchParams.get("plan");
    url.searchParams.delete("payment");
    url.searchParams.delete("plan");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);

    setStatus(isPaymentStatus(paymentStatus) ? paymentStatus : "unknown");
    setPlan(selectedPlan === "Premium" || selectedPlan === "Platinum" ? selectedPlan : null);
  }, []);

  if (!status) {
    return <main className="container py-24 text-center muted" role="status">Loading payment result…</main>;
  }

  const result = results[status];
  const message = status === "success" && plan
    ? `Thank you! Your ${plan} plan is active. You can continue building and managing your resumes.`
    : result.message;

  return (
    <main className="container flex min-h-[65vh] items-center justify-center py-16">
      <section className="w-full max-w-2xl rounded-3xl border border-white/10 bg-white/[.04] px-6 py-10 text-center shadow-2xl shadow-black/20 sm:px-12">
        <div className={`payment-result-icon payment-result-${result.tone}`} aria-hidden="true">{result.symbol}</div>
        <p className={`eyebrow payment-result-label payment-result-${result.tone}`}>{result.label}</p>
        <h1 className="heading mt-3">{result.title}</h1>
        <p className="subheading mx-auto max-w-lg">{message}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link className="button button-primary" href={status === "success" ? "/account" : "/pricing"}>
            {status === "success" ? "Go to my account" : "Return to plans"}
          </Link>
          <Link className="button button-secondary" href="/">
            Back to home
          </Link>
        </div>
        <p className="muted mt-8 text-sm">ResumeCraft AI · Secure payment by SSLCommerz</p>
      </section>
    </main>
  );
}
