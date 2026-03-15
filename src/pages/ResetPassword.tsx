import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dumbbell, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const ResetPassword = () => {
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const { resetPassword, updatePassword } = useAuth();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setIsRecovery(true);
    }
  }, []);

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const { error } = await resetPassword(email.trim().toLowerCase());
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Check your email for the reset link!");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      const { error } = await updatePassword(newPassword);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Password updated! You can now sign in.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 relative overflow-hidden">
      <div className="gradient-orb w-[400px] h-[400px] bg-primary/8 top-0 left-1/2 -translate-x-1/2 animate-pulse-glow" style={{ position: "absolute" }} />
      <div className="absolute inset-0 grid-pattern opacity-20" />

      <div className="w-full max-w-sm relative z-10">
        <Link to="/login" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to login
        </Link>

        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
            <Dumbbell className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-display text-2xl font-bold">
            Fit<span className="text-gradient">Core</span>
          </span>
        </div>

        <div className="bg-glass border border-glass-bright rounded-2xl p-6 sm:p-8 shadow-luxury">
          <h1 className="font-display text-2xl font-bold mb-2">
            {isRecovery ? "Set new password" : "Reset password"}
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            {isRecovery ? "Enter your new password below" : "Enter your email and we'll send a reset link"}
          </p>

          {isRecovery ? (
            <form className="space-y-4" onSubmit={handleUpdatePassword}>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm">New Password</Label>
                <Input id="password" type="password" placeholder="Min 8 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="h-11 bg-secondary/50 border-glass rounded-xl" required />
              </div>
              <Button variant="glow" className="w-full rounded-xl h-11" disabled={loading}>
                {loading ? "Updating..." : "Update Password"}
              </Button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={handleResetRequest}>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm">Email</Label>
                <Input id="email" type="email" placeholder="you@gym.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 bg-secondary/50 border-glass rounded-xl" required />
              </div>
              <Button variant="glow" className="w-full rounded-xl h-11" disabled={loading}>
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
