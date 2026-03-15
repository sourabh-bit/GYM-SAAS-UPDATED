import { Dumbbell, Mail, MapPin, Phone } from "lucide-react";
import { Link } from "react-router-dom";

const footerLinks = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "#pricing" },
    { label: "Demo", href: "/demo", isRoute: true },
    { label: "FAQ", href: "#faq" },
  ],
  Company: [
    { label: "About", href: "#" },
    { label: "Blog", href: "#" },
    { label: "Careers", href: "#" },
    { label: "Contact", href: "#" },
  ],
  Legal: [
    { label: "Privacy", href: "#" },
    { label: "Terms", href: "#" },
    { label: "Security", href: "#" },
  ],
};

const FooterSection = () => {
  return (
    <footer className="relative px-5 sm:px-6 lg:px-8 py-10 sm:py-12 lg:py-16 border-t border-glass pb-28 sm:pb-24 lg:pb-16">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-6 sm:gap-8 lg:gap-12 mb-8 sm:mb-12">
          {/* Brand */}
          <div className="col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-3 sm:mb-4">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                <Dumbbell className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary-foreground" />
              </div>
              <span className="font-display text-base sm:text-lg font-bold">
                Fit<span className="text-gradient">Core</span>
              </span>
            </Link>
            <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed max-w-[220px] mb-3 sm:mb-4">
              The all-in-one gym management platform for modern fitness businesses.
            </p>
            <div className="space-y-1.5 sm:space-y-2">
              <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground">
                <Mail className="w-3 h-3 text-primary" />
                <span>hello@fitcore.app</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground">
                <Phone className="w-3 h-3 text-primary" />
                <span>+91 98765 43210</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground">
                <MapPin className="w-3 h-3 text-primary" />
                <span>Bangalore, India</span>
              </div>
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="font-display font-bold text-xs sm:text-sm mb-3 sm:mb-4">{title}</h4>
              <ul className="space-y-2 sm:space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    {(link as any).isRoute ? (
                      <Link
                        to={link.href}
                        className="text-[11px] sm:text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {link.label}
                      </Link>
                    ) : (
                      <a
                        href={link.href}
                        className="text-[11px] sm:text-xs text-muted-foreground hover:text-foreground transition-colors"
                        onClick={(e) => {
                          if (link.href.startsWith("#")) {
                            e.preventDefault();
                            document.querySelector(link.href)?.scrollIntoView({ behavior: "smooth" });
                          }
                        }}
                      >
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-glass pt-4 sm:pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          <p className="text-[10px] sm:text-xs text-muted-foreground">
            © {new Date().getFullYear()} FitCore. All rights reserved.
          </p>
          <div className="flex gap-3 sm:gap-4">
            {["Twitter", "LinkedIn", "Instagram", "YouTube"].map((social) => (
              <a key={social} href="#" className="text-[10px] sm:text-xs text-muted-foreground hover:text-primary transition-colors">
                {social}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default FooterSection;

