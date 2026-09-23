import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export function useAuthGuard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/signin");
    } else if (!loading && user) {
      // Ensure authenticated users go to dashboard
      const currentPath = window.location.pathname;
      if (
        currentPath === "/signin" ||
        currentPath === "/" ||
        currentPath === "/signup"
      ) {
        navigate("/dashboard");
      }
    }
  }, [user, loading, navigate]);

  return { user, loading };
}
