import ScrollReveal from "../ScrollReveal";
import { BadgeCheck, Brain, CreditCard, Database, LineChart, Lock, Shield, Users } from "lucide-react";

const ownerDepth = [
  { title: "Unified member profiles", detail: "Plans, attendance, payments, and notes in one place." },
  { title: "Smart payment engine", detail: "Autopay, dunning, and invoice automation." },
  { title: "Trainer workflows", detail: "Assign programs, track sessions, and measure impact." },
];

const memberDepth = [
  { title: "AI workout assistant", detail: "Instant programs, meal ideas, and form guidance." },
  { title: "Progress analytics", detail: "Body metrics, personal records, and trend charts." },
  { title: "Motivation loops", detail: "Streaks, badges, and challenges that keep members engaged." },
];

const platformDepth = [
  { icon: Lock, title: "Multi-tenant isolation", desc: "RLS-first design keeps gyms isolated." },
  { icon: Shield, title: "Secure by default", desc: "Role checks and policy guards on every query." },
  { icon: Database, title: "Analytics ready", desc: "Optimized indexes and fast dashboards." },
];

const FeatureDepthSection = () => {
  return (
    <section className="relative px-4 sm:px-6 lg:px-8 py-10 sm:py-20 lg:py-28 overflow-hidden">
      <div className="hidden sm:block gradient-orb w-[520px] h-[520px] bg-primary/6 bottom-0 -right-24" style={{ position: "absolute" }} />

      <div className="max-w-7xl mx-auto relative z-10">
        <ScrollReveal>
          <div className="text-center mb-6 sm:mb-12">
            <div className="inline-flex items-center gap-2 rounded-full bg-secondary/40 border border-glass-bright px-3 py-1 mb-3">
              <BadgeCheck className="w-3 h-3 text-primary" />
              <span className="text-[9px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">Depth</span>
            </div>
            <h2 className="font-display text-[22px] sm:text-3xl lg:text-5xl font-bold mb-2 sm:mb-4">
              Built for depth,
              <br />
              <span className="text-gradient">not just surface features</span>
            </h2>
            <p className="text-[12px] sm:text-sm lg:text-base text-muted-foreground max-w-2xl mx-auto">
              Every workflow is engineered to scale from the first member to thousands.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <ScrollReveal>
            <div className="bg-glass border border-glass-bright rounded-2xl p-4 sm:p-6 h-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-glow-cyan flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-display text-sm sm:text-base font-bold">Owner Operations</h3>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Everything needed to run the gym</p>
                </div>
              </div>
              <div className="space-y-3">
                {ownerDepth.map((item) => (
                  <div key={item.title} className="bg-secondary/30 border border-glass rounded-xl p-3">
                    <p className="text-[12px] sm:text-sm font-semibold">{item.title}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">{item.detail}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  { icon: CreditCard, label: "Billing" },
                  { icon: LineChart, label: "Analytics" },
                  { icon: Users, label: "CRM" },
                ].map((tag) => (
                  <div
                    key={tag.label}
                    className="flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-[10px] text-primary"
                  >
                    <tag.icon className="w-3 h-3" />
                    {tag.label}
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal>
            <div className="bg-glass border border-glass-bright rounded-2xl p-4 sm:p-6 h-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-glow-cyan to-glow-blue flex items-center justify-center">
                  <Brain className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-display text-sm sm:text-base font-bold">Member Experience</h3>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Designed to keep members engaged</p>
                </div>
              </div>
              <div className="space-y-3">
                {memberDepth.map((item) => (
                  <div key={item.title} className="bg-secondary/30 border border-glass rounded-xl p-3">
                    <p className="text-[12px] sm:text-sm font-semibold">{item.title}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">{item.detail}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {["AI Coach", "Progress", "Challenges"].map((label) => (
                  <span
                    key={label}
                    className="rounded-full bg-secondary/60 border border-glass-bright px-3 py-1 text-[10px] text-muted-foreground font-medium"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </div>

        <ScrollReveal>
          <div className="mt-6 sm:mt-10 grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-5">
            {platformDepth.map((item) => (
              <div key={item.title} className="bg-secondary/30 border border-glass rounded-xl p-4 flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <item.icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h4 className="font-display text-sm font-semibold">{item.title}</h4>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default FeatureDepthSection;
