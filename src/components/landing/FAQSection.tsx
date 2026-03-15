import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";
import ScrollReveal from "../ScrollReveal";

const faqs = [
  { q: "What is FitCore?", a: "FitCore is an all-in-one gym management platform that helps gym owners manage members, billing, attendance, trainers, and analytics. It also gives members a gamified fitness experience with workout tracking, badges, leaderboards, and progress insights." },
  { q: "How long is the free trial?", a: "You get a full 14-day free trial with access to all Pro features. No credit card required to start." },
  { q: "Can I manage multiple locations?", a: "Yes! Our Enterprise plan supports multi-gym management with a centralized super admin dashboard to oversee all locations." },
  { q: "Is FitCore mobile-friendly?", a: "Absolutely. FitCore is built mobile-first so gym owners and members can access everything from their phones seamlessly." },
  { q: "How does gamification work?", a: "Members earn XP, badges, and levels by completing workouts, maintaining streaks, and achieving milestones. Weekly and monthly leaderboards add a competitive social layer." },
  { q: "Can I export reports?", a: "Yes, you can export financial reports, member lists, and analytics as CSV or PDF files with one click." },
  { q: "Is my data secure?", a: "We use bank-grade encryption, row-level security, and role-based access control to ensure your data stays safe and private." },
  { q: "What payments are supported?", a: "FitCore supports Razorpay for UPI, cards, and netbanking, plus cash payment tracking." },
];

const FAQSection = () => {
  return (
    <section id="faq" className="relative px-5 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-28">
      <div className="max-w-3xl mx-auto relative z-10">
        <ScrollReveal>
          <div className="text-center mb-6 sm:mb-10 lg:mb-16">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 mb-3 sm:mb-4">
              <HelpCircle className="w-3 h-3 text-primary" />
              <span className="text-[10px] sm:text-xs font-semibold text-primary uppercase tracking-wider">FAQ</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl lg:text-5xl font-bold mb-3 sm:mb-4">
              Frequently asked <span className="text-gradient">questions</span>
            </h2>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <Accordion type="single" collapsible className="space-y-2 sm:space-y-3">
            {faqs.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`item-${i}`}
                className="bg-glass border border-glass-bright rounded-lg sm:rounded-xl px-4 sm:px-5 data-[state=open]:border-primary/20 transition-all"
              >
                <AccordionTrigger className="text-[13px] sm:text-sm lg:text-base font-display font-semibold hover:no-underline py-3 sm:py-4 text-left">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-[13px] sm:text-sm text-muted-foreground pb-3 sm:pb-4 leading-relaxed">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default FAQSection;
