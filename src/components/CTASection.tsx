import { Button } from "@/components/ui/button";
import { ArrowRight, Dumbbell, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import ScrollReveal from "./ScrollReveal";

const CTASection = () => {
  return (
    <section id="contact" className="px-5 py-10">
      <ScrollReveal direction="scale">
        <div className="relative rounded-3xl overflow-hidden">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-primary opacity-90" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(0,0,0,0.2),transparent_60%)]" />

          <div className="relative z-10 p-7 text-center">
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="inline-flex items-center gap-1.5 bg-primary-foreground/10 border border-primary-foreground/20 rounded-full px-3 py-1.5 mb-4"
            >
              <Sparkles className="w-3 h-3 text-primary-foreground" />
              <span className="text-[10px] font-bold text-primary-foreground uppercase tracking-wider">
                FitCore
              </span>
            </motion.div>

            <h2 className="font-display text-2xl font-extrabold text-primary-foreground mb-3 leading-tight">
              Ready to grow your gym faster?
            </h2>
            <p className="text-sm text-primary-foreground/70 mb-6 leading-relaxed max-w-xs mx-auto">
              Join 500+ gym owners who trust FitCore to manage everything in one place.
            </p>

            <Button
              size="lg"
              className="bg-background text-foreground hover:bg-foreground/90 hover:text-background rounded-xl h-12 gap-2 text-sm font-bold shadow-elevated"
            >
              Start 14-Day Free Trial <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
};

export default CTASection;
