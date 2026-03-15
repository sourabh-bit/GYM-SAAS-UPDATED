import { Lock, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface FeatureLockProps {
  title: string;
  description: string;
  ctaLabel?: string;
  ctaPath?: string;
  showCta?: boolean;
}

const FeatureLock = ({
  title,
  description,
  ctaLabel = "Upgrade Plan",
  ctaPath = "/dashboard/settings",
  showCta = true,
}: FeatureLockProps) => {
  const navigate = useNavigate();

  return (
    <div className="bg-card border border-border rounded-2xl p-6 text-center">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto mb-3">
        <Lock className="w-5 h-5 text-destructive" />
      </div>
      <h3 className="font-display text-lg font-bold">{title}</h3>
      <p className="text-sm text-muted-foreground mt-2">{description}</p>
      {showCta && (
        <Button
          className="mt-4 rounded-xl gap-2"
          onClick={() => navigate(ctaPath)}
        >
          <ArrowUpRight className="w-4 h-4" /> {ctaLabel}
        </Button>
      )}
    </div>
  );
};

export default FeatureLock;
