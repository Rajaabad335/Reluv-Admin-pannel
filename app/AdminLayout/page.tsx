"use client";

import React, { useState, useRef, useEffect } from "react";
import Sidebar from "../Sidebar/page";
import { Menu, Bell, User, LogOut, Users, UserPlus, ChevronDown, AlertTriangle, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import { BACKEND_URL } from "@/constants";

// ─── Notification Bell Dropdown ────────────────────────────────────────────────
const NOTIF_COLORS: Record<string, string> = {
  welcome:                  "bg-teal-100 text-teal-700",
  login:                    "bg-gray-100 text-gray-600",
  product_created:          "bg-blue-100 text-blue-700",
  order:                    "bg-indigo-100 text-indigo-700",
  new_message:              "bg-purple-100 text-purple-700",
  new_follower:             "bg-pink-100 text-pink-700",
  order_update:             "bg-yellow-100 text-yellow-700",
  review:                   "bg-lime-100 text-lime-700",
  add_fav_list:             "bg-rose-100 text-rose-700",
  offer_received:           "bg-orange-100 text-orange-700",
  offer_accepted:           "bg-green-100 text-green-700",
  offer_declined:           "bg-red-100 text-red-700",
  dispute_received:         "bg-red-100 text-red-700",
  dispute_raised:           "bg-red-200 text-red-800",
  dispute_status_updated:   "bg-amber-100 text-amber-700",
  dispute_resolved:         "bg-green-100 text-green-700",
  refund_processed:         "bg-teal-100 text-teal-700",
};

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function NotificationDropdown({ onClose }: { onClose: () => void }) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const token = localStorage.getItem("jwt");
        const res = await fetch(`${BACKEND_URL}/api/products/notifications-data`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const json = await res.json();
        setNotifications(json?.data?.notifications ?? []);
      } catch (err) {
        console.error("Failed to fetch notifications:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchNotifications();
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-gray-800">Notifications</h3>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded-full">
              {unreadCount} new
            </span>
          )}
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
      </div>

      {/* Body */}
      <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-6 h-6 border-2 border-[#cb6f4d] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">No notifications yet.</p>
        ) : (
          notifications.map((n: any) => {
            const badgeColor = NOTIF_COLORS[n.type] ?? "bg-gray-100 text-gray-500";
            return (
              <div
                key={n.id}
                className={`flex items-start gap-3 px-4 py-3 transition-colors hover:bg-gray-50 ${
                  !n.read ? "bg-blue-50/40" : ""
                }`}
              >
                {/* Unread dot */}
                <div className="mt-1.5 flex-shrink-0 w-2">
                  {!n.read && (
                    <div className="w-2 h-2 rounded-full bg-[#1156be]" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <p className="text-sm font-semibold text-slate-800 truncate">{n.title}</p>
                    <span className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${badgeColor}`}>
                      {n.type.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{n.description}</p>
                  <p className="text-[10px] text-gray-300 mt-1">{formatTimeAgo(n.createdAt)}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

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

      const updateRes = await fetch(`${BACKEND_URL}/api/users/${targetUser.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ accountType: "admin" }),
      });

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

        <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@example.com"
          className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#cb6f4d]/40 focus:border-[#cb6f4d] transition"
        />

        {error   && <p className="text-red-500 text-xs mt-2">{error}</p>}
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
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.push("/login");
    onClose();
  };

  return (
    <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
      <div className="bg-[#fdf4f1] px-4 py-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[#cb6f4d] flex items-center justify-center shrink-0">
          <User size={18} className="text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">
            {user?.username || user?.firstName || "Admin"}
          </p>
          <p className="text-xs text-gray-500 truncate">{user?.email}</p>
        </div>
      </div>

      <div className="py-1.5">
        <button
          onClick={() => { onAddAdmin(); onClose(); }}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
        >
          <UserPlus size={16} className="text-gray-400" />
          Add New Admin
        </button>

        <div className="my-1.5 border-t border-gray-100" />

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
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setSidebarOpen]   = useState(false);
  const [isProfileOpen, setProfileOpen]   = useState(false);
  const [isBellOpen,    setBellOpen]      = useState(false);
  const [isAddAdminOpen, setAddAdminOpen] = useState(false);
  const [unreadCount, setUnreadCount]     = useState(0);

  const { user } = useAuth();
  const profileRef = useRef<HTMLDivElement>(null);
  const bellRef    = useRef<HTMLDivElement>(null);
  const router     = useRouter();

  // Fetch unread count for the badge on the bell
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const token = localStorage.getItem("jwt");
        const res = await fetch(`${BACKEND_URL}/api/products/notifications-data`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const json = await res.json();
        const notifs: any[] = json?.data?.notifications ?? [];
        setUnreadCount(notifs.filter((n) => !n.read).length);
      } catch {}
    };
    fetchUnread();
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node))
        setProfileOpen(false);
      if (bellRef.current && !bellRef.current.contains(e.target as Node))
        setBellOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex h-screen bg-[#f8fafd] overflow-hidden font-sans">
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out
          lg:relative lg:translate-x-0
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </aside>

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
            {/* ── Bell ── */}
            <div className="relative" ref={bellRef}>
              <button
                onClick={() => { setBellOpen((p) => !p); setProfileOpen(false); }}
                className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Notifications"
              >
                <Bell size={26} className="text-gray-400 hover:text-[#cb6f4d] cursor-pointer transition-colors" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-[#cb6f4d] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>

              {isBellOpen && (
                <NotificationDropdown onClose={() => setBellOpen(false)} />
              )}
            </div>

            {/* ── Profile ── */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => { setProfileOpen((p) => !p); setBellOpen(false); }}
                className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-[#fdf4f1] transition-colors"
                aria-label="Profile menu"
              >
                <div className="w-8 h-8 rounded-full bg-[#cb6f4d] cursor-pointer flex items-center justify-center overflow-hidden">
                  <User size={18} className="text-white" />
                </div>
                <ChevronDown
                  size={14}
                  className={`text-gray-400 transition-transform cursor-pointer hidden sm:block ${
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

      {isAddAdminOpen && <AddAdminModal onClose={() => setAddAdminOpen(false)} />}
    </div>
  );
}