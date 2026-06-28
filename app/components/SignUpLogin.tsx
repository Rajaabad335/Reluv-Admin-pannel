"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ShieldCheck, AlertCircle } from "lucide-react";
import { BACKEND_URL } from "@/constants";
import { useAuth } from "../context/AuthContext";

export default function AdminLogin() {
  const router = useRouter();
  const { login: setAuthLogin } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailChecked, setEmailChecked] = useState(false);

  // ── Step 1: Validate email is a known admin ─────────────────────────────────
  const handleEmailBlur = async () => {
    if (!email) return;
    setEmailError("");
    setEmailChecked(false);

    try {
      const res = await fetch(
        `${BACKEND_URL}/api/users?filters[email][$eq]=${encodeURIComponent(email)}&filters[accountType][$eq]=admin`,
        {
          headers: {
                "Content-Type": "application/json",
          },
        }
      );
      const data = await res.json();

      if (!data?.length) {
        setEmailError("This email is not registered as an admin. Access denied.");
        setEmailChecked(false);
      } else {
        setEmailChecked(true);
      }
    } catch {
      setEmailError("Could not verify email. Please try again.");
    }
  };

  // ── Step 2: Login ───────────────────────────────────────────────────────────
  const handleLogin = async () => {
    setPasswordError("");
    setLoading(true);

    try {
      const res = await fetch(
        `${BACKEND_URL}/api/auth/local`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier: email, password }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setPasswordError("Incorrect password. Please try again.");
        return;
      }

      // Double-check role on the returned user
      if (data.user?.accountType !== "admin") {
        setPasswordError("This account does not have admin privileges.");
        return;
      }

      localStorage.setItem("jwt", data.jwt);
      setAuthLogin(data.jwt, data.user);
      router.push("/");
    } catch {
      setPasswordError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const isLoginEnabled = emailChecked && password.length > 0;

  return (
    <div className="min-h-screen bg-[#f8fafd] flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.08)] p-8">

          {/* Logo / Brand */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-[#cb6f4d] flex items-center justify-center mb-4 shadow-lg shadow-[#cb6f4d]/30">
              <ShieldCheck size={28} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Admin Portal</h1>
            <p className="text-sm text-gray-400 mt-1">Reluv — Restricted Access</p>
          </div>

          {/* Email Field */}
          <div className="mb-5">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailError("");
                setEmailChecked(false);
              }}
              onBlur={handleEmailBlur}
              placeholder="admin@reluv.com"
              className={`w-full px-4 py-3 rounded-xl border text-sm transition focus:outline-none focus:ring-2 ${
                emailError
                  ? "border-red-300 focus:ring-red-200 bg-red-50"
                  : emailChecked
                  ? "border-green-300 focus:ring-green-200 bg-green-50"
                  : "border-gray-200 focus:ring-[#cb6f4d]/30 focus:border-[#cb6f4d]"
              }`}
            />
            {emailError && (
              <div className="flex items-start gap-2 mt-2">
                <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
                <p className="text-xs text-red-500">{emailError}</p>
              </div>
            )}
            {emailChecked && !emailError && (
              <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500" />
                Admin email verified
              </p>
            )}
          </div>

          {/* Password Field */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && isLoginEnabled && handleLogin()}
                placeholder="Enter your password"
                disabled={!emailChecked}
                className={`w-full px-4 py-3 pr-11 rounded-xl border text-sm transition focus:outline-none focus:ring-2 disabled:bg-gray-50 disabled:text-gray-300 disabled:cursor-not-allowed ${
                  passwordError
                    ? "border-red-300 focus:ring-red-200 bg-red-50"
                    : "border-gray-200 focus:ring-[#cb6f4d]/30 focus:border-[#cb6f4d]"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                disabled={!emailChecked}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:opacity-30"
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
            {passwordError && (
              <div className="flex items-start gap-2 mt-2">
                <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
                <p className="text-xs text-red-500">{passwordError}</p>
              </div>
            )}
          </div>

          {/* Login Button */}
          <button
            onClick={handleLogin}
            disabled={!isLoginEnabled || loading}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-all
              bg-[#cb6f4d] text-white hover:bg-[#b5623f] active:scale-[0.98]
              disabled:bg-gray-100 disabled:text-gray-300 disabled:cursor-not-allowed disabled:shadow-none
              shadow-lg shadow-[#cb6f4d]/25"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Signing in…
              </span>
            ) : (
              "Sign In"
            )}
          </button>

          {/* Footer note */}
          <p className="text-center text-xs text-gray-400 mt-6">
            Only authorized Reluv admins can access this portal.
          </p>
        </div>
      </div>
    </div>
  );
}