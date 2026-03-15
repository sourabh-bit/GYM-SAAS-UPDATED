import ScrollReveal from "../ScrollReveal";
import { CheckCircle2, Gauge, HeartHandshake, LineChart, Sparkles, Users } from "lucide-react";

const benefits = [
  {
    title: "Operational Clarity",
    description: "Every member, payment, and check-in in one real-time command center.",
    accent: "from-primary to-glow-cyan",
    icon: Gauge,
    points: ["Unified member CRM", "Automated renewals", "Zero double entry"],
    metric: "42% less admin time",
  },
  {
    title: "Member Engagement",
    description: "Keep members motivated with AI coaching, streaks, and smart nudges.",
    accent: "from-glow-cyan to-glow-blue",
    icon: Users,
    points: ["AI workout guidance", "Progress insights", "Challenges and rewards"],
    metric: "31% higher retention",
  },
  {
    title: "Revenue Growth",
    description: "Billing that runs itself with dunning, autopay, and growth analytics.",
    accent: "from-glow-gold to-primary",
    icon: LineChart,
    points: ["Recurring billing", "Smart dunning", "Pricing intelligence"],
    metric: "18% MRR lift",
  },
];

const benefitsStrip = [
  { label: "Multi-tenant safe", icon: CheckCircle2 },
  { label: "RLS by default", icon: CheckCircle2 },
  { label: "Role-based access", icon: CheckCircle2 },
  { label: "Realtime analytics", icon: Sparkles },
  { label: "Dedicated support", icon: HeartHandshake },
];

const BenefitsSection = () => {
  return (
    <section className="relative px-4 sm:px-6 lg:px-8 py-10 sm:py-20 lg:py-28">
      <div className="hidden sm:block gradient-orb w-[500px] h-[500px] bg-primary/5 -left-32 top-20" style={{ position: "absolute" }} />

      <div className="max-w-7xl mx-auto relative z-10">
        <ScrollReveal>
          <div className="text-center mb-6 sm:mb-12">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 mb-3">
              <Sparkles className="w-3 h-3 text-primary" />
              <span className="text-[9px] sm:text-xs font-semibold text-primary uppercase tracking-wider">Benefits</span>
            </div>
            <h2 className="font-display text-[22px] sm:text-3xl lg:text-5xl font-bold mb-2 sm:mb-4">
              More growth with
              <br />
              <span className="text-gradient">less busy work</span>
            </h2>
            <p className="text-[12px] sm:text-sm lg:text-base text-muted-foreground max-w-2xl mx-auto">
              FitCore replaces spreadsheets and scattered tools with one trusted platform.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-5">
          {benefits.map((benefit, index) => (
            <ScrollReveal key={benefit.title} delay={index * 0.05}>
              <div className="bg-glass border border-glass-bright rounded-xl sm:rounded-2xl p-4 sm:p-6 h-full relative overflow-hidden">
                <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${benefit.accent}`} />
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${benefit.accent} flex items-center justify-center`}>
                    <benefit.icon className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-display text-sm sm:text-base font-bold">{benefit.title}</h3>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">{benefit.metric}</p>
                  </div>
                </div>
                <p className="text-[11px] sm:text-sm text-muted-foreground mb-4">{benefit.description}</p>
                <div className="space-y-2">
                  {benefit.points.map((point) => (
                    <div key={point} className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                      <span className="text-[11px] sm:text-sm text-muted-foreground">{point}</span>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal>
          <div className="mt-6 sm:mt-10 bg-secondary/30 border border-glass rounded-xl sm:rounded-2xl px-4 py-3 sm:px-6 sm:py-4 flex flex-wrap items-center justify-center gap-3 sm:gap-6">
            {benefitsStrip.map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <item.icon className="w-3.5 h-3.5 text-primary" />
                <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">{item.label}</span>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default BenefitsSection;
