import { motion, useInView } from "framer-motion";
import { useRef, ReactNode } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

interface ScrollRevealProps {
  children: ReactNode;
  delay?: number;
  direction?: "up" | "left" | "right" | "scale";
  className?: string;
}

const ScrollReveal = ({ children, delay = 0, direction = "up", className = "" }: ScrollRevealProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-30px" });
  const isMobile = useIsMobile();

  // Minimal animations on mobile
  const mobileVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0 },
  };

  const desktopVariants = {
    up: {
      hidden: { opacity: 0, y: 30 },
      visible: { opacity: 1, y: 0 },
    },
    left: {
      hidden: { opacity: 0, x: -30 },
      visible: { opacity: 1, x: 0 },
    },
    right: {
      hidden: { opacity: 0, x: 30 },
      visible: { opacity: 1, x: 0 },
    },
    scale: {
      hidden: { opacity: 0, scale: 0.95 },
      visible: { opacity: 1, scale: 1 },
    },
  };

  const variants = isMobile ? mobileVariants : desktopVariants[direction];
  const mobileDelay = isMobile ? Math.min(delay, 0.1) : delay;

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={variants}
      transition={{ duration: isMobile ? 0.35 : 0.5, delay: mobileDelay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export default ScrollReveal;
