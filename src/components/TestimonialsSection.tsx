import { Star, Quote } from "lucide-react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import ScrollReveal from "./ScrollReveal";
import { useState } from "react";

const testimonials = [
  {
    name: "Suresh Chetty",
    role: "Owner, FitCore Gym",
    text: "FitCore completely transformed the way we manage our gym. The member retention improved by 35% in the first quarter.",
    rating: 5,
    avatar: "SC",
  },
  {
    name: "Manisha Malini",
    role: "Owner, Ironblaze Temple",
    text: "The analytics from FitCore's dashboard are worth the price alone. We finally understand our gym's performance metrics.",
    rating: 5,
    avatar: "MM",
  },
  {
    name: "Priyil Patil",
    role: "Manager, Peak Performance",
    text: "Smooth daily operations. Our trainers love the scheduling features and the member app is incredibly sleek.",
    rating: 5,
    avatar: "PP",
  },
];

const TestimonialsSection = () => {
  const [current, setCurrent] = useState(0);

  return (
    <section id="reviews" className="py-10 relative overflow-hidden">
      <div className="gradient-orb w-48 h-48 bg-primary/10 top-0 left-0 animate-pulse-glow" style={{ position: "absolute" }} />

      <div className="px-5">
        <ScrollReveal>
          <p className="text-xs text-primary font-bold uppercase tracking-[0.2em] mb-2 text-center">
            Testimonials
          </p>
          <h2 className="font-display text-2xl font-bold text-center mb-2">
            Loved by <span className="text-gradient">gym owners</span>
          </h2>
          <p className="text-sm text-muted-foreground text-center mb-8">
            Join 500+ gyms already using FitCore
          </p>
        </ScrollReveal>
      </div>

      {/* Swipeable testimonials */}
      <div className="px-5">
        <div className="space-y-3">
          {testimonials.map((t, i) => (
            <ScrollReveal key={t.name} delay={i * 0.15}>
              <motion.div
                whileTap={{ scale: 0.98 }}
                className="bg-glass border border-glass-bright rounded-2xl p-5 relative overflow-hidden shadow-elevated"
              >
                <Quote className="absolute top-4 right-4 w-8 h-8 text-primary/10" />

                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="w-3.5 h-3.5 fill-primary text-primary" />
                  ))}
                </div>

                <p className="text-sm text-foreground/80 leading-relaxed mb-4 relative z-10">
                  "{t.text}"
                </p>

                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-primary flex items-center justify-center">
                    <span className="text-xs font-bold text-primary-foreground">{t.avatar}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-[11px] text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
