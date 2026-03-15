import { Users, CreditCard, CalendarCheck, BarChart3, Dumbbell, ClipboardList } from "lucide-react";
import { motion } from "framer-motion";
import ScrollReveal from "./ScrollReveal";
import { useRef, useState } from "react";

const gymTypes = ["Commercial Gyms", "CrossFit Boxes", "Strength Training", "Personal Training", "Fitness Chains"];

const features = [
  { icon: Users, label: "Member check-ins", desc: "Track every visit" },
  { icon: CreditCard, label: "Subscription billing", desc: "Auto-payments" },
  { icon: CalendarCheck, label: "Workout plans", desc: "Custom routines" },
  { icon: BarChart3, label: "Reports & analytics", desc: "Real-time data" },
  { icon: Dumbbell, label: "Equipment tracking", desc: "Asset management" },
  { icon: ClipboardList, label: "Assessments", desc: "Member progress" },
];

const GymTypesSection = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeType, setActiveType] = useState(0);

  return (
    <section className="py-10 relative overflow-hidden">
      <div className="gradient-orb w-40 h-40 bg-glow-blue/10 bottom-10 right-0 animate-pulse-glow" style={{ position: "absolute" }} />

      <div className="px-5">
        <ScrollReveal>
          <p className="text-xs text-primary font-bold uppercase tracking-[0.2em] mb-2">
            Built for Everyone
          </p>
          <h2 className="font-display text-2xl font-bold mb-5">
            Built for every kind of gym
          </h2>
        </ScrollReveal>
      </div>

      {/* Scrollable gym type chips */}
      <ScrollReveal delay={0.1}>
        <div
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto px-5 pb-4 scrollbar-hide"
        >
          {gymTypes.map((type, i) => (
            <motion.button
              key={type}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveType(i)}
              className={`flex-shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-300 border ${
                activeType === i
                  ? "bg-gradient-primary text-primary-foreground border-transparent glow-shadow-sm"
                  : "bg-glass border-glass-bright text-foreground"
              }`}
            >
              {type}
            </motion.button>
          ))}
        </div>
      </ScrollReveal>

      {/* Features grid card */}
      <div className="px-5 mt-2">
        <ScrollReveal delay={0.2} direction="scale">
          <div className="bg-glass border border-glass-bright rounded-3xl p-5 shadow-elevated relative overflow-hidden">
            {/* Subtle gradient overlay */}
            <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

            <h3 className="font-display text-lg font-bold mb-1.5 relative z-10">
              Everything gym owners need
            </h3>
            <p className="text-sm text-muted-foreground mb-5 relative z-10">
              All tools in one platform. Zero hassle.
            </p>

            <div className="grid grid-cols-2 gap-2.5 relative z-10">
              {features.map((f, i) => (
                <motion.div
                  key={f.label}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 * i }}
                  whileTap={{ scale: 0.97 }}
                  className="bg-secondary/60 border border-glass rounded-xl px-3 py-3 group cursor-default"
                >
                  <f.icon className="w-4 h-4 text-primary mb-1.5 group-hover:scale-110 transition-transform" />
                  <p className="text-xs font-semibold leading-tight">{f.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{f.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default GymTypesSection;
