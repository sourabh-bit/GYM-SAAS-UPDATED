import type { ComponentType } from "react";
import ScrollReveal from "../ScrollReveal";
import {
  BarChart3,
  CalendarCheck,
  CreditCard,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  Dumbbell,
} from "lucide-react";

type ShowcaseCard = {
  title: string;
  subtitle: string;
  metric: string;
  tag: string;
  accent: string;
  icon: ComponentType<{ className?: string }>;
};

const ownerCards: ShowcaseCard[] = [
  {
    title: "Revenue Pulse",
    subtitle: "MRR, renewals, churn",
    metric: "INR 12.4L MRR",
    tag: "Owner",
    accent: "from-primary to-glow-cyan",
    icon: BarChart3,
  },
  {
    title: "Member CRM",
    subtitle: "Profiles, plans, dues",
    metric: "2,847 active",
    tag: "Owner",
    accent: "from-primary to-glow-blue",
    icon: Users,
  },
  {
    title: "Smart Billing",
    subtitle: "Autopay and dunning",
    metric: "98% on-time",
    tag: "Owner",
    accent: "from-glow-cyan to-glow-blue",
    icon: CreditCard,
  },
  {
    title: "Attendance Map",
    subtitle: "Peak hours and trends",
    metric: "156 check-ins",
    tag: "Owner",
    accent: "from-glow-green to-primary",
    icon: CalendarCheck,
  },
];

const memberCards: ShowcaseCard[] = [
  {
    title: "AI Coach",
    subtitle: "Programs and tips",
    metric: "24/7 guidance",
    tag: "Member",
    accent: "from-glow-cyan to-glow-blue",
    icon: Sparkles,
  },
  {
    title: "Workout Hub",
    subtitle: "Plans and tracking",
    metric: "18 routines",
    tag: "Member",
    accent: "from-primary to-glow-cyan",
    icon: Dumbbell,
  },
  {
    title: "Achievements",
    subtitle: "Streaks and badges",
    metric: "12 badges",
    tag: "Member",
    accent: "from-glow-gold to-primary",
    icon: Trophy,
  },
  {
    title: "Safety Controls",
    subtitle: "Roles and visibility",
    metric: "RLS enabled",
    tag: "Admin",
    accent: "from-glow-green to-glow-cyan",
    icon: ShieldCheck,
  },
];

const duplicateCards = (cards: ShowcaseCard[]) => [...cards, ...cards];

const CardRow = ({ cards, animationClass }: { cards: ShowcaseCard[]; animationClass: string }) => (
  <div className="relative overflow-hidden">
    <div className="absolute inset-y-0 left-0 w-16 sm:w-24 bg-gradient-to-r from-background via-background/80 to-transparent pointer-events-none z-10" />
    <div className="absolute inset-y-0 right-0 w-16 sm:w-24 bg-gradient-to-l from-background via-background/80 to-transparent pointer-events-none z-10" />
    <div className={`flex w-max gap-3 sm:gap-4 ${animationClass}`}>
      {duplicateCards(cards).map((card, index) => (
        <div
          key={`${card.title}-${index}`}
          className="min-w-[210px] sm:min-w-[260px] bg-glass border border-glass-bright rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-elevated relative overflow-hidden"
        >
          <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${card.accent}`} />
          <div className="flex items-center justify-between mb-3">
            <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${card.accent} flex items-center justify-center`}>
              <card.icon className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-[9px] uppercase tracking-wide font-semibold text-muted-foreground">{card.tag}</span>
          </div>
          <h4 className="font-display text-sm sm:text-base font-bold mb-1">{card.title}</h4>
          <p className="text-[10px] sm:text-xs text-muted-foreground mb-3">{card.subtitle}</p>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span className="text-[10px] sm:text-xs text-primary font-semibold">{card.metric}</span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const AutoScrollShowcaseSection = () => {
  return (
    <section className="relative px-4 sm:px-6 lg:px-8 py-10 sm:py-20 lg:py-28 overflow-hidden">
      <div className="hidden sm:block gradient-orb w-[520px] h-[520px] bg-primary/6 -top-10 right-0" style={{ position: "absolute" }} />
      <div className="absolute inset-0 grid-pattern opacity-[0.05]" />

      <div className="max-w-7xl mx-auto relative z-10">
        <ScrollReveal>
          <div className="text-center mb-6 sm:mb-12">
            <div className="inline-flex items-center gap-2 rounded-full bg-secondary/40 border border-glass-bright px-3 py-1 mb-3">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-[9px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Live Product Highlights
              </span>
            </div>
            <h2 className="font-display text-[22px] sm:text-3xl lg:text-5xl font-bold mb-2 sm:mb-4">
              A real-time view of
              <br />
              <span className="text-gradient">your gym operating system</span>
            </h2>
            <p className="text-[12px] sm:text-sm lg:text-base text-muted-foreground max-w-2xl mx-auto">
              Watch the dashboards, member portals, and automation layers flow together in one system.
            </p>
          </div>
        </ScrollReveal>

        <div className="space-y-4 sm:space-y-6">
          <ScrollReveal>
            <CardRow cards={ownerCards} animationClass="animate-marquee" />
          </ScrollReveal>
          <ScrollReveal>
            <CardRow cards={memberCards} animationClass="animate-marquee-reverse" />
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
};

export default AutoScrollShowcaseSection;
