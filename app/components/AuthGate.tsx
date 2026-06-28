"use client";

import { useAuth } from "../context/AuthContext";
import AdminLogin from "../components/SignUpLogin";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (!user) {
    return <AdminLogin />;
  }

  return <>{children}</>;
}
