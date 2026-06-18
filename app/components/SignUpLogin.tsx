'use client';

import { X, EyeOff, Eye, Loader2, AlertCircle, WifiOff, XCircle } from "lucide-react";
import Image from "next/image";
import { useState, useEffect, useCallback, useRef } from "react";
import { login, register, loginWithGoogle, verifyOtp, sendOtp, forgotPasswordSendOtp, forgotPasswordVerifyOtp, forgotPasswordReset,  } from "../services/auth-service";
import { useAuth } from "../context/AuthContext";
import { BACKEND_URL, NEXT_PUBLIC_GOOGLE_CLIENT_ID, NEXT_PUBLIC_LINE_CHANNEL_ID } from "../../constants";

const GOOGLE_CLIENT_ID = NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
const API = BACKEND_URL ?? "";
const LINE_CHANNEL_ID = NEXT_PUBLIC_LINE_CHANNEL_ID ?? ""; // Added Line Channel ID

type View =
  | "initial"
  | "login"
  | "register"
  | "otp"
  | "forgot-password"
  | "reset-otp"
  | "new-password";
// ─── Error types ───────────────────────────────────────────────────────────

type AuthErrorKind = "network" | "auth" | "cancelled" | "unknown";
interface AuthError {
  kind: AuthErrorKind;
  message: string;
}

function classifyError(err: any): AuthError {
  const msg: string = err?.message || "";
  if (
    !navigator.onLine ||
    msg.toLowerCase().includes("network") ||
    msg.toLowerCase().includes("fetch")
  )
    return {
      kind: "network",
      message:
        "No internet connection. Please check your network and try again.",
    };
  if (
    msg.toLowerCase().includes("cancel") ||
    msg.toLowerCase().includes("closed")
  )
    return {
      kind: "cancelled",
      message: "Sign-in was cancelled. Try again when you're ready.",
    };
  if (
    msg.toLowerCase().includes("invalid") ||
    msg.toLowerCase().includes("credentials") ||
    msg.toLowerCase().includes("password") ||
    msg.toLowerCase().includes("user not found") ||
    msg.toLowerCase().includes("email")
  )
    return {
      kind: "auth",
      message: msg || "Incorrect email or password. Please try again.",
    };
  if (
    msg.toLowerCase().includes("already") ||
    msg.toLowerCase().includes("exists")
  )
    return {
      kind: "auth",
      message:
        "An account with this email already exists. Try logging in instead.",
    };
  return {
    kind: "unknown",
    message: msg || "Something went wrong. Please try again.",
  };
}

function openPopup(url: string, title: string) {
  const w = 500,
    h = 600;
  const left = window.screenX + (window.outerWidth - w) / 2;
  const top = window.screenY + (window.outerHeight - h) / 2;
  return window.open(
    url,
    title,
    `width=${w},height=${h},left=${left},top=${top}`,
  );
}

