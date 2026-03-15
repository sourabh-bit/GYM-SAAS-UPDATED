import { Users, Receipt, CalendarDays, TrendingUp, Shield, Dumbbell, Trophy, Bell, BarChart3, Smartphone, Zap, Globe, UserCheck, Activity, Target } from "lucide-react";
import { motion } from "framer-motion";
import ScrollReveal from "../ScrollReveal";

const ownerFeatures = [
  { icon: Users, title: "Member CRM", desc: "Full profiles, subscriptions, automated onboarding.", stat: "2,847 members" },
  { icon: Receipt, title: "Smart Billing", desc: "Recurring payments, auto-invoicing & due alerts.", stat: "₹12.5L/mo" },
  { icon: CalendarDays, title: "Attendance", desc: "One-tap check-in, heatmaps & trend reports.", stat: "156/day" },
  { icon: TrendingUp, title: "Analytics", desc: "Real-time MRR, churn, retention & growth KPIs.", stat: "+23% growth" },
  { icon: UserCheck, title: "Trainers", desc: "Assign members, track schedules & performance.", stat: "15 active" },
  { icon: Bell, title: "Notifications", desc: "Auto-alerts for expiring plans & payments.", stat: "0 missed" },
];

const memberFeatures = [
  { icon: Dumbbell, title: "Workouts", desc: "Log exercises, sets, reps & personal records." },
  { icon: Trophy, title: "Gamification", desc: "Badges, streaks, leaderboards & challenges." },
  { icon: Activity, title: "Progress", desc: "Visual charts, body metrics & achievements." },
  { icon: Target, title: "Goals", desc: "Set targets and track with smart milestones." },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="relative px-4 sm:px-6 lg:px-8 py-10 sm:py-20 lg:py-32">
      <div className="hidden sm:block gradient-orb w-[500px] h-[500px] bg-primary/5 top-20 -left-40" style={{ position: "absolute" }} />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <ScrollReveal>
          <div className="text-center mb-8 sm:mb-16 lg:mb-24">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 mb-3">
              <Zap className="w-3 h-3 text-primary" />
              <span className="text-[9px] sm:text-xs font-semibold text-primary uppercase tracking-wider">Platform Features</span>
            </div>
            <h2 className="font-display text-[22px] sm:text-3xl lg:text-5xl font-bold mb-2 sm:mb-4">
              Built for every role in
              <br />
              <span className="text-gradient">your fitness business</span>
            </h2>
            <p className="text-[12px] sm:text-sm lg:text-base text-muted-foreground max-w-2xl mx-auto">
              Whether you own a gym, work out at one, or manage the platform — FitCore has tools for you.
            </p>
          </div>
        </ScrollReveal>

        {/* ===== GYM OWNER ===== */}
        <div className="mb-10 sm:mb-20 lg:mb-28">
          <ScrollReveal>
            <div className="flex items-center gap-2.5 mb-4 sm:mb-8">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary to-glow-cyan flex items-center justify-center">
                <Dumbbell className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-display text-sm sm:text-xl font-bold">For Gym Owners</h3>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Operations & revenue management</p>
              </div>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
            {ownerFeatures.map((f, i) => (
              <ScrollReveal key={f.title} delay={i * 0.03}>
                <div className="group bg-glass border border-glass-bright rounded-lg sm:rounded-2xl p-3 sm:p-5 lg:p-6 relative overflow-hidden h-full hover:border-primary/20 transition-colors duration-200">
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary to-glow-cyan opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="relative z-10">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-secondary/80 border border-glass flex items-center justify-center mb-2 sm:mb-3">
                      <f.icon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                    </div>
                    <h4 className="font-display font-bold text-[13px] sm:text-base mb-0.5 sm:mb-1.5">{f.title}</h4>
                    <p className="text-[11px] sm:text-sm text-muted-foreground leading-relaxed mb-1.5 sm:mb-2">{f.desc}</p>
                    <div className="flex items-center gap-1">
                      <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-primary" />
                      <span className="text-[9px] sm:text-[11px] text-primary font-medium">{f.stat}</span>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>

        {/* ===== MEMBERS ===== */}
        <div className="mb-10 sm:mb-20 lg:mb-28">
          <ScrollReveal>
            <div className="flex items-center gap-2.5 mb-4 sm:mb-8">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-glow-cyan to-glow-blue flex items-center justify-center">
                <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-display text-sm sm:text-xl font-bold">For Members</h3>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Gamified fitness & progress tracking</p>
              </div>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
            {memberFeatures.map((f, i) => (
              <ScrollReveal key={f.title} delay={i * 0.03}>
                <div className="group bg-glass border border-glass-bright rounded-lg sm:rounded-2xl p-3 sm:p-5 relative overflow-hidden h-full hover:border-glow-cyan/20 transition-colors duration-200">
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-glow-cyan to-glow-blue opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="relative z-10">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-glow-cyan/10 border border-glass flex items-center justify-center mb-2 sm:mb-3">
                      <f.icon className="w-4 h-4 sm:w-5 sm:h-5 text-glow-cyan" />
                    </div>
                    <h4 className="font-display font-bold text-[13px] sm:text-base mb-0.5 sm:mb-1.5">{f.title}</h4>
                    <p className="text-[11px] sm:text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>

        {/* Quick features strip */}
        <ScrollReveal>
          <div className="mt-8 sm:mt-16 grid grid-cols-3 lg:grid-cols-6 gap-1.5 sm:gap-3">
            {[
              { icon: Shield, text: "Role-based access" },
              { icon: BarChart3, text: "PDF/CSV exports" },
              { icon: Smartphone, text: "Mobile-first" },
              { icon: Zap, text: "Instant setup" },
              { icon: Globe, text: "Multi-location" },
              { icon: Bell, text: "Real-time alerts" },
            ].map((f) => (
              <div key={f.text} className="flex flex-col items-center gap-1 sm:gap-2 bg-secondary/20 border border-glass rounded-lg px-2 py-2.5 sm:px-4 sm:py-4 text-center">
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-md sm:rounded-lg bg-primary/10 flex items-center justify-center">
                  <f.icon className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
                </div>
                <span className="text-[8px] sm:text-[11px] text-muted-foreground font-medium leading-tight">{f.text}</span>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default FeaturesSection;
