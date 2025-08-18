import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";

export default function RequireApproved({ children }: { children: JSX.Element }) {
  const { user, loading, claims } = useAuth();

  if (loading) return <div className="p-6 text-sm">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  const ok = !!claims?.approved;
  if (!ok) {
    return (
      <div className="p-6 text-sm">
        Your account is not approved yet. Please contact an administrator.
      </div>
    );
  }

  return children;
}

