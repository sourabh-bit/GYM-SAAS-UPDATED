import { ReactNode } from "react";
import { motion } from "framer-motion";

export type MemberHeroTone = "success" | "primary" | "muted" | "warning";

export interface MemberHeroChip {
  label: string;
  icon?: ReactNode;
  tone?: MemberHeroTone;
}

interface MemberHeroCardProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  gymName?: string | null;
  chips?: MemberHeroChip[];
  className?: string;
}

const toneStyles: Record<MemberHeroTone, string> = {
  success: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
  primary: "bg-primary/10 border-primary/25 text-primary",
  muted: "bg-secondary/40 border-border/50 text-muted-foreground",
  warning: "bg-amber-500/10 border-amber-500/25 text-amber-400",
};

const MemberHeroCard = ({
  eyebrow,
  title,
  subtitle,
  gymName,
  chips = [],
  className = "",
}: MemberHeroCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-card via-card to-primary/10 px-5 py-6 lg:px-8 lg:py-8 ${className}`}
    >
      <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-16 -bottom-20 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl" />

      <div className="relative z-10">
        <div className="mb-3 flex items-start justify-between gap-3">
          <span className="text-[10px] uppercase tracking-[0.22em] font-bold text-primary/85">{eyebrow}</span>
          {gymName ? (
            <span className="max-w-[60vw] truncate rounded-full border border-primary/30 bg-primary/15 px-4 py-1.5 text-sm font-bold text-primary">
              {gymName}
            </span>
          ) : null}
        </div>

        <h2 className="font-display text-2xl font-bold text-foreground lg:text-4xl">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground lg:text-base">{subtitle}</p>

        {chips.length > 0 ? (
          <div className="mt-5 flex flex-wrap gap-2">
            {chips.map((chip, index) => (
              <div
                key={`${chip.label}-${index}`}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold ${toneStyles[chip.tone || "muted"]}`}
              >
                {chip.icon ? <span className="h-3.5 w-3.5">{chip.icon}</span> : null}
                <span>{chip.label}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </motion.div>
  );
};

export default MemberHeroCard;
