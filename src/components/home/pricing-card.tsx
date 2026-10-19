"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { plans } from "@/lib/site-data";

type Plan = (typeof plans)[number];

export function PricingCard({ plan }: { plan: Plan }) {
  const [notice, setNotice] = useState(false);
  return <article className={`card price-card${plan.featured ? " featured" : ""}`}>
    {plan.featured && <span className="popular">Most popular</span>}
    <h3>{plan.name}</h3><p className="price-desc">{plan.description}</p>
    <div className="price">{plan.price}<small>{plan.period}</small></div>
    <ul className="check-list">{plan.features.map((feature) => <li key={feature}><Check size={15} />{feature}</li>)}</ul>
    <button type="button" className={`button button-${plan.featured ? "primary" : "secondary"} w-full`} onClick={() => setNotice(true)}>{plan.cta}</button>
    {notice && <p className="form-feedback" role="status" style={{ margin: "12px 0 0" }}>This proposed plan is not available yet. There is no checkout or enrollment.</p>}
  </article>;
}
