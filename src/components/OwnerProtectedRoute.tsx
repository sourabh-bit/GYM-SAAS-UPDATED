import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { ReactNode, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const OwnerProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  const [checking, setChecking] = useState(true);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    const checkRole = async () => {
      if (!user) {
        setChecking(false);
        return;
      }

      const [{ data: ownerData }, { data: adminData }] = await Promise.all([
        supabase.rpc("has_role", { _user_id: user.id, _role: "owner" }),
        supabase.rpc("has_role", { _user_id: user.id, _role: "super_admin" }),
      ]);

      setIsOwner(!!ownerData || !!adminData);
      setChecking(false);
    };
    if (!loading) checkRole();
  }, [user, loading]);

  if (loading || checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!isOwner) return <Navigate to="/member" replace />;

  return <>{children}</>;
};

export default OwnerProtectedRoute;
