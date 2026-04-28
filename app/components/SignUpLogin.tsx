'use client';

import { X, EyeOff, Eye, Loader2, AlertCircle, WifiOff, XCircle } from "lucide-react";
import Image from "next/image";
import { useState, useEffect, useCallback, useRef } from "react";
import { login, register, loginWithGoogle, loginWithFacebook } from "../services/auth-service";
import { useAuth } from "../context/AuthContext";

// ─── Google OAuth config ───────────────────────────────────────────────────
const GOOGLE_CLIENT_ID = "139090663543-35knp1pnf47rc7qrnbgf6jf4nkbts4ij.apps.googleusercontent.com";

// ─── Facebook OAuth config ─────────────────────────────────────────────────
const FACEBOOK_APP_ID = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID!;

// ─── Error types ───────────────────────────────────────────────────────────
type AuthErrorKind = "network" | "auth" | "cancelled" | "unknown";

interface AuthError {
  kind: AuthErrorKind;
  message: string;
}

function classifyError(err: any): AuthError {
  const msg: string = err?.message || "";

  if (!navigator.onLine || msg.toLowerCase().includes("network") || msg.toLowerCase().includes("fetch")) {
    return { kind: "network", message: "No internet connection. Please check your network and try again." };
  }
  if (msg.toLowerCase().includes("cancel") || msg.toLowerCase().includes("closed")) {
    return { kind: "cancelled", message: "Sign-in was cancelled. Try again when you're ready." };
  }
  if (
    msg.toLowerCase().includes("invalid") ||
    msg.toLowerCase().includes("credentials") ||
    msg.toLowerCase().includes("password") ||
    msg.toLowerCase().includes("user not found") ||
    msg.toLowerCase().includes("email")
  ) {
    return { kind: "auth", message: msg || "Incorrect email or password. Please try again." };
  }
  if (msg.toLowerCase().includes("already") || msg.toLowerCase().includes("exists")) {
    return { kind: "auth", message: "An account with this email already exists. Try logging in instead." };
  }
  return { kind: "unknown", message: msg || "Something went wrong. Please try again." };
}

// ─── Popup helper ──────────────────────────────────────────────────────────
function openPopup(url: string, title: string) {
  const w = 500, h = 600;
  const left = window.screenX + (window.outerWidth - w) / 2;
  const top = window.screenY + (window.outerHeight - h) / 2;
  return window.open(url, title, `width=${w},height=${h},left=${left},top=${top}`);
}

