import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import type { Role } from "./types";

export function RequireAuth({ roles }: { roles?: Role[] }) {
  const { role } = useAuth();
  if (!role) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(role)) return <Navigate to={`/${role.toLowerCase()}`} replace />;
  return <Outlet />;
}
