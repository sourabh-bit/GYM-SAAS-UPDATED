import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dumbbell, ArrowLeft, Building2, UserCheck } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Role = "owner" | "member";

const Login = () => {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("role") === "member" ? "member" : "owner";
  const [role, setRole] = useState<Role>(initialTab);
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
        { data: isOwnerData, error: ownerRoleError },
        { data: isMemberData, error: memberRoleError },
        { data: isAdminData, error: adminRoleError },
      ] = await Promise.all([
        supabase.rpc("has_role", { _user_id: user.id, _role: "owner" }),
        supabase.rpc("has_role", { _user_id: user.id, _role: "member" }),
        supabase.rpc("has_role", { _user_id: user.id, _role: "super_admin" }),
      ]);

      if (ignore) return;
      if (ownerRoleError || memberRoleError || adminRoleError) return;

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

  const resendVerificationEmail = async (redirectPath: string) => {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: `${window.location.origin}${redirectPath}` },
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
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const { error } = await signIn(normalizedEmail, password);
      if (error) {
        if (error.message?.toLowerCase().includes("email not confirmed")) {
          await resendVerificationEmail(role === "member" ? "/member-login" : "/login");
        } else {
          toast.error(error.message);
        }
        return;
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        toast.error("Authentication failed");
        return;
      }

      const [
        { data: isOwnerData, error: ownerRoleError },
        { data: isMemberData, error: memberRoleError },
        { data: isAdminData, error: adminRoleError },
      ] = await Promise.all([
        supabase.rpc("has_role", { _user_id: user.id, _role: "owner" }),
        supabase.rpc("has_role", { _user_id: user.id, _role: "member" }),
        supabase.rpc("has_role", { _user_id: user.id, _role: "super_admin" }),
      ]);

      if (ownerRoleError || memberRoleError || adminRoleError) {
        toast.error("Could not verify account role. Please try again.");
        await supabase.auth.signOut();
        return;
      }

      const isOwner = !!isOwnerData;
      const isMember = !!isMemberData;
      const isAdmin = !!isAdminData;

      if (isAdmin) {
        navigate("/admin");
        return;
      }

      if (role === "member") {
        if (!isMember) {
          await supabase.auth.signOut();
          if (isOwner) {
            toast.error("This email is a gym owner account. Please use Owner login.");
            setRole("owner");
            navigate("/login?role=owner");
          } else {
            toast.error("This account is not registered as a gym member.");
          }
          return;
        }

        navigate("/member");
        return;
      }

      if (!isOwner) {
        await supabase.auth.signOut();
        if (isMember) {
          toast.error("This email is a gym member account. Please sign in from Member login.");
          setRole("member");
          navigate("/member-login");
        } else {
          toast.error("This account is not a gym owner.");
        }
        return;
      }

      navigate("/dashboard");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
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
          <div className="flex bg-secondary/60 rounded-xl p-1 mb-6 gap-1">
            <button
              type="button"
              onClick={() => {
                setRole("owner");
                setEmail("");
                setPassword("");
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                role === "owner"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Building2 className="w-4 h-4" />
              Gym Owner
            </button>
            <button
              type="button"
              onClick={() => {
                setRole("member");
                setEmail("");
                setPassword("");
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                role === "member"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <UserCheck className="w-4 h-4" />
              Member
            </button>
          </div>

          <h1 className="font-display text-2xl font-bold mb-1">
            {role === "owner" ? "Welcome back" : "Member Login"}
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            {role === "owner"
              ? "Sign in to manage your gym"
              : "Sign in to your member portal"}
          </p>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder={role === "owner" ? "you@gym.com" : "your.email@gmail.com"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 bg-secondary/50 border-glass rounded-xl"
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm">Password</Label>
                <Link
                  to={role === "member" ? "/member-reset-password" : "/reset-password"}
                  className="text-xs text-primary hover:underline"
                >
                  Forgot?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 bg-secondary/50 border-glass rounded-xl"
                required
              />
            </div>
            <Button variant="glow" className="w-full rounded-xl h-11" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <p className="text-sm text-muted-foreground text-center mt-6">
            Don't have an account?{" "}
            <Link
              to={role === "owner" ? "/signup" : "/member-signup"}
              className="text-primary hover:underline font-medium"
            >
              {role === "owner" ? "Start free trial" : "Sign up as member"}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
