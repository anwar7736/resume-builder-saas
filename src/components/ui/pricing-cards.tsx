import { Check, Sparkles } from "lucide-react";
import Link from "next/link";
import type { PlanContent } from "@/lib/site-content";

export function PricingCards({ plans, currentPlan }: { plans: PlanContent[]; currentPlan?: string }) {
  return <div className="grid-3">{plans.map((plan, index) => (
    <article className={`card price-card${index === 1 ? " featured" : ""}`} key={plan.name}>
      {index === 1 && <span className="popular">POPULAR</span>}
      <span className="plan-icon"><Sparkles size={17} /></span>
      <h3>{plan.name}</h3>
      <p className="price-desc">{plan.description}</p>
      <div className="price">{plan.price}<small>{plan.period}</small></div>
      <p className="plan-limit">{plan.resumeLimit === null ? "Unlimited resume requests" : `${plan.resumeLimit} resume ${plan.resumeLimit === 1 ? "request" : "requests"}`}</p>
      <ul className="check-list">{plan.features.map((feature) => <li key={feature}><Check size={15} />{feature}</li>)}</ul>
      {currentPlan === plan.id
        ? <span className="button button-secondary plan-current">Current plan</span>
        : <Link className={`button ${index === 0 ? "button-secondary" : index === 1 ? "button-primary" : "button-secondary"} plan-cta`} href={index === 0 ? "/build" : `/contact?plan=${encodeURIComponent(plan.name)}`}>{index === 0 ? "Start free" : "Contact to upgrade"}</Link>}
    </article>
  ))}</div>;
}
