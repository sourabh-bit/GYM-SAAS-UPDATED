import { Users, Receipt, CalendarDays, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import ScrollReveal from "./ScrollReveal";

const features = [
  {
    icon: Users,
    title: "Member Management",
    desc: "Track memberships, attendance, and profiles with powerful automation tools.",
    gradient: "from-primary/20 to-glow-cyan/10",
  },
  {
    icon: Receipt,
    title: "Billing Operations",
    desc: "Automate recurring payments, invoices, and subscription management effortlessly.",
    gradient: "from-glow-cyan/20 to-glow-blue/10",
  },
  {
    icon: CalendarDays,
    title: "Class Scheduling",
    desc: "Schedule classes, manage trainers, and let members book with one tap.",
    gradient: "from-glow-blue/20 to-primary/10",
  },
  {
    icon: TrendingUp,
    title: "Analytics Dashboard",
    desc: "Real-time insights on revenue, retention, and gym performance metrics.",
    gradient: "from-primary/20 to-primary/5",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="px-5 py-10 relative">
      <div className="gradient-orb w-52 h-52 bg-primary/10 top-20 -left-20 animate-pulse-glow" style={{ position: "absolute" }} />

      <ScrollReveal>
        <p className="text-xs text-primary font-bold uppercase tracking-[0.2em] mb-2 text-center">
          Features
        </p>
        <h2 className="font-display text-2xl font-bold text-center mb-2">
          Everything you need
          <br />
          <span className="text-gradient">to grow</span>
        </h2>
        <p className="text-sm text-muted-foreground text-center mb-8 max-w-xs mx-auto">
          Powerful tools designed for modern gym management.
        </p>
      </ScrollReveal>

      <div className="space-y-3">
        {features.map((f, i) => (
          <ScrollReveal key={f.title} delay={i * 0.1} direction={i % 2 === 0 ? "left" : "right"}>
            <motion.div
              whileTap={{ scale: 0.98 }}
              className="bg-glass border border-glass-bright rounded-2xl p-5 relative overflow-hidden shadow-elevated"
            >
              {/* Gradient accent */}
              <div className={`absolute top-0 left-0 right-0 h-20 bg-gradient-to-b ${f.gradient} pointer-events-none`} />

              <div className="relative z-10 flex gap-4 items-start">
                <div className="w-11 h-11 rounded-xl bg-secondary/80 border border-glass flex items-center justify-center flex-shrink-0">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-display font-bold text-[15px] mb-1">{f.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              </div>
            </motion.div>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
};

export default FeaturesSection;
