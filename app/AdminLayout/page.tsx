"use client";

import React, { useState } from "react";
import Sidebar from "../Sidebar/page"; // Your provided Sidebar component
import { Menu, Bell, User } from "lucide-react";
import Link from "next/dist/client/link";
import { useAuth } from "../context/AuthContext";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
    const { user } = useAuth();

  return (
    <div className="flex h-screen bg-[#f8fafd] overflow-hidden font-sans">
      {/* 1. Mobile Overlay: Darkens the screen when sidebar is open */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 2. Responsive Sidebar: Hidden off-screen on mobile, visible on desktop */}
      <aside
        className={`
        fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out
        lg:relative lg:translate-x-0 
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </aside>

      {/* 3. Main Body Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navigation Bar with Hamburger */}
        <header className="h-16 bg-white border-b border-[#cb6f4d] flex items-center justify-between px-4 lg:px-8 shrink-0">
          <div className="flex items-center gap-4">
            {/* Hamburger Button: Only visible on mobile */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 hover:bg-gray-100 rounded-lg lg:hidden text-gray-600 transition-colors"
              aria-label="Open Menu"
            >
              <Menu size={24} />
            </button>
            <h2 className="text-lg font-bold text-[#cb6f4d] hidden sm:block">
              Admin Dashboard
            </h2>
          </div>

          <div className="flex items-center gap-3 sm:gap-6">
            {/* <Search size={20} className="text-gray-400 cursor-pointer hover:text-[#1156be]" /> */}
            <Bell
              size={20}
              className="text-gray-400 cursor-pointer hover:text-[#1156be]"
            />
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 overflow-hidden">
              <Link href={`/profile/${user?.id}`}>
                <User size={20} />
              </Link>
            </div>  
          </div>
        </header>

        {/* Scrollable Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
