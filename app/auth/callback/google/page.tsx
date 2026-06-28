// app/auth/callback/google/page.tsx
'use client';
import { useEffect } from "react";

export default function GoogleCallback() {
  useEffect(() => {
    // Authorization code flow: code comes in query string
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const error = params.get("error");

    if (window.opener) {
      window.opener.postMessage(
        code
          ? { type: "GOOGLE_AUTH_SUCCESS", code }
          : { type: "GOOGLE_AUTH_ERROR", error },
        window.location.origin
      );
      window.close();
    }
  }, []);

  return (
    <div className="flex items-center justify-center h-screen text-gray-500 text-sm">
      Signing you in…
    </div>
  );
}