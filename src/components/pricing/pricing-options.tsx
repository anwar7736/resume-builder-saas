import { plans } from "@/lib/site-data";
import { PricingCard } from "@/components/home/pricing-card";

export function PricingOptions() {
  return <div className="grid-3">{plans.map((plan) => <PricingCard key={plan.name} plan={plan} />)}</div>;
}
