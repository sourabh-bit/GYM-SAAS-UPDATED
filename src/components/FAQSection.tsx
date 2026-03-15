import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import ScrollReveal from "./ScrollReveal";

const faqs = [
  { q: "How long is the free trial?", a: "Our free trial lasts 14 days with full access to all features. No credit card required to get started." },
  { q: "Can I manage multiple gym locations?", a: "Yes! Our Pro and Enterprise plans support multi-location management from a single dashboard." },
  { q: "What payment processors do you support?", a: "We support Razorpay for UPI, cards, and netbanking with secure checkout and autopay." },
  { q: "Is my data secure?", a: "Absolutely. We use 256-bit encryption and SOC 2 compliant servers to keep your data safe." },
  { q: "Can I migrate from another system?", a: "Yes, our team will help you migrate your data from any existing system completely free of charge." },
  { q: "Do members get separate accounts?", a: "Yes! Members get their own app to track workouts, book classes, and manage subscriptions." },
];

const FAQSection = () => {
  return (
    <section className="px-5 py-10 relative">
      <div className="gradient-orb w-40 h-40 bg-glow-blue/8 bottom-0 right-0 animate-pulse-glow" style={{ position: "absolute" }} />

      <ScrollReveal>
        <p className="text-xs text-primary font-bold uppercase tracking-[0.2em] mb-2 text-center">
          FAQ
        </p>
        <h2 className="font-display text-2xl font-bold text-center mb-8">
          Frequently asked<br />questions
        </h2>
      </ScrollReveal>

      <ScrollReveal delay={0.15}>
        <Accordion type="single" collapsible className="space-y-2">
          {faqs.map((faq, i) => (
            <AccordionItem
              key={i}
              value={`item-${i}`}
              className="bg-glass border border-glass-bright rounded-xl px-4 overflow-hidden"
            >
              <AccordionTrigger className="text-sm font-semibold py-4 hover:no-underline text-left">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground pb-4 leading-relaxed">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </ScrollReveal>
    </section>
  );
};

export default FAQSection;
