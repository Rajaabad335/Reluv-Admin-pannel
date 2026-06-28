"use client";

import React, { useState, useRef, useEffect } from "react";
import Sidebar from "../Sidebar/page";
import { Menu, Bell, User, LogOut, Users, UserPlus, ChevronDown } from "lucide-react";
import Link from "next/dist/client/link";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import { BACKEND_URL } from "@/constants";

// ─── Add Admin Modal ───────────────────────────────────────────────────────────
function AddAdminModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async () => {
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("jwt");
      const res = await fetch(`${BACKEND_URL}/api/users`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      const users = await res.json();
      const targetUser = users.find((u: any) => u.email === email);

      if (!targetUser) {
        setError("No user found with that email.");
        setLoading(false);
        return;
      }

      // Promote to admin role — adjust roleId to match your Strapi setup
      const updateRes = await fetch(
        `${BACKEND_URL}/api/users/${targetUser.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ accountType: "admin" }), // 3 = Admin role ID in Strapi users-permissions
        }
      );

      if (!updateRes.ok) throw new Error("Failed to update user role.");
      setSuccess(`${email} has been granted admin access.`);
      setEmail("");
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-1">Add New Admin</h3>
        <p className="text-sm text-gray-500 mb-5">
          Enter the email of an existing Reluv user to grant them admin access.
        </p>

        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email address
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@example.com"
          className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#cb6f4d]/40 focus:border-[#cb6f4d] transition"
        />

        {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
        {success && <p className="text-green-600 text-xs mt-2">{success}</p>}

        <div className="flex gap-3 mt-5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-2.5 rounded-lg bg-[#cb6f4d] text-white text-sm font-semibold hover:bg-[#b5623f] transition disabled:opacity-60"
          >
            {loading ? "Granting access…" : "Grant Access"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Profile Dropdown ──────────────────────────────────────────────────────────
function ProfileDropdown({
  user,
  onAddAdmin,
  onClose,
}: {
  user: any;
  onAddAdmin: () => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const { logout } = useAuth(); // make sure your AuthContext exposes logout()

  const handleLogout = () => {
    logout();
    router.push("/login");
    onClose();
  };

  return (
    <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
      {/* Current admin info */}
      <div className="bg-[#fdf4f1] px-4 py-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[#cb6f4d] flex items-center justify-center shrink-0">
          {user?.profilePicture ? (
            <img
              src={user.profilePicture}
              alt="avatar"
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <User size={18} className="text-white" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">
            {user?.username || user?.firstName || "Admin"}
          </p>
          <p className="text-xs text-gray-500 truncate">{user?.email}</p>
        </div>
      </div>

      <div className="py-1.5">
        {/* View profile */}
        {/* <Link
          href={`/profile/${user?.id}`}
          onClick={onClose}
          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
        >
          <User size={16} className="text-gray-400" />
          My Profile
        </Link> */}

        {/* Manage admins */}
        {/* <Link
          href="/admin/manage-admins"
          onClick={onClose}
          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
        >
          <Users size={16} className="text-gray-400" />
          Manage Admins
        </Link> */}

        {/* Add admin */}
        <button
          onClick={() => {
            onAddAdmin();
            onClose();
          }}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
        >
          <UserPlus size={16} className="text-gray-400" />
          Add New Admin
        </button>

        <div className="my-1.5 border-t border-gray-100" />

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </div>
  );
}

// ─── Admin Layout ──────────────────────────────────────────────────────────────
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isProfileOpen, setProfileOpen] = useState(false);
  const [isAddAdminOpen, setAddAdminOpen] = useState(false);
  const { user } = useAuth();
  const profileRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex h-screen bg-[#f8fafd] overflow-hidden font-sans">
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out
          lg:relative lg:translate-x-0
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b border-[#cb6f4d] flex items-center justify-between px-4 lg:px-8 shrink-0">
          <div className="flex items-center gap-4">
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

          <div className="flex items-center gap-3 sm:gap-5">
            <Bell
              size={20}
              className="text-gray-400 cursor-pointer hover:text-[#cb6f4d] transition-colors"
            />

            {/* Profile button + dropdown */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen((prev) => !prev)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-[#fdf4f1] transition-colors group"
                aria-label="Profile menu"
              >
                <div className="w-8 h-8 rounded-full bg-[#cb6f4d] flex items-center justify-center overflow-hidden">
                  {/* {user?.profilePicture ? (
                    <img
                      src={user.profilePicture}
                      alt="avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : ( */}
                    <User size={16} className="text-white" />
                  {/* )} */}
                </div>
                <ChevronDown
                  size={14}
                  className={`text-gray-400 transition-transform hidden sm:block ${
                    isProfileOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {isProfileOpen && (
                <ProfileDropdown
                  user={user}
                  onAddAdmin={() => setAddAdminOpen(true)}
                  onClose={() => setProfileOpen(false)}
                />
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">{children}</main>
      </div>

      {/* Add Admin Modal */}
      {isAddAdminOpen && (
        <AddAdminModal onClose={() => setAddAdminOpen(false)} />
      )}
    </div>
  );
}