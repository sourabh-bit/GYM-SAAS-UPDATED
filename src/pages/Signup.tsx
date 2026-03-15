import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dumbbell, ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const Signup = () => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gymName, setGymName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      const { error } = await signUp(
        email.trim().toLowerCase(),
        password,
        `${firstName} ${lastName}`.trim(),
        gymName.trim(),
      );
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Account created! Please check your email to verify your account.");
        navigate("/login");
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
          <h1 className="font-display text-2xl font-bold mb-2">Create your account</h1>
          <p className="text-sm text-muted-foreground mb-6">Start your 14-day free trial</p>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="first" className="text-sm">First name</Label>
                <Input id="first" placeholder="John" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="h-11 bg-secondary/50 border-glass rounded-xl capitalize" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last" className="text-sm">Last name</Label>
                <Input id="last" placeholder="Doe" value={lastName} onChange={(e) => setLastName(e.target.value)} className="h-11 bg-secondary/50 border-glass rounded-xl capitalize" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="gym" className="text-sm">Gym name</Label>
              <Input id="gym" placeholder="Your gym name" value={gymName} onChange={(e) => setGymName(e.target.value)} className="h-11 bg-secondary/50 border-glass rounded-xl capitalize" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm">Email</Label>
              <Input id="email" type="email" placeholder="you@gym.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 bg-secondary/50 border-glass rounded-xl" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm">Password</Label>
              <Input id="password" type="password" placeholder="Min 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 bg-secondary/50 border-glass rounded-xl" required />
            </div>
            <Button variant="glow" className="w-full rounded-xl h-11" disabled={loading}>
              {loading ? "Creating..." : "Create Account"}
            </Button>
          </form>

          <p className="text-sm text-muted-foreground text-center mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
