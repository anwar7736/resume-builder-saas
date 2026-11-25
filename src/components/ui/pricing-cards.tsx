"use client";

import { useEffect, useState, type FormEvent } from "react";
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

type CheckoutField = "phone" | "address" | "city" | "postcode";
type CheckoutErrors = Partial<Record<CheckoutField, string>>;

function checkoutErrorMessage(result: unknown) {
  if (typeof result !== "object" || result === null) return "Unable to start the payment.";
  if ("message" in result) {
    if (typeof result.message === "string") return result.message;
    if (Array.isArray(result.message) && result.message.every((item) => typeof item === "string")) {
      return result.message.join(" ");
    }
  }
  return "error" in result && typeof result.error === "string"
    ? result.error
    : "Unable to start the payment.";
}

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
  const [currentTime, setCurrentTime] = useState<number | null>(null);
  useEffect(() => {
    const updateTime = () => setCurrentTime(Date.now());
    updateTime();
    const interval = window.setInterval(updateTime, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const amounts = new Map(checkoutPlans.map((plan) => [plan.id, plan]));
  const hasPermanentPaidPlan = Boolean(currentPlan && currentPlan !== "Free" && !currentPlanExpiresAt);
  const planExpiresAt = currentPlanExpiresAt ? Date.parse(currentPlanExpiresAt) : Number.NaN;
  const hasActivePaidPlan = Boolean(
    currentPlan && currentPlan !== "Free" && currentPlanExpiresAt &&
    (!Number.isFinite(planExpiresAt) || currentTime === null || planExpiresAt > currentTime),
  );

  return <div className="grid-3 pricing-grid">{plans.map((plan, index) => {
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
          : hasActivePaidPlan
            ? <button className="button button-secondary plan-cta" type="button" disabled>
              Current plan active; pay again after it expires
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
  const [errors, setErrors] = useState<CheckoutErrors>({});
  const toast = useToast();

  function clearError(field: CheckoutField) {
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const value = (field: CheckoutField) => String(formData.get(field) ?? "").trim();
    const errors: CheckoutErrors = {};
    if (!value("phone")) errors.phone = "Enter your mobile number.";
    if (!value("address")) errors.address = "Enter your billing address.";
    if (!value("city")) errors.city = "Enter your city.";
    const postcode = value("postcode");
    if (!postcode) {
      errors.postcode = "Enter your postcode.";
    } else if (!/^[0-9]{4,10}$/.test(postcode)) {
      errors.postcode = "Enter a postcode with 4–10 digits.";
    }
    setErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const values = {
      phone: value("phone"),
      address: value("address"),
      city: value("city"),
      postcode,
    };
    setBusy(true);
    try {
      const response = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, ...values }),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        toast.error(checkoutErrorMessage(result));
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

  return <form className="checkout-form" noValidate onSubmit={submit}>
    <p>Secure monthly payment via SSLCommerz. Your plan stays active for one month; renewal is manual.</p>
    <div className="checkout-field">
      <label htmlFor="checkout-phone">Mobile number</label>
      <input id="checkout-phone" name="phone" type="tel" autoComplete="tel" placeholder="01XXXXXXXXX" required maxLength={20} aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? "checkout-phone-error" : undefined} onChange={() => clearError("phone")} />
      {errors.phone && <p id="checkout-phone-error" className="checkout-field-error" role="alert">{errors.phone}</p>}
    </div>
    <div className="checkout-field">
      <label htmlFor="checkout-address">Billing address</label>
      <input id="checkout-address" name="address" autoComplete="street-address" placeholder="House, road, area" required maxLength={200} aria-invalid={Boolean(errors.address)} aria-describedby={errors.address ? "checkout-address-error" : undefined} onChange={() => clearError("address")} />
      {errors.address && <p id="checkout-address-error" className="checkout-field-error" role="alert">{errors.address}</p>}
    </div>
    <div className="checkout-form-row">
      <div className="checkout-field">
        <label htmlFor="checkout-city">City</label>
        <input id="checkout-city" name="city" autoComplete="address-level2" placeholder="e.g. Dhaka" required maxLength={100} aria-invalid={Boolean(errors.city)} aria-describedby={errors.city ? "checkout-city-error" : undefined} onChange={() => clearError("city")} />
        {errors.city && <p id="checkout-city-error" className="checkout-field-error" role="alert">{errors.city}</p>}
      </div>
      <div className="checkout-field">
        <label htmlFor="checkout-postcode">Postcode</label>
        <input id="checkout-postcode" name="postcode" inputMode="numeric" autoComplete="postal-code" placeholder="e.g. 1207" required pattern="[0-9]{4,10}" maxLength={10} aria-invalid={Boolean(errors.postcode)} aria-describedby={errors.postcode ? "checkout-postcode-error" : undefined} onChange={() => clearError("postcode")} />
        {errors.postcode && <p id="checkout-postcode-error" className="checkout-field-error" role="alert">{errors.postcode}</p>}
      </div>
    </div>
    <button className="button button-primary plan-cta" type="submit" disabled={busy}>
      {busy ? "Connecting to SSLCommerz..." : "Continue to payment"}
    </button>
    <button className="checkout-cancel" type="button" onClick={onCancel} disabled={busy}>Cancel</button>
  </form>;
}
