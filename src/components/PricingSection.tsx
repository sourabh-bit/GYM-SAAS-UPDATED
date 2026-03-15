import { Button } from "@/components/ui/button";
import { Check, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import ScrollReveal from "./ScrollReveal";
import { useState } from "react";

const plans = [
  {
    name: "Basic",
    price: "499",
    period: "/month",
    features: ["Up to 30 members", "Attendance tracking", "Basic reports", "Due tracking", "Email support"],
    highlighted: false,
  },
  {
    name: "Growth",
    price: "999",
    period: "/month",
    badge: "Most Popular",
    features: ["50+ members", "Payment collection", "Trainer management", "Advanced reports", "Priority support"],
    highlighted: true,
  },
  {
    name: "Pro",
    price: "1,499",
    period: "/month",
    features: ["Unlimited members", "Member app premium", "Gamification", "Retention tools", "Priority support"],
    highlighted: false,
  },
];

const PricingSection = () => {
  const [selectedPlan, setSelectedPlan] = useState(1);

  return (
    <section id="pricing" className="px-5 py-10 relative">
      <div className="gradient-orb w-56 h-56 bg-glow-cyan/10 -top-10 right-0 animate-pulse-glow" style={{ position: "absolute" }} />

      <ScrollReveal>
        <p className="text-xs text-primary font-bold uppercase tracking-[0.2em] mb-2 text-center">
          Pricing
        </p>
        <h2 className="font-display text-2xl font-bold text-center mb-2">
          Simple, transparent
          <br />
          <span className="text-gradient">pricing</span>
        </h2>
        <p className="text-sm text-muted-foreground text-center mb-8">
          Start free. Scale as you grow.
        </p>
      </ScrollReveal>

      <div className="space-y-4">
        {plans.map((plan, i) => (
          <ScrollReveal key={plan.name} delay={i * 0.12} direction="scale">
            <motion.div
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedPlan(i)}
              className={`rounded-2xl border p-5 relative overflow-hidden cursor-pointer transition-all duration-300 ${
                plan.highlighted
                  ? "border-primary/40 bg-glass glow-shadow shadow-elevated"
                  : "border-glass-bright bg-glass"
              } ${selectedPlan === i ? "ring-1 ring-primary/30" : ""}`}
            >
              {/* Top gradient for highlighted */}
              {plan.highlighted && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-primary" />
              )}

              {/* Badge */}
              {plan.badge && (
                <div className="absolute top-4 right-4 flex items-center gap-1 bg-gradient-primary text-primary-foreground rounded-full px-2.5 py-1">
                  <Sparkles className="w-3 h-3" />
                  <span className="text-[10px] font-bold">{plan.badge}</span>
                </div>
              )}

              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                {plan.name}
              </p>
              <div className="flex items-baseline gap-1.5 mb-5">
                {plan.price !== "Custom" && (
                  <span className="text-xs text-muted-foreground font-medium">INR</span>
                )}
                <span className="text-3xl font-extrabold font-display">{plan.price}</span>
                {plan.period && (
                  <span className="text-xs text-muted-foreground">{plan.period}</span>
                )}
              </div>

              <div className="space-y-3 mb-6">
                {plan.features.map((f) => (
                  <div key={f} className="flex items-center gap-2.5">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                      plan.highlighted ? "bg-gradient-primary" : "bg-secondary"
                    }`}>
                      <Check className={`w-2.5 h-2.5 ${plan.highlighted ? "text-primary-foreground" : "text-primary"}`} />
                    </div>
                    <span className="text-xs text-muted-foreground">{f}</span>
                  </div>
                ))}
              </div>

              <Button
                variant={plan.highlighted ? "glow" : "outline"}
                className={`w-full rounded-xl h-11 text-sm ${
                  !plan.highlighted ? "border-glass-bright bg-glass" : ""
                }`}
              >
                {plan.price === "Custom" ? "Contact Sales" : "Start Free Trial"}
              </Button>
            </motion.div>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
};

export default PricingSection;
