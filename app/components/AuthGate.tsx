"use client";

import { useAuth } from "../context/AuthContext";
import SignUpLogin from "../components/SignUpLogin";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return null; // or spinner
  }

  if (!user) {
    return <SignUpLogin onClose={() => {}} />;
  }

  return <>{children}</>;
}
