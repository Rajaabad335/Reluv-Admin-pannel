import "./globals.css";
import AdminLayout from "../app/AdminLayout/page";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AdminLayout>{children}</AdminLayout>
      </body>
    </html>
  );
}
