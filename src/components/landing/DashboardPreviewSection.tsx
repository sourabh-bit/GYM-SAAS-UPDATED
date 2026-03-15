import ScrollReveal from "../ScrollReveal";
import { BarChart3, CalendarCheck, CreditCard, Dumbbell, Sparkles, Users } from "lucide-react";

const previewCards = [
  {
    title: "Owner Dashboard",
    subtitle: "Revenue, churn, and member health in one view.",
    accent: "from-primary to-glow-cyan",
    stats: ["MRR", "Churn", "Renewals"],
    icon: BarChart3,
  },
  {
    title: "Member Portal",
    subtitle: "Workouts, progress, and achievements on mobile.",
    accent: "from-glow-cyan to-glow-blue",
    stats: ["Streaks", "PRs", "Goals"],
    icon: Dumbbell,
  },
  {
    title: "Check-in Flow",
    subtitle: "Fast attendance with smart follow-ups.",
    accent: "from-glow-gold to-primary",
    stats: ["Visits", "Late dues", "Upsells"],
    icon: CalendarCheck,
  },
];

const DashboardPreviewSection = () => {
  return (
    <section className="relative px-4 sm:px-6 lg:px-8 py-10 sm:py-20 lg:py-28">
      <div className="max-w-7xl mx-auto">
        <ScrollReveal>
          <div className="text-center mb-6 sm:mb-12">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 mb-3">
              <Sparkles className="w-3 h-3 text-primary" />
              <span className="text-[9px] sm:text-xs font-semibold text-primary uppercase tracking-wider">Previews</span>
            </div>
            <h2 className="font-display text-[22px] sm:text-3xl lg:text-5xl font-bold mb-2 sm:mb-4">
              Visual clarity,
              <br />
              <span className="text-gradient">across every dashboard</span>
            </h2>
            <p className="text-[12px] sm:text-sm lg:text-base text-muted-foreground max-w-2xl mx-auto">
              Every screen is purpose-built to surface the next best action.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-5">
          {previewCards.map((card, index) => (
            <ScrollReveal key={card.title} delay={index * 0.05}>
              <div className="bg-glass border border-glass-bright rounded-xl sm:rounded-2xl p-4 sm:p-5 overflow-hidden h-full">
                <div className={`h-28 sm:h-36 rounded-lg bg-gradient-to-br ${card.accent} p-3 sm:p-4`}>
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-lg bg-background/20 flex items-center justify-center">
                      <card.icon className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-background/80" />
                      <div className="w-2 h-2 rounded-full bg-background/50" />
                      <div className="w-2 h-2 rounded-full bg-background/30" />
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="h-2.5 rounded-full bg-background/60 w-2/3" />
                    <div className="h-2 rounded-full bg-background/40 w-1/2" />
                    <div className="h-2 rounded-full bg-background/30 w-3/4" />
                  </div>
                </div>
                <div className="mt-4">
                  <h3 className="font-display text-sm sm:text-base font-semibold mb-1">{card.title}</h3>
                  <p className="text-[11px] sm:text-sm text-muted-foreground mb-3">{card.subtitle}</p>
                  <div className="flex flex-wrap gap-2">
                    {card.stats.map((stat) => (
                      <span
                        key={stat}
                        className="rounded-full bg-secondary/60 border border-glass px-3 py-1 text-[10px] text-muted-foreground font-medium"
                      >
                        {stat}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal>
          <div className="mt-6 sm:mt-10 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
            {[
              { icon: Users, label: "Member CRM" },
              { icon: CreditCard, label: "Billing" },
              { icon: CalendarCheck, label: "Attendance" },
              { icon: BarChart3, label: "Analytics" },
            ].map((item) => (
              <div key={item.label} className="bg-secondary/30 border border-glass rounded-lg p-3 flex items-center gap-2">
                <item.icon className="w-4 h-4 text-primary" />
                <span className="text-[11px] sm:text-sm text-muted-foreground font-medium">{item.label}</span>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default DashboardPreviewSection;
