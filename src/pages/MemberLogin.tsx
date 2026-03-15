import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dumbbell, ArrowLeft, UserCheck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const MemberLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading || !user) return;
    let ignore = false;
    const redirectIfAuthed = async () => {
      const [
        { data: isMemberData, error: memberRoleError },
        { data: isOwnerData, error: ownerRoleError },
        { data: isAdminData, error: adminRoleError },
      ] = await Promise.all([
        supabase.rpc("has_role", { _user_id: user.id, _role: "member" }),
        supabase.rpc("has_role", { _user_id: user.id, _role: "owner" }),
        supabase.rpc("has_role", { _user_id: user.id, _role: "super_admin" }),
      ]);

      if (ignore) return;
      if (memberRoleError || ownerRoleError || adminRoleError) return;

      if (isAdminData) {
        navigate("/admin", { replace: true });
        return;
      }
      if (isOwnerData) {
        navigate("/dashboard", { replace: true });
        return;
      }
      if (isMemberData) {
        navigate("/member", { replace: true });
      }
    };

    void redirectIfAuthed();
    return () => {
      ignore = true;
    };
  }, [authLoading, navigate, user]);

  const resendVerificationEmail = async () => {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: `${window.location.origin}/member-login` },
    });

    if (error) {
      toast.error("Email not verified and resend failed. Please try again in a minute.");
      return;
    }

    toast.success("Verification email sent again. Please check inbox/spam.");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    const { error } = await signIn(email.trim(), password);
    if (error) {
      if (error.message?.toLowerCase().includes("email not confirmed")) {
        await resendVerificationEmail();
      } else {
        toast.error(error.message);
      }
      setLoading(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Authentication failed");
      setLoading(false);
      return;
    }

    const [
      { data: isMemberData, error: memberRoleError },
      { data: isOwnerData, error: ownerRoleError },
      { data: isAdminData, error: adminRoleError },
    ] = await Promise.all([
      supabase.rpc("has_role", { _user_id: user.id, _role: "member" }),
      supabase.rpc("has_role", { _user_id: user.id, _role: "owner" }),
      supabase.rpc("has_role", { _user_id: user.id, _role: "super_admin" }),
    ]);

    if (memberRoleError || ownerRoleError || adminRoleError) {
      await supabase.auth.signOut();
      toast.error("Could not verify account role. Please try again.");
      setLoading(false);
      return;
    }

    const isMember = !!isMemberData;
    const isOwner = !!isOwnerData;
    const isAdmin = !!isAdminData;

    if (!isMember) {
      await supabase.auth.signOut();
      if (isAdmin) {
        toast.error("This account is a super admin account. Use admin login.");
        navigate("/login?role=owner");
      } else if (isOwner) {
        toast.error("This email is for gym owner login. Please sign in from Owner login.");
        navigate("/login?role=owner");
      } else {
        toast.error("This login is for gym members only.");
      }
      setLoading(false);
      return;
    }

    setLoading(false);
    navigate("/member");
  };

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
            <h1 className="font-display text-2xl font-bold">Member Login</h1>
          </div>
          <p className="text-sm text-muted-foreground mb-6">Sign in to your member portal</p>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm">Email</Label>
              <Input id="email" type="email" placeholder="your.email@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 bg-secondary/50 border-glass rounded-xl" required />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm">Password</Label>
                <Link to="/member-reset-password" className="text-xs text-primary hover:underline">Forgot password?</Link>
              </div>
              <Input id="password" type="password" placeholder="********" value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 bg-secondary/50 border-glass rounded-xl" required />
            </div>
            <Button variant="glow" className="w-full rounded-xl h-11" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <p className="text-sm text-muted-foreground text-center mt-6">
            Don't have an account?{" "}
            <Link to="/member-signup" className="text-primary hover:underline font-medium">Sign up</Link>
          </p>
          <p className="text-xs text-muted-foreground text-center mt-3">
            Are you a gym owner?{" "}
            <Link to="/login" className="text-primary hover:underline">Login here</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default MemberLogin;