// ─── Error Banner ──────────────────────────────────────────────────────────
function ErrorBanner({ error, onDismiss }: { error: AuthError; onDismiss: () => void }) {
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
}: {
  onClose: () => void;
  initialView?: "initial" | "login" | "register";
}) {
  const { login: setAuthLogin } = useAuth();
  const [view, setView] = useState<"initial" | "login" | "register">(initialView);
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // ── Unified loading state: null = idle, "email" | "google" | "facebook" = in-flight
  const [loadingProvider, setLoadingProvider] = useState<"email" | "google" | "facebook" | null>(null);
  const isBusy = loadingProvider !== null;

  // ── Unified error state
  const [authError, setAuthError] = useState<AuthError | null>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showError = useCallback((err: AuthError) => {
    setAuthError(err);
    // Auto-dismiss after 6 s (skip for network errors – user needs to act)
    if (err.kind !== "network") {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
      errorTimerRef.current = setTimeout(() => setAuthError(null), 6000);
    }
  }, []);

  const dismissError = useCallback(() => {
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    setAuthError(null);
  }, []);

  // Clear error when switching views or typing
  useEffect(() => { dismissError(); }, [view]);
  useEffect(() => { if (authError) dismissError(); }, [email, password, username]);

  // Cleanup on unmount
  useEffect(() => () => { if (errorTimerRef.current) clearTimeout(errorTimerRef.current); }, []);

  // ── Google Sign-In ────────────────────────────────────────────────────────
  const handleGoogleLogin = useCallback(() => {
    setLoadingProvider("google");
    dismissError();

    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: `${window.location.origin}/auth/callback/google`,
      response_type: "token",
      scope: "openid email profile",
      prompt: "select_account",
    });

    const popup = openPopup(
      `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
      "Google Sign-In"
    );

    if (!popup) {
      showError({ kind: "unknown", message: "Popup was blocked. Please allow popups for this site and try again." });
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
        // Only show "cancelled" if we're still loading (no success yet)
        setLoadingProvider((prev) => {
          if (prev === "google") {
            // User closed popup without completing — silent cancel, no error
          }
          return null;
        });
      }
    }, 500);
  }, [setAuthLogin, onClose, showError, dismissError]);

  // ── Facebook Login ────────────────────────────────────────────────────────
  const handleFacebookLogin = useCallback(() => {
    setLoadingProvider("facebook");
    dismissError();

    const initFB = () => {
      (window as any).FB.login(
        (response: any) => {
          if (response.authResponse) {
            loginWithFacebook(response.authResponse.accessToken)
              .then((data) => {
                setAuthLogin(data.jwt, data.user);
                onClose();
              })
              .catch((err: any) => showError(classifyError(err)))
              .finally(() => setLoadingProvider(null));
          } else {
            // User cancelled the Facebook dialog — silent, no error shown
            setLoadingProvider(null);
          }
        },
        { scope: "email,public_profile" }
      );
    };

    if ((window as any).FB) {
      initFB();
    } else {
      const script = document.createElement("script");
      script.src = "https://connect.facebook.net/en_US/sdk.js";
      script.async = true;
      script.onload = () => {
        (window as any).FB.init({
          appId: FACEBOOK_APP_ID,
          cookie: true,
          xfbml: false,
          version: "v19.0",
        });
        initFB();
      };
      script.onerror = () => {
        showError({ kind: "network", message: "Failed to load Facebook. Check your connection and try again." });
        setLoadingProvider(null);
      };
      document.body.appendChild(script);
    }
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
                Join and sell pre-loved clothes with no fees
              </h2>
              <div className="space-y-3">
                <SocialButton
                  icon="https://www.svgrepo.com/show/475656/google-color.svg"
                  text="Continue with Google"
                  isLoading={loadingProvider === "google"}
                  isDisabled={isBusy && loadingProvider !== "google"}
                  onClick={handleGoogleLogin}
                />
                <SocialButton
                  icon="https://www.svgrepo.com/show/475647/facebook-color.svg"
                  text="Continue with Facebook"
                  isLoading={loadingProvider === "facebook"}
                  isDisabled={isBusy && loadingProvider !== "facebook"}
                  onClick={handleFacebookLogin}
                />
                <SocialButton
                  icon="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/apple.svg"
                  text="Continue with Apple"
                  isDisabled={isBusy}
                  onClick={() => {}}
                />
              </div>

              <div className="flex items-center my-6">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="px-3 text-xs text-gray-400 font-bold uppercase">OR</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <button
                onClick={() => setView("register")}
                disabled={isBusy}
                className="w-full bg-[#007782] text-white rounded-md py-3 font-semibold hover:bg-[#00656f] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Register with email
              </button>
              <p className="mt-6 text-center text-sm text-gray-600">
                Already have an account?{" "}
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => setView("login")}
                  className="text-[#007782] cursor-pointer hover:underline font-bold disabled:opacity-50 disabled:cursor-not-allowed"
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
              <form onSubmit={view === "login" ? handleLogin : handleRegister} className="space-y-5">
                {view === "register" && (
                  <div>
                    <input
                      type="text"
                      placeholder="Username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      disabled={isBusy}
                      className="w-full py-3 border-b border-gray-300 outline-none focus:border-[#007782] disabled:opacity-50"
                    />
                    <p className="text-[10px] text-gray-500 mt-1">Visible to other users.</p>
                  </div>
                )}
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isBusy}
                  className="w-full py-3 border-b border-gray-300 outline-none focus:border-[#007782] disabled:opacity-50"
                />
                <div className="relative border-b border-gray-300 focus-within:border-[#007782]">
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

                {view === "register" && (
                  <div className="space-y-4 pt-2">
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        disabled={isBusy}
                        className="mt-1 h-5 w-5 rounded border-gray-300 accent-[#007782] shrink-0"
                      />
                      <span className="text-xs text-gray-600">I want to receive personalized offers and updates.</span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        required
                        type="checkbox"
                        disabled={isBusy}
                        className="mt-1 h-5 w-5 rounded border-gray-300 accent-[#007782] shrink-0"
                      />
                      <span className="text-xs text-gray-600">
                        I accept the <span className="text-[#007782] font-medium">Terms & Conditions</span> and{" "}
                        <span className="text-[#007782] font-medium">Privacy Policy</span>.
                      </span>
                    </label>
                  </div>
                )}

                {authError && <ErrorBanner error={authError} onDismiss={dismissError} />}

                <button
                  type="submit"
                  disabled={isBusy}
                  className="w-full bg-[#007782] text-white rounded-md py-3.5 font-bold disabled:opacity-50 mt-4 shadow-sm active:bg-[#005f68] flex items-center justify-center gap-2 disabled:cursor-not-allowed"
                >
                  {loadingProvider === "email" && <Loader2 size={16} className="animate-spin" />}
                  {loadingProvider === "email" ? "Please wait…" : "Continue"}
                </button>
              </form>

              <button
                type="button"
                onClick={() => setView("initial")}
                disabled={isBusy}
                className="mt-6 text-[#007782] text-sm font-medium hover:underline self-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {view === "register" ? "Already have an account? Log in" : "Don't have an account? Register"}
              </button>
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