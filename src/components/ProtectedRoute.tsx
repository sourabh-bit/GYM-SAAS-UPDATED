import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { ReactNode, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  const [checking, setChecking] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [redirectPath, setRedirectPath] = useState("/login?role=member");

  useEffect(() => {
    const checkRole = async () => {
      if (!user) {
        setChecking(false);
        return;
      }

      const [
        { data: memberRole, error: memberRoleError },
        { data: ownerRole, error: ownerRoleError },
        { data: adminRole, error: adminRoleError },
      ] = await Promise.all([
        supabase.rpc("has_role", { _user_id: user.id, _role: "member" }),
        supabase.rpc("has_role", { _user_id: user.id, _role: "owner" }),
        supabase.rpc("has_role", { _user_id: user.id, _role: "super_admin" }),
      ]);

      const hasRoleError = memberRoleError || ownerRoleError || adminRoleError;
      if (hasRoleError) {
        setIsMember(false);
        setRedirectPath("/login?role=member");
        setChecking(false);
        return;
      }

      const member = !!memberRole;
      const owner = !!ownerRole;
      const admin = !!adminRole;

      setIsMember(member);
      if (!member) {
        if (admin) setRedirectPath("/admin");
        else if (owner) setRedirectPath("/dashboard");
        else setRedirectPath("/login?role=member");
      }

      setChecking(false);
    };

    if (!loading) {
      void checkRole();
    }
  }, [loading, user]);

  if (loading || checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login?role=member" replace />;
  if (!isMember) return <Navigate to={redirectPath} replace />;

  return <>{children}</>;
};

export default ProtectedRoute;
