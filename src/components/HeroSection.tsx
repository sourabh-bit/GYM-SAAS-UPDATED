import { Button } from "@/components/ui/button";
import { Play, Shield, Zap, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import ScrollReveal from "./ScrollReveal";

const HeroSection = () => {
  return (
    <section id="home" className="relative px-5 pt-14 pb-10 overflow-hidden">
      {/* Gradient orbs */}
      <div className="gradient-orb w-64 h-64 bg-primary/20 -top-20 -right-20 animate-pulse-glow" style={{ position: "absolute" }} />
      <div className="gradient-orb w-48 h-48 bg-glow-cyan/15 top-40 -left-16 animate-pulse-glow" style={{ position: "absolute", animationDelay: "1.5s" }} />

      {/* Badge */}
      <ScrollReveal delay={0.1}>
        <div className="inline-flex items-center gap-2 rounded-full bg-glass border border-glass-bright px-4 py-2 mb-6">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-gradient-primary" />
          </span>
          <span className="text-xs font-medium text-muted-foreground">
            #1 Gym Management Software
          </span>
        </div>
      </ScrollReveal>

      {/* Headline */}
      <ScrollReveal delay={0.2}>
        <h1 className="font-display text-[2.5rem] font-bold leading-[1.1] tracking-tight mb-4">
          Run your gym
          <br />
          <span className="text-gradient">with precision.</span>
        </h1>
      </ScrollReveal>

      <ScrollReveal delay={0.3}>
        <p className="text-[15px] text-muted-foreground mb-7 leading-relaxed max-w-xs">
          Manage members, check-ins, payments, and analytics from one platform built for modern gyms.
        </p>
      </ScrollReveal>

      {/* CTA Buttons */}
      <ScrollReveal delay={0.4}>
        <div className="flex gap-3 mb-8">
          <Button variant="glow" size="lg" className="flex-1 rounded-xl h-12 text-sm">
            Start Free Trial
          </Button>
          <Button variant="outline" size="lg" className="flex-1 rounded-xl h-12 gap-2 text-sm border-glass-bright bg-glass">
            <Play className="w-4 h-4 fill-current" /> Watch Demo
          </Button>
        </div>
      </ScrollReveal>

      {/* Stats Dashboard */}
      <ScrollReveal delay={0.5} direction="scale">
        <div className="bg-glass border border-glass-bright rounded-2xl p-4 shadow-elevated">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Total Members", value: "2,847", color: "text-primary" },
              { label: "Check-ins", value: "156", color: "text-glow-cyan" },
              { label: "Revenue", value: "₹12.5L", color: "text-foreground" },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + i * 0.1 }}
                className="text-center"
              >
                <p className={`text-xl font-bold font-display ${stat.color}`}>{stat.value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{stat.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Mini chart visualization */}
          <div className="flex items-end gap-1 justify-center mt-4 h-10">
            {[40, 55, 35, 65, 50, 75, 60, 80, 70, 90, 85, 95].map((h, i) => (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                transition={{ delay: 1 + i * 0.05, duration: 0.4, ease: "easeOut" }}
                className="w-2 rounded-full bg-gradient-primary opacity-70"
              />
            ))}
          </div>
        </div>
      </ScrollReveal>

      {/* Trust badges */}
      <ScrollReveal delay={0.7}>
        <div className="flex flex-wrap gap-4 justify-center mt-6">
          {[
            { icon: Shield, text: "Secure & reliable" },
            { icon: Zap, text: "500+ Gyms" },
            { icon: BarChart3, text: "99.9% uptime" },
          ].map((badge) => (
            <div key={badge.text} className="flex items-center gap-1.5">
              <badge.icon className="w-3.5 h-3.5 text-primary" />
              <span className="text-[11px] text-muted-foreground font-medium">{badge.text}</span>
            </div>
          ))}
        </div>
      </ScrollReveal>
    </section>
  );
};

export default HeroSection;
