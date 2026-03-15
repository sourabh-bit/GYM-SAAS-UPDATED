import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dumbbell } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [visible, setVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const currentY = window.scrollY;
      setScrolled(currentY > 20);
      setVisible(currentY < lastScrollY || currentY < 50);
      setLastScrollY(currentY);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [lastScrollY]);

  const navLinks = [
    { label: "Features", href: "#features" },
    { label: "Demo", href: "/demo", isRoute: true },
    { label: "Pricing", href: "#pricing" },
    { label: "Testimonials", href: "#testimonials" },
    { label: "FAQ", href: "#faq" },
  ];

  const handleNavClick = (href: string) => {
    const el = document.querySelector(href);
    el?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: visible ? 0 : -100 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-glass-strong border-b border-glass" : ""
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 lg:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-gradient-primary flex items-center justify-center">
              <Dumbbell className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
            </div>
            <span className="font-display text-lg sm:text-xl font-bold tracking-tight">
              Fit<span className="text-gradient">Core</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) =>
              link.isRoute ? (
                <Link
                  key={link.href}
                  to={link.href}
                  className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-secondary/50"
                >
                  {link.label}
                </Link>
              ) : (
                <button
                  key={link.href}
                  onClick={() => handleNavClick(link.href)}
                  className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-secondary/50"
                >
                  {link.label}
                </button>
              )
            )}
          </nav>

          {/* CTA - visible on all sizes */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link to="/login?role=member" className="hidden sm:block">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground text-xs sm:text-sm">
                Member Login
              </Button>
            </Link>
            <Link to="/login" className="hidden sm:block">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground text-xs sm:text-sm">
                Log in
              </Button>
            </Link>
            <Link to="/signup">
              <Button variant="glow" size="sm" className="rounded-lg sm:rounded-xl px-4 sm:px-6 text-xs sm:text-sm h-8 sm:h-9">
                Start Free
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </motion.header>
  );
};

export default Navbar;
