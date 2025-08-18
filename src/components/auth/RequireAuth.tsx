import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";

export default function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="p-6 text-sm">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  return children;
}

