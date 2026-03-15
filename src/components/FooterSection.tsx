import { Dumbbell } from "lucide-react";
import ScrollReveal from "./ScrollReveal";

const FooterSection = () => {
  return (
    <footer className="px-5 pt-8 pb-28 border-t border-glass">
      <ScrollReveal>
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
            <Dumbbell className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-lg">FitCore</span>
        </div>
        <p className="text-xs text-muted-foreground mb-6 leading-relaxed max-w-xs">
          The complete gym management platform built for growth. Trusted by 500+ gyms worldwide.
        </p>
      </ScrollReveal>

      <ScrollReveal delay={0.1}>
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { title: "Product", links: ["Features", "Pricing", "Integrations"] },
            { title: "Company", links: ["About", "Blog", "Careers"] },
            { title: "Support", links: ["Help Center", "Contact", "Privacy"] },
          ].map((col) => (
            <div key={col.title}>
              <p className="text-xs font-bold mb-3 text-foreground/80">{col.title}</p>
              {col.links.map((l) => (
                <p key={l} className="text-xs text-muted-foreground mb-2 hover:text-primary transition-colors cursor-pointer">
                  {l}
                </p>
              ))}
            </div>
          ))}
        </div>
      </ScrollReveal>

      <div className="border-t border-glass pt-4">
        <p className="text-[11px] text-muted-foreground text-center">
          © 2026 FitCore. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default FooterSection;

