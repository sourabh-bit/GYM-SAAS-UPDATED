import { Activity, CalendarCheck, CreditCard, Dumbbell, Sparkles, Users } from "lucide-react";
import { motion } from "framer-motion";
import ScrollReveal from "../ScrollReveal";

const featureCards = [
  {
    title: "Member CRM",
    desc: "Manage profiles, memberships, renewals, and member history in one place.",
    metric: "All member data unified",
    icon: Users,
  },
  {
    title: "Smart Billing",
    desc: "Automate invoices, recurring payments, due alerts, and payment tracking.",
    metric: "Faster collections",
    icon: CreditCard,
  },
  {
    title: "Attendance Tracking",
    desc: "Track daily check-ins, peak hours, and attendance trends across your gym.",
    metric: "Live check-in insights",
    icon: CalendarCheck,
  },
  {
    title: "Workout Logs",
    desc: "Let members log workouts, monitor routines, and stay consistent over time.",
    metric: "Better member adherence",
    icon: Dumbbell,
  },
  {
    title: "Progress Tracking",
    desc: "Visualize strength and body progress with measurable goals and milestones.",
    metric: "Clear growth visibility",
    icon: Activity,
  },
  {
    title: "Gamification",
    desc: "Boost engagement with challenges, streaks, badges, and leaderboards.",
    metric: "Higher member motivation",
    icon: Sparkles,
  },
];

const FeatureCard = ({
  title,
  desc,
  metric,
  icon: Icon,
}: {
  title: string;
  desc: string;
  metric: string;
  icon: typeof Users;
}) => (
  <motion.div
    whileHover={{ y: -4 }}
    className="bg-glass border border-glass-bright rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 relative overflow-hidden shadow-elevated h-full flex flex-col"
  >
    <div className="inline-flex items-center gap-1 bg-primary/10 rounded-full px-2 py-0.5 mb-3 self-start">
      <Icon className="w-2.5 h-2.5 text-primary" />
      <span className="text-[9px] sm:text-[10px] font-semibold text-primary">{metric}</span>
    </div>

    <h3 className="text-[18px] sm:text-xl font-display font-semibold mb-2">{title}</h3>
    <p className="text-[13px] sm:text-sm text-muted-foreground leading-relaxed flex-1">{desc}</p>

    <div className="pt-3 mt-3 border-t border-glass text-[10px] sm:text-xs text-primary/80 font-medium">
      Included in FitCore platform
    </div>
  </motion.div>
);

const TestimonialsSection = () => {
  const mobileLoopCards = [...featureCards, ...featureCards];

  return (
    <section id="testimonials" className="relative px-5 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-28">
      <div className="max-w-7xl mx-auto relative z-10">
        <ScrollReveal>
          <div className="text-center mb-8 sm:mb-10 lg:mb-16">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 mb-3 sm:mb-4">
              <Sparkles className="w-3 h-3 text-primary" />
              <span className="text-[10px] sm:text-xs font-semibold text-primary uppercase tracking-wider">Core Features</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl lg:text-5xl font-bold mb-3 sm:mb-4">
              Built for real <span className="text-gradient">gym operations</span>
            </h2>
            <p className="text-[13px] sm:text-sm lg:text-base text-muted-foreground max-w-lg mx-auto px-2">
              The feature stack gym owners and members use every day.
            </p>
          </div>
        </ScrollReveal>

        <div className="lg:hidden -mx-5 px-5 overflow-hidden">
          <motion.div
            className="flex gap-3 w-max pb-2"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 28, ease: "linear", repeat: Infinity }}
          >
            {mobileLoopCards.map((f, i) => (
              <div key={`${f.title}-${i}`} className="shrink-0 w-[280px] sm:w-[300px]">
                <FeatureCard {...f} />
              </div>
            ))}
          </motion.div>
        </div>

        <div className="hidden lg:grid lg:grid-cols-3 lg:gap-6">
          {featureCards.map((f, i) => (
            <ScrollReveal key={f.title} delay={i * 0.08}>
              <FeatureCard {...f} />
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
