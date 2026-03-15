import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import Navbar from "./Navbar";
import FooterSection from "./FooterSection";

interface LegalPageLayoutProps {
  title: string;
  lastUpdated: string;
  children: ReactNode;
}

const LegalPageLayout = ({ title, lastUpdated, children }: LegalPageLayoutProps) => {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <Navbar />
      <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.04] via-transparent to-background" />
      <div className="hidden sm:block gradient-orb w-[520px] h-[520px] bg-primary/6 -top-32 right-0" style={{ position: "absolute" }} />

      <main className="relative z-10 px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 lg:pt-32 pb-10 sm:pb-16">
        <div className="max-w-4xl mx-auto">
          <div className="mb-4 sm:mb-6">
            <Link to="/" className="text-[11px] sm:text-xs text-muted-foreground hover:text-foreground transition-colors">
              Back to home
            </Link>
          </div>

          <div className="bg-glass border border-glass-bright rounded-2xl sm:rounded-3xl p-5 sm:p-10 shadow-luxury">
            <div className="mb-5 sm:mb-8">
              <h1 className="font-display text-2xl sm:text-4xl font-bold mb-2">{title}</h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Last updated: {lastUpdated}</p>
            </div>

            <div className="space-y-4 text-[12px] sm:text-sm text-muted-foreground leading-relaxed">
              {children}
            </div>
          </div>
        </div>
      </main>

      <FooterSection />
    </div>
  );
};

export default LegalPageLayout;
