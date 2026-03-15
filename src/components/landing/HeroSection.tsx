import { Button } from "@/components/ui/button";
import { ArrowRight, Play, CheckCircle2, Shield, Zap, Star, Dumbbell, Users, BarChart3, Trophy, Crown } from "lucide-react";
import { motion } from "framer-motion";
import ScrollReveal from "../ScrollReveal";
import { Link } from "react-router-dom";

const roles = [
  {
    icon: Dumbbell,
    label: "Gym Owners",
    desc: "Automate billing, track attendance, manage members",
    color: "from-primary to-glow-cyan",
  },
  {
    icon: Users,
    label: "Members",
    desc: "Gamified workouts, streaks, leaderboards & XP",
    color: "from-glow-cyan to-glow-blue",
  },
  {
    icon: Crown,
    label: "Super Admins",
    desc: "Multi-gym oversight, health metrics, platform control",
    color: "from-glow-gold to-primary",
  },
];

const HeroSection = () => {
  return (
    <section id="home" className="relative pt-16 sm:pt-28 lg:pt-36 pb-10 sm:pb-20 lg:pb-32 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Background — fewer orbs on mobile */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] via-transparent to-background" />
      <div className="gradient-orb w-[250px] sm:w-[700px] h-[250px] sm:h-[700px] bg-primary/8 -top-32 left-1/2 -translate-x-1/2" style={{ position: "absolute" }} />
      <div className="hidden sm:block gradient-orb w-[400px] h-[400px] bg-glow-cyan/6 bottom-0 -right-20" style={{ position: "absolute" }} />
      <div className="absolute inset-0 grid-pattern opacity-[0.05] sm:opacity-[0.08]" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Badge */}
        <ScrollReveal>
          <div className="flex justify-center mb-4 sm:mb-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-glass border border-glass-bright px-3 py-1.5 sm:px-4 sm:py-2 backdrop-blur-sm">
              <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-gradient-primary" />
              </span>
              <span className="text-[9px] sm:text-xs font-semibold text-muted-foreground tracking-wide">
                #1 All-in-One Gym Management Platform
              </span>
            </div>
          </div>
        </ScrollReveal>

        {/* Headline */}
        <ScrollReveal>
          <h1 className="font-display text-center text-[26px] sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight mb-3 sm:mb-6">
            One platform for
            <br />
            <span className="text-gradient">every fitness role.</span>
          </h1>
        </ScrollReveal>

        <ScrollReveal>
          <p className="text-center text-[13px] sm:text-base lg:text-lg text-muted-foreground mb-6 sm:mb-10 leading-relaxed max-w-2xl mx-auto">
            Owners manage operations. Members track progress. Admins oversee everything. 
            FitCore connects your entire gym ecosystem in one intelligent platform.
          </p>
        </ScrollReveal>

        {/* CTA buttons */}
        <ScrollReveal>
          <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 justify-center max-w-sm sm:max-w-none mx-auto mb-3">
            <Link to="/signup" className="w-full sm:w-auto">
              <Button variant="glow" size="lg" className="rounded-xl h-11 sm:h-14 px-6 sm:px-10 text-[13px] sm:text-base w-full gap-2 font-semibold">
                Start Free — 14 Days <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </Button>
            </Link>
            <Link to="/demo" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="rounded-xl h-11 sm:h-14 px-6 sm:px-10 gap-2 text-[13px] sm:text-base border-glass-bright bg-glass/80 hover:bg-secondary/50 w-full font-semibold">
                <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" /> Explore Live Demo
              </Button>
            </Link>
          </div>
          <p className="text-center text-[9px] sm:text-xs text-muted-foreground">No credit card · Cancel anytime · Setup in 5 minutes</p>
        </ScrollReveal>

        {/* Role Cards */}
        <ScrollReveal>
          <div className="mt-8 sm:mt-16 lg:mt-20 grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4 lg:gap-6">
            {roles.map((role, i) => (
              <motion.div
                key={role.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                className="group relative bg-glass border border-glass-bright rounded-xl sm:rounded-2xl p-4 sm:p-6 overflow-hidden shadow-elevated hover:border-primary/20 transition-colors duration-300"
              >
                <div className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${role.color}`} />
                
                <div className="relative z-10 flex sm:block items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-secondary/80 border border-glass flex items-center justify-center sm:mb-3 flex-shrink-0">
                    <role.icon className="w-4.5 h-4.5 sm:w-6 sm:h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-sm sm:text-lg mb-0.5 sm:mb-1">{role.label}</h3>
                    <p className="text-[12px] sm:text-sm text-muted-foreground leading-relaxed">{role.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </ScrollReveal>

        {/* Dashboard Preview */}
        <ScrollReveal>
          <div className="mt-8 sm:mt-14 lg:mt-16 relative">
            <div className="hidden sm:block absolute -inset-6 lg:-inset-8 bg-primary/[0.03] rounded-3xl blur-3xl" />
            
            <div className="relative bg-glass border border-glass-bright rounded-xl sm:rounded-3xl p-3 sm:p-6 lg:p-8 shadow-luxury overflow-hidden">
              {/* Browser chrome */}
              <div className="flex items-center justify-between mb-3 sm:mb-6">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-destructive/50" />
                  <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-glow-gold/50" />
                  <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-primary/50" />
                </div>
                <span className="text-[8px] sm:text-[10px] text-muted-foreground font-mono">fitcore.app/dashboard</span>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-3 sm:mb-6">
                {[
                  { label: "Members", value: "2,847", change: "+12%", icon: Users, color: "text-primary" },
                  { label: "Check-ins", value: "156", change: "+8%", icon: BarChart3, color: "text-glow-cyan" },
                  { label: "Revenue", value: "₹12.5L", change: "+23%", icon: Trophy, color: "text-glow-gold" },
                  { label: "Retention", value: "87%", change: "+5%", icon: Star, color: "text-primary" },
                ].map((stat, i) => (
                  <div
                    key={stat.label}
                    className="bg-secondary/40 rounded-lg sm:rounded-xl p-2.5 sm:p-4 border border-glass"
                  >
                    <div className="flex items-center gap-1 mb-1">
                      <stat.icon className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${stat.color}`} />
                      <span className="text-[7px] sm:text-[10px] text-primary font-semibold">{stat.change}</span>
                    </div>
                    <p className={`text-base sm:text-xl lg:text-2xl font-bold font-display ${stat.color}`}>{stat.value}</p>
                    <p className="text-[7px] sm:text-[10px] text-muted-foreground mt-0.5">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Chart */}
              <div className="bg-secondary/30 rounded-lg sm:rounded-xl p-3 sm:p-5 border border-glass">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <span className="text-[9px] sm:text-xs text-muted-foreground font-medium">Revenue Trend</span>
                  <span className="text-[8px] sm:text-[10px] text-primary font-mono font-semibold">+23% YoY</span>
                </div>
                <div className="flex items-end gap-1 sm:gap-2 h-12 sm:h-20 lg:h-24">
                  {[25, 38, 32, 48, 42, 58, 52, 68, 62, 78, 72, 92].map((h, i) => (
                    <motion.div
                      key={i}
                      initial={{ height: 0 }}
                      whileInView={{ height: `${h}%` }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.04, duration: 0.4, ease: "easeOut" }}
                      className="flex-1 rounded-sm sm:rounded-md bg-gradient-primary opacity-60"
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Trust bar */}
        <ScrollReveal>
          <div className="mt-6 sm:mt-14 flex flex-wrap gap-x-4 sm:gap-x-8 gap-y-1.5 justify-center items-center">
            {[
              { icon: Shield, text: "Bank-grade encryption" },
              { icon: Zap, text: "500+ gyms" },
              { icon: Star, text: "4.9/5 rating" },
              { icon: CheckCircle2, text: "99.9% uptime" },
            ].map((b) => (
              <div key={b.text} className="flex items-center gap-1">
                <b.icon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary" />
                <span className="text-[9px] sm:text-xs text-muted-foreground font-medium">{b.text}</span>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default HeroSection;
