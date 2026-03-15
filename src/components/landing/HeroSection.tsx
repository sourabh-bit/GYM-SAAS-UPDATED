import { Button } from "@/components/ui/button";
import { ArrowRight, Play, CheckCircle2, Shield, Zap, Star, Dumbbell, Users, Crown } from "lucide-react";
import ScrollReveal from "../ScrollReveal";
import { Link } from "react-router-dom";

const roles = [
  { icon: Dumbbell, label: "Gym Owners" },
  { icon: Users, label: "Members" },
  { icon: Crown, label: "Super Admins" },
];

const HeroSection = () => {
  return (
    <section id="home" className="relative pt-16 sm:pt-28 lg:pt-36 pb-10 sm:pb-20 lg:pb-32 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Background - fewer orbs on mobile */}
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
            Run your gym like a
            <br />
            <span className="text-gradient">modern business.</span>
          </h1>
        </ScrollReveal>

        <ScrollReveal>
          <p className="text-center text-[13px] sm:text-base lg:text-lg text-muted-foreground mb-6 sm:mb-10 leading-relaxed max-w-2xl mx-auto">
            FitCore unifies members, payments, progress, and coaching into one premium system that looks as good as it
            performs.
          </p>
        </ScrollReveal>

        {/* CTA buttons */}
        <ScrollReveal>
          <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 justify-center max-w-sm sm:max-w-none mx-auto mb-3">
            <Link to="/signup" className="w-full sm:w-auto">
              <Button variant="glow" size="lg" className="rounded-xl h-11 sm:h-14 px-6 sm:px-10 text-[13px] sm:text-base w-full gap-2 font-semibold">
                Start Free - 14 Days <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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

        {/* Role Chips */}
        <ScrollReveal>
          <div className="mt-5 sm:mt-8 flex flex-wrap items-center justify-center gap-2">
            {roles.map((role) => (
              <div
                key={role.label}
                className="flex items-center gap-2 rounded-full border border-glass-bright bg-glass px-3 py-1 text-[10px] sm:text-xs font-semibold text-muted-foreground"
              >
                <role.icon className="w-3.5 h-3.5 text-primary" />
                {role.label}
              </div>
            ))}
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

