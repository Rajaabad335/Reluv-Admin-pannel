"use client";

import { createContext, useContext, useEffect, useState } from "react";

type User = {
  id: number;
  username: string;
  email: string;
  avatar: string
};

type AuthContextType = {
  user: User | null;
  jwt: string | null;
  loading: boolean;
  login: (jwt: string, user: User) => void;
  logout: () => void;
};


const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [jwt, setJwt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load from localStorage on app start
  useEffect(() => {
    const storedJwt = localStorage.getItem("jwt");
    const storedUser = localStorage.getItem("user");

    if (storedJwt && storedUser) {
      setJwt(storedJwt);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const handleLogin = (jwt: string, user: User) => {
    localStorage.setItem("jwt", jwt);
    localStorage.setItem("user", JSON.stringify(user));

    setJwt(jwt);
    setUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem("jwt");
    localStorage.removeItem("user");

    setJwt(null);
    setUser(null);
      window.location.replace("/");
  };

  return (
    <AuthContext.Provider
      value={{ user, jwt, loading, login: handleLogin, logout: handleLogout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
