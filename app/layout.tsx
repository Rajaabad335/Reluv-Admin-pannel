import { AuthProvider } from "../app/context/AuthContext";
import AuthGate from "../app/components/AuthGate";
import "./globals.css";
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
