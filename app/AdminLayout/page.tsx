"use client";

import Sidebar from "../Sidebar/page";
import Header from "../Header/page";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Header />

        <main className="p-6 bg-gray-100 flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
