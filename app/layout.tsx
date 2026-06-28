"use client";
import "./globals.css";
import { AuthProvider } from "./context/AuthContext";
import AuthGate from "./components/AuthGate";
import AdminLayout from "./AdminLayout/page";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning={true}>
        <AuthProvider>
          <AuthGate>
            <AdminLayout>{children}</AdminLayout>
          </AuthGate>
        </AuthProvider>
      </body>
    </html>
  );
}
