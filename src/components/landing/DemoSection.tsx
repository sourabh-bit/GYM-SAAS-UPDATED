import { Button } from "@/components/ui/button";
import { ArrowRight, BarChart3, Users, CreditCard, CalendarCheck, Play, Trophy, Dumbbell, Activity, Sparkles } from "lucide-react";
import ScrollReveal from "../ScrollReveal";
import { Link } from "react-router-dom";

const demoTabs = [
  {
    category: "Owner Dashboard",
    color: "text-primary",
    items: [
      { icon: BarChart3, title: "Analytics", desc: "Revenue & KPIs" },
      { icon: Users, title: "Members", desc: "CRM & subscriptions" },
      { icon: CreditCard, title: "Billing", desc: "Payments & invoices" },
      { icon: CalendarCheck, title: "Attendance", desc: "Check-in reports" },
    ],
  },
  {
    category: "Member Portal",
    color: "text-glow-cyan",
    items: [
      { icon: Dumbbell, title: "Workouts", desc: "Exercise & plans" },
      { icon: Trophy, title: "Achievements", desc: "Badges & XP" },
      { icon: Activity, title: "Progress", desc: "Visual charts & body metrics" },
      { icon: Sparkles, title: "Gamification", desc: "Streaks, leaderboards & challenges" },
    ],
  },
];

const DemoSection = () => {
  return (
    <section id="demo" className="relative px-4 sm:px-6 lg:px-8 py-10 sm:py-20 lg:py-28 overflow-hidden">
      <div className="hidden sm:block gradient-orb w-[500px] h-[500px] bg-primary/5 top-0 left-1/2 -translate-x-1/2" style={{ position: "absolute" }} />

      <div className="max-w-5xl mx-auto relative z-10">
        <ScrollReveal>
          <div className="text-center mb-6 sm:mb-12">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 mb-3">
              <Play className="w-3 h-3 text-primary" />
              <span className="text-[9px] sm:text-xs font-semibold text-primary uppercase tracking-wider">Live Demo</span>
            </div>
            <h2 className="font-display text-[22px] sm:text-3xl lg:text-5xl font-bold mb-2 sm:mb-4">
              See it in action -
              <br />
              <span className="text-gradient">every role, every dashboard</span>
            </h2>
            <p className="text-[12px] sm:text-sm lg:text-base text-muted-foreground max-w-lg mx-auto">
              Explore owner and member portals with real data. No signup needed.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal>
          <div className="bg-glass border border-glass-bright rounded-xl sm:rounded-3xl p-4 sm:p-8 shadow-luxury relative overflow-hidden">
            <div className="relative z-10 space-y-4 sm:space-y-8">
              {demoTabs.map((tab) => (
                <div key={tab.category}>
                  <h4 className={`font-display text-[13px] sm:text-base font-bold mb-2 sm:mb-3 ${tab.color}`}>{tab.category}</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                    {tab.items.map((p) => (
                      <div
                        key={p.title}
                        className="flex items-center sm:items-start gap-2 sm:gap-2.5 p-2.5 sm:p-4 rounded-lg sm:rounded-xl bg-secondary/30 border border-glass"
                      >
                        <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-md sm:rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <p.icon className={`w-3.5 h-3.5 sm:w-5 sm:h-5 ${tab.color}`} />
                        </div>
                        <div className="min-w-0">
                          <h5 className="font-display text-[12px] sm:text-sm font-semibold">{p.title}</h5>
                          <p className="text-[9px] sm:text-xs text-muted-foreground leading-snug">{p.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="text-center pt-1 sm:pt-2">
                <Link to="/demo">
                  <Button variant="glow" size="lg" className="rounded-xl h-10 sm:h-13 px-6 sm:px-10 text-[13px] sm:text-base gap-2 w-full sm:w-auto">
                    Launch Full Demo <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </Button>
                </Link>
                <p className="text-[9px] sm:text-xs text-muted-foreground mt-2">Owner + Member portals · Real data · No account required</p>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default DemoSection;



