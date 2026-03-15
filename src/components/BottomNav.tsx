import { Home, LayoutGrid, CreditCard, MessageSquare, HelpCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";

const navItems = [
  { icon: Home, label: "Home", id: "home" },
  { icon: LayoutGrid, label: "Features", id: "features" },
  { icon: CreditCard, label: "Pricing", id: "pricing" },
  { icon: MessageSquare, label: "Reviews", id: "testimonials" },
  { icon: HelpCircle, label: "FAQ", id: "faq" },
];

const BottomNav = () => {
  const [active, setActive] = useState("home");
  const [visible, setVisible] = useState(true);
  const [lastScroll, setLastScroll] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const current = window.scrollY;
      setVisible(current < lastScroll || current < 50);
      setLastScroll(current);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScroll]);

  const handleClick = (id: string) => {
    setActive(id);
    if (id === "home") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      const el = document.getElementById(id);
      el?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <motion.nav
      initial={{ y: 0 }}
      animate={{ y: visible ? 0 : 100 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-2 pt-1 lg:hidden"
    >
      <div className="bg-glass-strong border border-glass-bright rounded-2xl px-2 py-2 shadow-elevated mx-auto max-w-md">
        <div className="flex items-center justify-around relative">
          {navItems.map((item) => {
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleClick(item.id)}
                className="relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all z-10"
              >
                {isActive && (
                  <motion.div
                    layoutId="navBg"
                    className="absolute inset-0 bg-primary/15 rounded-xl"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <motion.div
                  animate={isActive ? { scale: 1.15, y: -2 } : { scale: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <item.icon
                    className={`w-5 h-5 transition-colors duration-200 ${
                      isActive ? "text-primary" : "text-muted-foreground"
                    }`}
                  />
                </motion.div>
                <span
                  className={`text-[9px] font-semibold tracking-wide transition-colors duration-200 ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {item.label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="navDot"
                    className="absolute -top-1 w-1 h-1 rounded-full bg-gradient-primary"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </motion.nav>
  );
};

export default BottomNav;