function ErrorBanner({
  error,
  onDismiss,
}: {
  error: AuthError;
  onDismiss: () => void;
}) {
  const icons: Record<AuthErrorKind, React.ReactNode> = {
    network: <WifiOff size={15} className="shrink-0 mt-0.5" />,
    auth: <XCircle size={15} className="shrink-0 mt-0.5" />,
    cancelled: <AlertCircle size={15} className="shrink-0 mt-0.5" />,
    unknown: <AlertCircle size={15} className="shrink-0 mt-0.5" />,
  };
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-md px-3 py-2.5 text-xs font-medium bg-red-50 text-red-700 border border-red-200 animate-in fade-in slide-in-from-top-1 duration-200"
    >
      {icons[error.kind]}
      <span className="flex-1 leading-snug">{error.message}</span>
      <button
        type="button"
        onClick={onDismiss}
        className="text-red-400 hover:text-red-600 transition-colors ml-1 mt-0.5"
        aria-label="Dismiss error"
      >
        <X size={13} />
      </button>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────
export default function SignUpLogin({
  onClose,
  initialView = "initial",
  message,
}: {
  onClose: () => void;
  initialView?: "initial" | "login" | "register";
  message?: string;
})  {
  const { login: setAuthLogin } = useAuth();
  const [view, setView] = useState<View>(initialView);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [resetOtp, setResetOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
 const [loadingProvider, setLoadingProvider] = useState<
    "email" | "google" | "facebook" | "line" | null
  >(null);
  const isBusy = loadingProvider !== null;

  const [authError, setAuthError] = useState<AuthError | null>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showError = useCallback((err: AuthError) => {
    setAuthError(err);
    if (err.kind !== "network") {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
      errorTimerRef.current = setTimeout(() => setAuthError(null), 6000);
    }
  }, []);

  const dismissError = useCallback(() => {
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    setAuthError(null);
  }, []);

  useEffect(() => {
    dismissError();
  }, [view, dismissError]);
  useEffect(() => {
    if (authError) dismissError();
  }, [email, password, username, dismissError]);
  useEffect(
    () => () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    },
    [],
  );

  // ── Google Sign-In ────────────────────────────────────────────────────────
  const handleGoogleLogin = useCallback(() => {
    setLoadingProvider("google");
    dismissError();
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: `${window.location.origin}/auth/callback/google`,
      response_type: "token",
      scope: "openid email profile address phone",
      prompt: "select_account",
    });
    const popup = openPopup(
      `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
      "Google Sign-In",
    );
    if (!popup) {
      showError({
        kind: "unknown",
        message:
          "Popup was blocked. Please allow popups for this site and try again.",
      });
      setLoadingProvider(null);
      return;
    }
    const handler = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== "GOOGLE_AUTH_SUCCESS") return;
      window.removeEventListener("message", handler);
      clearInterval(poll);
      try {
        const data = await loginWithGoogle(event.data.token);
        setAuthLogin(data.jwt, data.user);
        popup.close();
        onClose();
      } catch (err: any) {
        showError(classifyError(err));
      } finally {
        setLoadingProvider(null);
      }
    };
    window.addEventListener("message", handler);
    const poll = setInterval(() => {
      if (popup.closed) {
        clearInterval(poll);
        window.removeEventListener("message", handler);
        setLoadingProvider(() => null);
      }
    }, 500);
  }, [setAuthLogin, onClose, showError, dismissError]);

   // ── Line Login ───────────────────────────────────────────────────────────
  const handleLineLogin = useCallback(() => {
    setLoadingProvider("line");
    dismissError();
    const params = new URLSearchParams({
      response_type: "code",
      client_id: LINE_CHANNEL_ID,
      redirect_uri: `${window.location.origin}/auth/callback/line`,
      state: "line_auth_state", 
      scope: "openid profile email",
    });
    const popup = openPopup(
      `https://access.line.me/oauth2/v2.1/authorize?${params}`,
      "Line Sign-In",
    );
    if (!popup) {
      showError({
        kind: "unknown",
        message:
          "Popup was blocked. Please allow popups for this site and try again.",
      });
      setLoadingProvider(null);
      return;
    }
    const handler = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== "LINE_AUTH_SUCCESS") return;
      window.removeEventListener("message", handler);
      clearInterval(poll);
      try {
        // Calls your backend/Strapi endpoint using the retrieved OAuth code
        const data = await loginWithLine(event.data.code);
        setAuthLogin(data.jwt, data.user);
        popup.close();
        onClose();
      } catch (err: any) {
        showError(classifyError(err));
      } finally {
        setLoadingProvider(null);
      }
    };
    window.addEventListener("message", handler);
    const poll = setInterval(() => {
      if (popup.closed) {
        clearInterval(poll);
        window.removeEventListener("message", handler);
        setLoadingProvider(() => null);
      }
    }, 500);
  }, [setAuthLogin, onClose, showError, dismissError]);
  // ── Email Login / Register ─────────────────────────────────────────────────
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoadingProvider("email");
    dismissError();
    try {
      const data = await login(email, password);
      setAuthLogin(data.jwt, data.user);
      onClose();
    } catch (err: any) {
      showError(classifyError(err));
    } finally {
      setLoadingProvider(null);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoadingProvider("email");
    dismissError();
    try {
      const data = await register(username, email, password);
      setAuthLogin(data.jwt, data.user);
      onClose();
    } catch (err: any) {
      showError(classifyError(err));
    } finally {
      setLoadingProvider(null);
    }
  }
   async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoadingProvider("email");
    dismissError();
    try {
      const data = await verifyOtp(email, otp);
      setAuthLogin(data.jwt, data.user);
      onClose();
    } catch (err: any) {
      showError(classifyError(err));
    } finally {
      setLoadingProvider(null);
    }
  }

  async function handleResendOtp() {
    setLoadingProvider("email");
    dismissError();
    try {
      await sendOtp(email, username, password);
    } catch (err: any) {
      showError(classifyError(err));
    } finally {
      setLoadingProvider(null);
    }
  }

  // ── Forgot Password ───────────────────────────────────────────────────────
  async function handleForgotSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoadingProvider("email");
    dismissError();
    try {
      await forgotPasswordSendOtp(email);
      setView("reset-otp");
    } catch (err: any) {
      showError(classifyError(err));
    } finally {
      setLoadingProvider(null);
    }
  }

  async function handleForgotVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoadingProvider("email");
    dismissError();
    try {
      await forgotPasswordVerifyOtp(email, resetOtp);
      setView("new-password");
    } catch (err: any) {
      showError(classifyError(err));
    } finally {
      setLoadingProvider(null);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoadingProvider("email");
    dismissError();
    try {
      await forgotPasswordReset(email, resetOtp, newPassword);
      setNewPassword("");
      setResetOtp("");
      setView("login");
    } catch (err: any) {
      showError(classifyError(err));
    } finally {
      setLoadingProvider(null);
    }
  }

  async function handleResendResetOtp() {
    setLoadingProvider("email");
    dismissError();
    try {
      await forgotPasswordSendOtp(email);
    } catch (err: any) {
      showError(classifyError(err));
    } finally {
      setLoadingProvider(null);
    }
  }
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-white rounded-t-2xl sm:rounded-xl shadow-2xl overflow-y-auto max-h-[92vh] transition-all duration-300 ease-out"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-3 mb-1 sm:hidden" />
        <button
          onClick={onClose}
          disabled={isBusy}
          className="absolute right-4 top-4 sm:right-6 sm:top-6 text-gray-400 hover:text-black p-1 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <X size={24} />
        </button>

        <div className="px-6 py-8 sm:px-10 sm:py-10">
          {/* ── Initial view ── */}
          {view === "initial" && (
            <>
              <h2 className="text-xl sm:text-2xl font-bold text-center leading-tight mb-8">
                Join and sell your pre-loved stuff with Secure payments & buyer protection
              </h2>
              <div className="space-y-3">
                <SocialButton
                  icon="https://www.svgrepo.com/show/475656/google-color.svg"
                  text="Continue with Google"
                  isLoading={loadingProvider === "google"}
                  isDisabled={isBusy && loadingProvider !== "google"}
                  onClick={handleGoogleLogin}
                />
                {/* Added Line Social Button */}
                <SocialButton
                  icon="https://www.svgrepo.com/show/354012/line.svg"
                  text="Continue with Line"
                  isLoading={loadingProvider === "line"}
                  isDisabled={isBusy && loadingProvider !== "line"}
                  onClick={handleLineLogin}
                />
              </div>
              <div className="flex items-center my-6">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="px-3 text-xs text-gray-400 font-bold uppercase">
                  OR
                </span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
              <button
                onClick={() => setView("register")}
                disabled={isBusy}
                className="w-full bg-[#cb6f4d] text-white rounded-md py-3 font-semibold cursor-pointer hover:bg-[#cb6f4d] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Register with email
              </button>
              <p className="mt-6 text-center text-sm text-gray-600">
                Already have an account?{" "}
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => setView("login")}
                  className="text-[#cb6f4d] cursor-pointer hover:underline font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Log in
                </button>
              </p>
              {authError && (
                <div className="mt-4">
                  <ErrorBanner error={authError} onDismiss={dismissError} />
                </div>
              )}
            </>
          )}

          {/* ── Login / Register view ── */}
          {(view === "login" || view === "register") && (
            <div className="flex flex-col">
              <h2 className="text-2xl font-semibold text-center mb-8">
                {view === "login" ? "Log in" : "Sign up with email"}
              </h2>
              {message && view === "login" && (
                <p className="-mt-5 mb-6 rounded-md border border-[#cb6f4d]/20 bg-[#cb6f4d]/10 px-3 py-2 text-center text-sm font-medium text-[#9f5437]">
                  {message}
                </p>
              )}
              <form
                onSubmit={view === "login" ? handleLogin : handleRegister}
                className="space-y-5"
              >
                {view === "register" && (
                  <div>
                    <input
                      type="text"
                      placeholder="Username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      disabled={isBusy}
                      className="w-full py-3 border-b border-gray-300 outline-none focus:border-[#cb6f4d] disabled:opacity-50"
                    />
                    <p className="text-[10px] text-gray-500 mt-1">
                      Visible to other users.
                    </p>
                  </div>
                )}
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isBusy}
                  className="w-full py-3 border-b border-gray-300 outline-none focus:border-[#cb6f4d] disabled:opacity-50"
                />
                <div className="relative border-b border-gray-300 focus-within:border-[#cb6f4d]">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isBusy}
                    className="w-full py-3 outline-none pr-10 disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isBusy}
                    className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:opacity-40"
                  >
                    {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
                  </button>
                </div>

                {view === "login" && (
                  <button
                    type="button"
                    onClick={() => {
                      setView("forgot-password");
                      setEmail("");
                    }}
                    disabled={isBusy}
                    className="text-xs text-gray-400 hover:text-[#cb6f4d] self-end block text-right w-full -mt-2 disabled:opacity-50"
                  >
                    Forgot password?
                  </button>
                )}

                {view === "register" && (
                  <div className="space-y-4 pt-2">
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        disabled={isBusy}
                        className="mt-1 h-5 w-5 rounded border-gray-300 accent-[#cb6f4d] shrink-0"
                      />
                      <span className="text-xs text-gray-600">
                        I want to receive personalized offers and updates.
                      </span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        required
                        type="checkbox"
                        disabled={isBusy}
                        className="mt-1 h-5 w-5 rounded border-gray-300 accent-[#cb6f4d] shrink-0"
                      />
                      <span className="text-xs text-gray-600">
                        I accept the{" "}
                        <span className="text-[#cb6f4d] font-medium">
                          Terms & Conditions
                        </span>{" "}
                        and{" "}
                        <span className="text-[#cb6f4d] font-medium">
                          Privacy Policy
                        </span>
                        .
                      </span>
                    </label>
                  </div>
                )}

                {authError && (
                  <ErrorBanner error={authError} onDismiss={dismissError} />
                )}

                <button
                  type="submit"
                  disabled={isBusy}
                  className="w-full bg-[#cb6f4d] text-white rounded-md py-3.5 font-bold disabled:opacity-50 mt-4 shadow-sm active:bg-[#cb6f4d] flex items-center justify-center gap-2 disabled:cursor-not-allowed"
                >
                  {loadingProvider === "email" && (
                    <Loader2 size={16} className="animate-spin" />
                  )}
                  {loadingProvider === "email" ? "Please wait…" : "Continue"}
                </button>
              </form>
              <button
                type="button"
                onClick={() => setView("initial")}
                disabled={isBusy}
                className="mt-6 text-[#cb6f4d] text-sm font-medium hover:underline self-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {view === "register"
                  ? "Already have an account? Log in"
                  : "Don't have an account? Register"}
              </button>
            </div>
          )}

          {/* ── Register OTP view ── */}
          {view === "otp" && (
            <div className="flex flex-col">
              <h2 className="text-2xl font-semibold text-center mb-2">
                Verify your email
              </h2>
              <p className="text-sm text-gray-500 text-center mb-8">
                We sent a 6-digit code to{" "}
                <span className="font-medium text-gray-700">{email}</span>
              </p>
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Enter 6-digit code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  disabled={isBusy}
                  className="w-full py-3 text-center text-2xl tracking-[0.5em] border-b border-gray-300 outline-none focus:border-[#cb6f4d] disabled:opacity-50"
                />
                {authError && (
                  <ErrorBanner error={authError} onDismiss={dismissError} />
                )}
                <button
                  type="submit"
                  disabled={isBusy || otp.length !== 6}
                  className="w-full bg-[#cb6f4d] text-white rounded-md py-3.5 font-bold disabled:opacity-50 mt-4 shadow-sm flex items-center justify-center gap-2 disabled:cursor-not-allowed"
                >
                  {loadingProvider === "email" && (
                    <Loader2 size={16} className="animate-spin" />
                  )}
                  {loadingProvider === "email"
                    ? "Verifying…"
                    : "Verify & Create Account"}
                </button>
              </form>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={isBusy}
                className="mt-4 text-sm text-gray-500 hover:text-[#cb6f4d] self-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Didn't receive it? Resend code
              </button>
              <button
                type="button"
                onClick={() => {
                  setView("register");
                  setOtp("");
                }}
                disabled={isBusy}
                className="mt-2 text-[#cb6f4d] text-sm font-medium hover:underline self-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Back
              </button>
            </div>
          )}

          {/* ── Forgot Password view ── */}
          {view === "forgot-password" && (
            <div className="flex flex-col">
              <h2 className="text-2xl font-semibold text-center mb-2">
                Forgot password?
              </h2>
              <p className="text-sm text-gray-500 text-center mb-8">
                Enter your email and we'll send you a reset code.
              </p>
              <form onSubmit={handleForgotSendOtp} className="space-y-5">
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isBusy}
                  required
                  className="w-full py-3 border-b border-gray-300 outline-none focus:border-[#cb6f4d] disabled:opacity-50"
                />
                {authError && (
                  <ErrorBanner error={authError} onDismiss={dismissError} />
                )}
                <button
                  type="submit"
                  disabled={isBusy}
                  className="w-full bg-[#cb6f4d] text-white rounded-md py-3.5 font-bold disabled:opacity-50 mt-4 shadow-sm flex items-center justify-center gap-2 disabled:cursor-not-allowed"
                >
                  {loadingProvider === "email" && (
                    <Loader2 size={16} className="animate-spin" />
                  )}
                  {loadingProvider === "email" ? "Sending…" : "Send reset code"}
                </button>
              </form>
              <button
                type="button"
                onClick={() => setView("login")}
                disabled={isBusy}
                className="mt-6 text-[#cb6f4d] text-sm font-medium hover:underline self-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Back to login
              </button>
            </div>
          )}

          {/* ── Reset OTP view ── */}
          {view === "reset-otp" && (
            <div className="flex flex-col">
              <h2 className="text-2xl font-semibold text-center mb-2">
                Enter reset code
              </h2>
              <p className="text-sm text-gray-500 text-center mb-8">
                We sent a 6-digit code to{" "}
                <span className="font-medium text-gray-700">{email}</span>
              </p>
              <form onSubmit={handleForgotVerifyOtp} className="space-y-5">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Enter 6-digit code"
                  value={resetOtp}
                  onChange={(e) =>
                    setResetOtp(e.target.value.replace(/\D/g, ""))
                  }
                  disabled={isBusy}
                  className="w-full py-3 text-center text-2xl tracking-[0.5em] border-b border-gray-300 outline-none focus:border-[#cb6f4d] disabled:opacity-50"
                />
                {authError && (
                  <ErrorBanner error={authError} onDismiss={dismissError} />
                )}
                <button
                  type="submit"
                  disabled={isBusy || resetOtp.length !== 6}
                  className="w-full bg-[#cb6f4d] text-white rounded-md py-3.5 font-bold disabled:opacity-50 mt-4 shadow-sm flex items-center justify-center gap-2 disabled:cursor-not-allowed"
                >
                  {loadingProvider === "email" && (
                    <Loader2 size={16} className="animate-spin" />
                  )}
                  {loadingProvider === "email" ? "Verifying…" : "Verify code"}
                </button>
              </form>
              <button
                type="button"
                onClick={handleResendResetOtp}
                disabled={isBusy}
                className="mt-4 text-sm text-gray-500 hover:text-[#cb6f4d] self-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Didn't receive it? Resend code
              </button>
              <button
                type="button"
                onClick={() => {
                  setView("forgot-password");
                  setResetOtp("");
                }}
                disabled={isBusy}
                className="mt-2 text-[#cb6f4d] text-sm font-medium hover:underline self-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Back
              </button>
            </div>
          )}

          {/* ── New Password view ── */}
          {view === "new-password" && (
            <div className="flex flex-col">
              <h2 className="text-2xl font-semibold text-center mb-2">
                Set new password
              </h2>
              <p className="text-sm text-gray-500 text-center mb-8">
                Choose a strong password for your account.
              </p>
              <form onSubmit={handleResetPassword} className="space-y-5">
                <div className="relative border-b border-gray-300 focus-within:border-[#cb6f4d]">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    placeholder="New password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={isBusy}
                    required
                    minLength={6}
                    className="w-full py-3 outline-none pr-10 disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    disabled={isBusy}
                    className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:opacity-40"
                  >
                    {showNewPassword ? <Eye size={20} /> : <EyeOff size={20} />}
                  </button>
                </div>
                {authError && (
                  <ErrorBanner error={authError} onDismiss={dismissError} />
                )}
                <button
                  type="submit"
                  disabled={isBusy || newPassword.length < 6}
                  className="w-full bg-[#cb6f4d] text-white rounded-md py-3.5 font-bold disabled:opacity-50 mt-4 shadow-sm flex items-center justify-center gap-2 disabled:cursor-not-allowed"
                >
                  {loadingProvider === "email" && (
                    <Loader2 size={16} className="animate-spin" />
                  )}
                  {loadingProvider === "email"
                    ? "Saving…"
                    : "Save new password"}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── SocialButton ──────────────────────────────────────────────────────────
function SocialButton({
  icon,
  text,
  onClick,
  isLoading = false,
  isDisabled = false,
}: {
  icon: string;
  text: string;
  onClick: () => void;
  isLoading?: boolean;
  isDisabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLoading || isDisabled}
      className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-md py-2.5 font-medium hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? (
        <Loader2 size={20} className="animate-spin text-gray-400" />
      ) : (
        <Image src={icon} alt="" width={20} height={20} />
      )}
      <span className="text-sm">{text}</span>
    </button>
  );
}