import { Button } from "@/components/ui/button";
import { Check, Sparkles, Crown } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import ScrollReveal from "../ScrollReveal";
import { Link } from "react-router-dom";

const plans = [
  {
    name: "Basic",
    price: "\u20B9499",
    period: "/month",
    desc: "For small gyms getting started",
    features: ["Member management", "Attendance tracking", "Basic reports", "Due tracking", "Email support"],
    max_members: 30,
    highlighted: false,
  },
  {
    name: "Growth",
    price: "\u20B9999",
    period: "/month",
    desc: "For growing gyms that need payments",
    features: ["Payment collection", "Trainer management", "Advanced reports", "PDF exports", "Priority support"],
    max_members: 50,
    highlighted: true,
    badge: "Most Popular",
  },
  {
    name: "Pro",
    price: "\u20B91,499",
    period: "/month",
    desc: "For multi-location & premium experiences",
    features: ["Member app premium", "Gamification", "Retention tools", "Priority support", "Multi-location support"],
    max_members: 9999,
    highlighted: false,
  },
];



const PricingSection = () => {
  const [annual, setAnnual] = useState(false);

  return (
    <section id="pricing" className="relative px-5 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-28">
      <div className="max-w-7xl mx-auto relative z-10">
        <ScrollReveal>
          <div className="text-center mb-8 sm:mb-10 lg:mb-16">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 mb-3 sm:mb-4">
              <Crown className="w-3 h-3 text-primary" />
              <span className="text-[10px] sm:text-xs font-semibold text-primary uppercase tracking-wider">Pricing</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl lg:text-5xl font-bold mb-3 sm:mb-4">
              Simple, transparent <span className="text-gradient">pricing</span>
            </h2>
            <p className="text-[13px] sm:text-sm lg:text-base text-muted-foreground max-w-lg mx-auto mb-5 sm:mb-6 px-2">
              Start free for 14 days. No credit card required.
            </p>

            <div className="inline-flex items-center gap-2 bg-secondary/50 border border-glass rounded-full px-1.5 py-1">
              <button
                onClick={() => setAnnual(false)}
                className={`px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all ${
                  !annual ? "bg-gradient-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setAnnual(true)}
                className={`px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all ${
                  annual ? "bg-gradient-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                Annual <span className="text-[10px] opacity-80">-20%</span>
              </button>
            </div>
          </div>
        </ScrollReveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 max-w-6xl mx-auto">
          {plans.map((plan, i) => (
            <ScrollReveal key={plan.name} delay={i * 0.1}>
              <motion.div
                whileHover={{ y: -4 }}
                className={`relative rounded-2xl p-5 sm:p-6 lg:p-7 border transition-all duration-300 h-full flex flex-col ${
                  plan.highlighted
                    ? "bg-glass border-primary/30 shadow-luxury glow-shadow-sm"
                    : "bg-glass border-glass-bright shadow-elevated"
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <div className="flex items-center gap-1 bg-gradient-primary text-primary-foreground text-[10px] sm:text-xs font-bold px-3 sm:px-4 py-1 sm:py-1.5 rounded-full glow-shadow-sm">
                      <Sparkles className="w-3 h-3" />
                      {plan.badge}
                    </div>
                  </div>
                )}

                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 className="font-display text-base sm:text-lg font-bold mb-1">{plan.name}</h3>
                    <p className="text-[11px] sm:text-xs text-muted-foreground">{plan.desc}</p>
                  </div>
                  <span className="text-[9px] font-semibold px-2 py-1 rounded-full border border-primary/20 bg-primary/10 text-primary">
                    {annual ? "Annual" : "Monthly"}
                  </span>
                </div>

                <div className="flex items-baseline gap-1.5 mb-4 sm:mb-5">
                  <span className="font-display text-3xl sm:text-4xl font-bold">
                    {annual
                      ? `\u20B9${Math.round(parseInt(plan.price.replace(/[\u20B9,]/g, "")) * 0.8).toLocaleString("en-IN")}`
                      : plan.price}
                  </span>
                  {plan.period && <span className="text-xs sm:text-sm text-muted-foreground">{plan.period}</span>}
                </div>

                <div className="flex items-center justify-between text-[10px] text-muted-foreground border border-glass-bright rounded-xl px-3 py-2 bg-secondary/30 mb-4">
                  <span>Member Limit</span>
                  <span className="font-semibold text-foreground">
                    {plan.max_members >= 5000 ? "Unlimited" : plan.max_members === 50 ? "50+" : plan.max_members}
                  </span>
                </div>

                <div className="mb-6 sm:mb-7 flex-1">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Included</p>
                  <ul className="space-y-2 sm:space-y-2.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-primary" />
                        </div>
                        <span className="text-[13px] sm:text-sm text-muted-foreground">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Link to="/signup">
                  <Button
                    variant={plan.highlighted ? "glow" : "outline"}
                    className={`w-full rounded-xl h-11 sm:h-12 text-sm ${!plan.highlighted ? "border-glass-bright bg-glass hover:bg-secondary/50" : ""}`}
                  >
                    Start Free Trial
                  </Button>
                </Link>
              </motion.div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
