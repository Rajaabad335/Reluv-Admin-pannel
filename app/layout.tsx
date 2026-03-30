import { AuthProvider } from "../app/context/AuthContext";
import AuthGate from "../app/components/AuthGate";
import "./globals.css";
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <AuthProvider>
          <AuthGate>
            {children}
          </AuthGate>
        </AuthProvider>
      </body>
    </html>
  );
}
