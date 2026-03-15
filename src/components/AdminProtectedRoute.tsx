import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { ReactNode, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const AdminProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkRole = async () => {
      if (!user) {
        setChecking(false);
        return;
      }

      const { data, error } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "super_admin",
      });

      setIsAdmin(!!data && !error);
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
  if (!isAdmin) return <Navigate to="/login" replace />;

  return <>{children}</>;
};

export default AdminProtectedRoute;
