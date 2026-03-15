import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dumbbell, ArrowLeft, UserCheck, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EmailCheckResult {
  exists: boolean;
  member_name?: string;
  gym_name?: string;
  already_registered?: boolean;
}

const MemberSignup = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailCheck, setEmailCheck] = useState<EmailCheckResult | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();

  // Real-time email validation
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes("@")) {
      setEmailCheck(null);
      setCheckingEmail(false);
      return;
    }

    setCheckingEmail(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const { data } = await supabase.functions.invoke("member-signup", {
          body: { email: trimmed, check_only: true },
        });
        setEmailCheck(data as EmailCheckResult);
      } catch {
        setEmailCheck(null);
      } finally {
        setCheckingEmail(false);
      }
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!emailCheck?.exists) {
      toast.error("This email is not registered at any gym. Contact your gym owner.");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("member-signup", {
        body: { email: email.trim(), password, full_name: fullName.trim() },
      });

      if (error) {
        toast.error(data?.error || error.message || "Signup failed");
      } else if (data?.error) {
        toast.error(data.error);
      } else {
        toast.success(data.message || "Account created! Check your email to verify.");
        navigate("/member-login");
      }
    } catch (err: any) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = emailCheck?.exists && fullName.trim() && password.length >= 8 && password === confirmPassword;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 relative overflow-hidden">
      <div className="gradient-orb w-[400px] h-[400px] bg-primary/8 top-0 left-1/2 -translate-x-1/2 animate-pulse-glow" style={{ position: "absolute" }} />
      <div className="absolute inset-0 grid-pattern opacity-20" />

      <div className="w-full max-w-sm relative z-10">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to home
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
          <div className="flex items-center gap-2 mb-2">
            <UserCheck className="w-5 h-5 text-primary" />
            <h1 className="font-display text-2xl font-bold">Member Signup</h1>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Create your account using the email your gym registered for you
          </p>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Email first — so user sees validation immediately */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm">Email</Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`h-11 bg-secondary/50 border-glass rounded-xl pr-10 ${
                    emailCheck?.exists
                      ? "border-primary/50 focus-visible:ring-primary/30"
                      : emailCheck !== null && !emailCheck.exists
                        ? "border-destructive/50 focus-visible:ring-destructive/30"
                        : ""
                  }`}
                  required
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {checkingEmail && <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />}
                  {!checkingEmail && emailCheck?.exists && <CheckCircle2 className="w-4 h-4 text-primary" />}
                  {!checkingEmail && emailCheck !== null && !emailCheck.exists && <XCircle className="w-4 h-4 text-destructive" />}
                </div>
              </div>
              {/* Status messages */}
              {emailCheck?.exists && (
                <div className="bg-primary/10 border border-primary/20 rounded-lg px-3 py-2">
                  <p className="text-xs text-primary font-medium">
                    ✓ Found! You're registered at <span className="font-bold">{emailCheck.gym_name}</span> as <span className="font-bold capitalize">{emailCheck.member_name}</span>
                  </p>
                </div>
              )}
              {emailCheck !== null && !emailCheck.exists && !emailCheck.already_registered && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                  <p className="text-xs text-destructive font-medium">
                    ✗ This email is not registered at any gym. Contact your gym owner to add you first.
                  </p>
                </div>
              )}
              {emailCheck?.already_registered && (
                <div className="bg-glow-gold/10 border border-glow-gold/20 rounded-lg px-3 py-2">
                  <p className="text-xs text-glow-gold font-medium">
                    This email already has an account. <Link to="/login?role=member" className="underline">Log in instead</Link>
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm">Full Name</Label>
              <Input
                id="name"
                placeholder="Your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="h-11 bg-secondary/50 border-glass rounded-xl capitalize"
                required
                disabled={!emailCheck?.exists}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Min 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 bg-secondary/50 border-glass rounded-xl"
                required
                disabled={!emailCheck?.exists}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm" className="text-sm">Confirm Password</Label>
              <Input
                id="confirm"
                type="password"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-11 bg-secondary/50 border-glass rounded-xl"
                required
                disabled={!emailCheck?.exists}
              />
            </div>
            <Button variant="glow" className="w-full rounded-xl h-11" disabled={loading || !canSubmit}>
              {loading ? "Creating account..." : "Create Member Account"}
            </Button>
          </form>

          <p className="text-sm text-muted-foreground text-center mt-6">
            Already have an account?{" "}
            <Link to="/login?role=member" className="text-primary hover:underline font-medium">Sign in</Link>
          </p>
          <p className="text-xs text-muted-foreground text-center mt-3">
            Are you a gym owner?{" "}
            <Link to="/signup" className="text-primary hover:underline">Sign up here</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default MemberSignup;
