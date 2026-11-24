"use client";

import { useState, type FormEvent } from "react";
import { Check, Sparkles } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/ui/toast-provider";
import type { CheckoutPlan } from "@/lib/resume-store";
import type { PlanContent } from "@/lib/site-content";

type Props = {
  plans: PlanContent[];
  checkoutPlans: CheckoutPlan[];
  currentPlan?: string;
  currentPlanExpiresAt?: string | null;
  authenticated?: boolean;
};

function formatBdt(amount: number) {
  return `BDT ${amount.toLocaleString("en-BD", { maximumFractionDigits: 2 })}`;
}

export function PricingCards({
  plans,
  checkoutPlans,
  currentPlan,
  currentPlanExpiresAt,
  authenticated = false,
}: Props) {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const amounts = new Map(checkoutPlans.map((plan) => [plan.id, plan]));
  const hasPermanentPaidPlan = Boolean(currentPlan && currentPlan !== "Free" && !currentPlanExpiresAt);

  return <div className="grid-3">{plans.map((plan, index) => {
    const checkout = amounts.get(plan.id as CheckoutPlan["id"]);
    const isPaid = plan.id !== "Free";
    return <article className={`card price-card${index === 1 ? " featured" : ""}`} key={plan.name}>
      {index === 1 && <span className="popular">POPULAR</span>}
      <span className="plan-icon"><Sparkles size={17} /></span>
      <h3>{plan.name}</h3>
      <p className="price-desc">{plan.description}</p>
      <div className="price">{isPaid && checkout ? formatBdt(checkout.amountBdt) : plan.price}<small>{plan.period}</small></div>
      <p className="plan-limit">{plan.resumeLimit === null ? "Unlimited resume requests" : `${plan.resumeLimit} resume ${plan.resumeLimit === 1 ? "request" : "requests"}`}</p>
      <ul className="check-list">{plan.features.map((feature) => <li key={feature}><Check size={15} />{feature}</li>)}</ul>
      {!isPaid
        ? <Link className="button button-secondary plan-cta" href="/build">Start free</Link>
        : !authenticated
          ? <Link className={`button ${index === 1 ? "button-primary" : "button-secondary"} plan-cta`} href="/login?next=%2Fpricing">Sign in to upgrade</Link>
          : hasPermanentPaidPlan
            ? <button className="button button-secondary plan-cta" type="button" disabled>
              Contact support to change your plan
            </button>
          : !checkout?.enabled
            ? <button className="button button-secondary plan-cta" type="button" disabled>Payments unavailable</button>
            : <>
              <button
                className={`button ${index === 1 ? "button-primary" : "button-secondary"} plan-cta`}
                type="button"
                aria-expanded={selectedPlan === plan.id}
                onClick={() => setSelectedPlan(selectedPlan === plan.id ? null : plan.id)}
              >
                {currentPlan === plan.id ? `Renew ${plan.name}` : `Upgrade to ${plan.name}`}
              </button>
              {selectedPlan === plan.id && <CheckoutForm plan={plan.id as CheckoutPlan["id"]} onCancel={() => setSelectedPlan(null)} />}
            </>}
    </article>;
  })}</div>;
}

function CheckoutForm({ plan, onCancel }: { plan: CheckoutPlan["id"]; onCancel: () => void }) {
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    setBusy(true);
    try {
      const response = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, ...values }),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        const message = typeof result === "object" && result !== null && "error" in result &&
          typeof result.error === "string" ? result.error : "Unable to start the payment.";
        toast.error(message);
        return;
      }
      const redirectUrl = typeof result === "object" && result !== null &&
        "redirectUrl" in result && typeof result.redirectUrl === "string"
        ? result.redirectUrl
        : "";
      const gatewayUrl = new URL(redirectUrl);
      if (gatewayUrl.protocol !== "https:" ||
          !["sandbox.sslcommerz.com", "securepay.sslcommerz.com"].includes(gatewayUrl.hostname)) {
        throw new Error("The payment gateway returned an invalid checkout address.");
      }
      window.location.assign(gatewayUrl.toString());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "We couldn't reach the payment server.");
    } finally {
      setBusy(false);
    }
  }

  return <form className="checkout-form" onSubmit={submit}>
    <p>Secure monthly payment via SSLCommerz. Your plan stays active for one month; renewal is manual.</p>
    <label>Mobile number<input name="phone" type="tel" autoComplete="tel" placeholder="01XXXXXXXXX" required maxLength={20} /></label>
    <label>Billing address<input name="address" autoComplete="street-address" required maxLength={200} /></label>
    <div className="checkout-form-row">
      <label>City<input name="city" autoComplete="address-level2" required maxLength={100} /></label>
      <label>Postcode<input name="postcode" inputMode="numeric" autoComplete="postal-code" required pattern="[0-9]{4,10}" maxLength={10} /></label>
    </div>
    <button className="button button-primary plan-cta" type="submit" disabled={busy}>
      {busy ? "Connecting to SSLCommerz..." : "Continue to payment"}
    </button>
    <button className="checkout-cancel" type="button" onClick={onCancel} disabled={busy}>Cancel</button>
  </form>;
}
