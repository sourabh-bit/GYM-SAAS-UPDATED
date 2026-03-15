import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Dumbbell, Users, Crown } from "lucide-react";
import { motion } from "framer-motion";
import ScrollReveal from "../ScrollReveal";
import { Link } from "react-router-dom";

const CTASection = () => {
  return (
    <section className="relative px-4 sm:px-6 lg:px-8 py-10 sm:py-20 lg:py-32 overflow-hidden">
      <div className="hidden sm:block gradient-orb w-[700px] h-[700px] bg-primary/6 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ position: "absolute" }} />

      <div className="max-w-4xl mx-auto relative z-10">
        <ScrollReveal>
          <div className="bg-glass border border-glass-bright rounded-xl sm:rounded-3xl p-5 sm:p-10 lg:p-16 text-center shadow-luxury relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-primary via-glow-cyan to-glow-gold" />

            {/* Role icons */}
            <div className="flex justify-center gap-2.5 sm:gap-3 mb-5 sm:mb-8 relative z-10">
              {[
                { icon: Dumbbell, color: "from-primary to-glow-cyan" },
                { icon: Users, color: "from-glow-cyan to-glow-blue" },
                { icon: Crown, color: "from-glow-gold to-primary" },
              ].map((r, i) => (
                <div
                  key={i}
                  className={`w-9 h-9 sm:w-14 sm:h-14 rounded-lg sm:rounded-2xl bg-gradient-to-br ${r.color} flex items-center justify-center`}
                >
                  <r.icon className="w-4 h-4 sm:w-7 sm:h-7 text-primary-foreground" />
                </div>
              ))}
            </div>

            <h2 className="font-display text-[20px] sm:text-3xl lg:text-5xl font-bold mb-2 sm:mb-4 relative z-10">
              Ready to unify
              <br />
              <span className="text-gradient">your fitness ecosystem?</span>
            </h2>

            <p className="text-[12px] sm:text-base lg:text-lg text-muted-foreground mb-4 sm:mb-6 max-w-lg mx-auto relative z-10">
              One platform for owners, members & admins — start free today.
            </p>

            <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mb-5 sm:mb-8 relative z-10">
              {["No credit card", "14-day trial", "Cancel anytime"].map((item) => (
                <div key={item} className="flex items-center gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-primary" />
                  <span className="text-[9px] sm:text-xs text-muted-foreground">{item}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center relative z-10 max-w-sm sm:max-w-none mx-auto">
              <Link to="/signup" className="w-full sm:w-auto">
                <Button variant="glow" size="lg" className="rounded-xl h-10 sm:h-14 px-6 sm:px-10 text-[13px] sm:text-base gap-2 w-full font-semibold">
                  Start Free Trial <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </Button>
              </Link>
              <Link to="/demo" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="rounded-xl h-10 sm:h-14 px-6 sm:px-10 text-[13px] sm:text-base border-glass-bright bg-glass hover:bg-secondary/50 w-full font-semibold">
                  Explore Demo
                </Button>
              </Link>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default CTASection;
