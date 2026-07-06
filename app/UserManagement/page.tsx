"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Trash2, ShieldOff, ShieldCheck, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { BACKEND_URL } from "@/constants";

const PAGE_SIZE = 10;

// ─── Types ────────────────────────────────────────────────
// The /api/all-users endpoint returns the full user record (products,
// followers, following, avatar, googlePicture, received_reviews, etc).
// We keep the object loosely typed so we can pass it straight through
// to the profile page without re-fetching anything.
interface User {
  id: number;
  username: string;
  email: string;
  accountType: string;
  blocked: boolean;
  [key: string]: any;
}

// ─── Confirmation Modal ───────────────────────────────────
function ConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  danger,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6 animate-fade-in">
        <h2 className="text-lg font-bold text-gray-800 mb-2">{title}</h2>
        <p className="text-sm text-gray-500 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors cursor-pointer ${
              danger ? "bg-red-500 hover:bg-red-600" : "bg-[#cb6f4d] hover:bg-[#b5623d]"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────
function Toast({ message, type }: { message: string; type: "success" | "error" }) {
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-semibold text-white transition-all animate-slide-up ${
        type === "success" ? "bg-[#cb6f4d]" : "bg-red-500"
      }`}
    >
      {message}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────
export default function UserManagement() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState("All Users");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const hasFetched = useRef(false);

  // Modal state
  const [modal, setModal] = useState<{
    open: boolean;
    type: "block" | "delete" | null;
    user: User | null;
  }>({ open: false, type: null, user: null });

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // ── Fetch ──
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${BACKEND_URL}/api/all-users`);
      if (!res.ok) return;
      const result = await res.json();
      setUsers(result?.data || []);
    } catch (err) {
      console.error("Fetch failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchUsers();
  }, []);

  // ── Filter ──
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesTab =
        activeTab === "All Users" ||
        (activeTab === "Active" && !user.blocked) ||
        (activeTab === "Sellers" && user.accountType === "user") ||
        (activeTab === "Banned" && user.blocked);

      const q = searchQuery.toLowerCase();
      const matchesSearch =
        user.username?.toLowerCase().includes(q) ||
        user.email?.toLowerCase().includes(q);

      return matchesTab && matchesSearch;
    });
  }, [users, activeTab, searchQuery]);

  // ── Pagination ──
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // Reset to page 1 when filter/search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery]);

  // ── Actions ──
  const openModal = (type: "block" | "delete", user: User) => {
    setModal({ open: true, type, user });
  };

  const closeModal = () => setModal({ open: false, type: null, user: null });

  const handleBlock = async () => {
    const user = modal.user!;
    const willBlock = !user.blocked;
    closeModal();

    // Optimistic update
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, blocked: willBlock } : u))
    );

    try {
      const res = await fetch(`${BACKEND_URL}/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocked: willBlock }),
      });
      if (!res.ok) throw new Error();
      showToast(
        willBlock
          ? `${user.username} has been blocked.`
          : `${user.username} has been unbanned.`
      );
    } catch {
      // Rollback
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, blocked: !willBlock } : u))
      );
      showToast("Action failed. Please try again.", "error");
    }
  };

  const handleDelete = async () => {
    const user = modal.user!;
    closeModal();

    // Optimistic remove
    setUsers((prev) => prev.filter((u) => u.id !== user.id));

    try {
      const res = await fetch(`${BACKEND_URL}/api/users/${user.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      showToast(`${user.username} has been deleted.`);
    } catch {
      // Rollback
      setUsers((prev) => [...prev, user].sort((a, b) => a.id - b.id));
      showToast("Delete failed. Please try again.", "error");
    }
  };

  // ── View profile ──
  // We already have the full user record (products, followers, following,
  // avatar, googlePicture, received_reviews, etc.) in `users` state, so we
  // just hand it off via sessionStorage instead of re-fetching on the
  // profile page. ProfilePage reads and clears this key on mount.
  const handleViewProfile = (user: User) => {
    try {
      sessionStorage.setItem(`member-cache:${user.id}`, JSON.stringify(user));
    } catch (err) {
      console.error("Failed to cache user for profile view:", err);
    }
    router.push(`/member/${user.id}`);
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafd] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#cb6f4d] border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm font-medium">Loading users…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-[#f8fafd] min-h-screen font-sans">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[#2d3748] text-2xl font-bold">User Management</h1>
        <p className="text-gray-400 text-sm mt-1">
          {filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""} found
        </p>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col-reverse md:flex-row md:items-center justify-between gap-4 mb-6">
        {/* Tabs */}
        <div className="flex overflow-x-auto no-scrollbar">
          <div className="flex bg-white rounded-lg border border-gray-200 shadow-sm shrink-0 overflow-hidden">
            {["All Users", "Sellers", "Active", "Banned"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 md:px-6 py-2 text-sm font-semibold transition-colors whitespace-nowrap border-r border-gray-100 last:border-0 cursor-pointer ${
                  activeTab === tab
                    ? "bg-[#cb6f4d] text-white"
                    : "text-gray-500 hover:bg-gray-50"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#cb6f4d]"
            size={18}
          />
          <input
            type="text"
            placeholder="Search by name or email…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-[#cb6f4d] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cb6f4d]/20 bg-white text-gray-800 text-sm"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-187.5">
            <thead className="bg-[#fcfdfe] border-b border-gray-100">
              <tr className="text-gray-500 text-xs uppercase tracking-wide">
                <th className="px-6 py-4 font-semibold">ID</th>
                <th className="px-6 py-4 font-semibold">Name</th>
                <th className="px-6 py-4 font-semibold">Email</th>
                <th className="px-6 py-4 font-semibold">Role</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 text-right pr-8 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedUsers.length > 0 ? (
                paginatedUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-6 py-4 text-sm font-mono text-gray-400">{user.id}</td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-800">{user.username}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{user.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 capitalize">{user.accountType}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          user.blocked
                            ? "bg-red-100 text-red-600"
                            : "bg-[#f5e6df] text-[#cb6f4d]"
                        }`}
                      >
                        {user.blocked ? "Banned" : "Active"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleViewProfile(user)}
                          title="View user profile"
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#cb6f4d] text-[#cb6f4d] hover:bg-[#f5e6df] transition-colors cursor-pointer"
                        >
                          <Eye size={13} />
                          View
                        </button>

                        {/* Block / Unban */}
                        <button
                          onClick={() => openModal("block", user)}
                          title={user.blocked ? "Unban user" : "Block user"}
                          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                            user.blocked
                              ? "border-[#cb6f4d] text-[#cb6f4d] hover:bg-[#f5e6df]"
                              : "border-amber-300 text-amber-600 hover:bg-amber-50"
                          }`}
                        >
                          {user.blocked ? (
                            <>
                              <ShieldCheck size={13} />
                              Unban
                            </>
                          ) : (
                            <>
                              <ShieldOff size={13} />
                              Block
                            </>
                          )}
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => openModal("delete", user)}
                          title="Delete user"
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                        >
                          <Trash2 size={13} />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-gray-400">
                    <p className="text-base font-medium">No users found</p>
                    <p className="text-sm mt-1">
                      {searchQuery
                        ? `No results for "${searchQuery}" in ${activeTab}`
                        : `No users in "${activeTab}"`}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-[#fcfdfe]">
            <p className="text-xs text-gray-400">
              Showing {(currentPage - 1) * PAGE_SIZE + 1}–
              {Math.min(currentPage * PAGE_SIZE, filteredUsers.length)} of{" "}
              {filteredUsers.length} users
            </p>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer text-gray-600"
              >
                <ChevronLeft size={16} />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(
                  (p) =>
                    p === 1 ||
                    p === totalPages ||
                    Math.abs(p - currentPage) <= 1
                )
                .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                  if (idx > 0 && typeof arr[idx - 1] === "number" && (p as number) - (arr[idx - 1] as number) > 1)
                    acc.push("…");
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === "…" ? (
                    <span key={`ellipsis-${i}`} className="px-2 text-gray-300 text-sm">
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p as number)}
                      className={`w-8 h-8 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                        currentPage === p
                          ? "bg-[#cb6f4d] text-white"
                          : "text-gray-500 hover:bg-gray-100"
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer text-gray-600"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Confirm Modal ── */}
      <ConfirmModal
        open={modal.open && modal.type === "block"}
        title={modal.user?.blocked ? "Unban User" : "Block User"}
        message={
          modal.user?.blocked
            ? `Unban ${modal.user?.username}? They'll regain full access.`
            : `Block ${modal.user?.username}? They won't be able to log in.`
        }
        confirmLabel={modal.user?.blocked ? "Yes, Unban" : "Yes, Block"}
        onConfirm={handleBlock}
        onCancel={closeModal}
      />

      <ConfirmModal
        open={modal.open && modal.type === "delete"}
        title="Delete User"
        message={`Permanently delete ${modal.user?.username}? This can't be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={closeModal}
      />

      {/* ── Toast ── */}
      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}