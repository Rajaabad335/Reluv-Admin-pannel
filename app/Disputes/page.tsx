"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import { Search, ChevronDown, Mail, X, Check, AlertCircle, ShieldAlert, ShieldOff, Ban, ClipboardEdit } from "lucide-react";
import { BACKEND_URL } from "@/constants";

// ── Types ──────────────────────────────────────────────────────────────────────
interface DisputeUser {
  id: number;
  username: string;
  email: string;
  blocked?: boolean;
}

interface DisputeOrder {
  id: number;
  documentId?: string;
}

interface Dispute {
  id: number;
  documentId: string;
  order: DisputeOrder | null;
  raisedBy: DisputeUser | null;
  recievedBy: DisputeUser | null;
  reason: string | null;
  description: string | null;
  status: "OPEN" | "UNDER_REVIEW" | "RESOLVED" | "REJECTED" | "CLOSED";
  resolution: string | null;
  refundAmount: number | null;
}

// ── Constants ──────────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, string> = {
  OPEN:         "bg-[#cb6f4d] text-white",
  UNDER_REVIEW: "bg-amber-400 text-white",
  RESOLVED:     "bg-[#56ab65] text-white",
  REJECTED:     "bg-red-500 text-white",
  CLOSED:       "bg-gray-400 text-white",
};

const STATUS_LABELS: Record<string, string> = {
  OPEN:         "Open",
  UNDER_REVIEW: "Under Review",
  RESOLVED:     "Resolved",
  REJECTED:     "Rejected",
  CLOSED:       "Closed",
};

const REASON_LABELS: Record<string, string> = {
  ITEM_NOT_RECEIVED: "Item Not Received",
  DAMAGED_PRODUCT:   "Damaged Product",
  WRONG_ITEM:        "Wrong Item",
  PAYMENT_ISSUE:     "Payment Issue",
};

const ALL_STATUSES = ["OPEN", "UNDER_REVIEW", "RESOLVED", "REJECTED", "CLOSED"];

// Number of RESOLVED (i.e. substantiated) disputes against a user before we
// flag them as a ban candidate. Tweak this as your policy evolves.
const BAN_RECOMMEND_THRESHOLD = 3;

// ── Detail / Action Drawer ─────────────────────────────────────────────────────
function DisputeDrawer({
  dispute,
  allDisputes,
  onClose,
  onStatusUpdate,
  onBanUser,
}: {
  dispute: Dispute;
  allDisputes: Dispute[];
  onClose: () => void;
  onStatusUpdate: (id: string, status: string, resolution: string) => Promise<void>;
  onBanUser: (userId: number, block: boolean) => Promise<void>;
}) {
  const [status, setStatus] = useState(dispute.status);
  const [resolution, setResolution] = useState(dispute.resolution ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [confirmingBan, setConfirmingBan] = useState(false);
  const [banning, setBanning] = useState(false);

  useEffect(() => {
    setStatus(dispute.status);
    setResolution(dispute.resolution ?? "");
    setConfirmingBan(false);
  }, [dispute.documentId]);

  const handleSave = async () => {
    setSaving(true);
    await onStatusUpdate(dispute.documentId, status, resolution);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const targetUser = dispute.recievedBy;
  const isBlocked = !!targetUser?.blocked;

  const handleBanClick = async () => {
    if (!targetUser) return;
    if (!confirmingBan) {
      setConfirmingBan(true);
      return;
    }
    setBanning(true);
    await onBanUser(targetUser.id, !isBlocked);
    setBanning(false);
    setConfirmingBan(false);
  };

  // ── Disputes history against this same user ────────────────────────────────
  const disputesAgainstUser = useMemo(() => {
    if (!targetUser) return [];
    return allDisputes.filter((d) => d.recievedBy?.id === targetUser.id);
  }, [allDisputes, targetUser]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      OPEN: 0, UNDER_REVIEW: 0, RESOLVED: 0, REJECTED: 0, CLOSED: 0,
    };
    disputesAgainstUser.forEach((d) => {
      counts[d.status] = (counts[d.status] ?? 0) + 1;
    });
    return counts;
  }, [disputesAgainstUser]);

  const totalAgainst = disputesAgainstUser.length;
  const resolvedAgainst = statusCounts.RESOLVED;
  const pendingAgainst = statusCounts.OPEN + statusCounts.UNDER_REVIEW;
  const banRecommended = resolvedAgainst >= BAN_RECOMMEND_THRESHOLD;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col z-10">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-800">Dispute #{dispute.id}</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Order #{dispute.order?.id ?? "—"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 bg-[#fbfcfe]">
          {/* Parties */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#fdf4f1] rounded-xl p-4">
              <p className="text-[10px] font-bold text-[#cb6f4d] uppercase mb-1">Raised By</p>
              <p className="text-sm font-semibold text-gray-800">
                {dispute.raisedBy?.username ?? "—"}
              </p>
              <p className="text-xs text-gray-400 truncate">
                {dispute.raisedBy?.email ?? ""}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Against</p>
              <p className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                {dispute.recievedBy?.username ?? "—"}
                {isBlocked && (
                  <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-red-100 text-red-600">
                    BANNED
                  </span>
                )}
              </p>
              <p className="text-xs text-gray-400 truncate">
                {dispute.recievedBy?.email ?? ""}
              </p>
            </div>
          </div>

          {/* Reason + Refund */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Reason</p>
              <p className="text-sm font-medium text-gray-700">
                {dispute.reason ? REASON_LABELS[dispute.reason] : "—"}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Refund Amount</p>
              <p className="text-sm font-medium text-gray-700">
                {dispute.refundAmount != null
                  ? `฿${dispute.refundAmount.toFixed(2)}`
                  : "—"}
              </p>
            </div>
          </div>

          {/* Description */}
          {dispute.description && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Description</p>
              <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 leading-relaxed">
                {dispute.description}
              </p>
            </div>
          )}

          {/* ── ACTIONS — one outer panel, two inner cards ────────────────────── */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase mb-2 px-0.5">
              Actions
            </p>

            <div className="bg-gradient-to-b from-gray-100/60 to-gray-50/40 rounded-2xl p-3 space-y-3 border border-gray-100">

              {/* ── Card 1: Update Dispute ─────────────────────────────────── */}
              <div className="bg-white rounded-xl shadow-md shadow-gray-200/60 border border-[#f0ded4] overflow-hidden">
                <div className="flex items-center gap-2 px-4 pt-4">
                  <div className="w-7 h-7 rounded-lg bg-[#fdf4f1] flex items-center justify-center flex-shrink-0">
                    <ClipboardEdit size={14} className="text-[#cb6f4d]" />
                  </div>
                  <p className="text-xs font-bold text-gray-700">Update Dispute</p>
                </div>

                <div className="p-4 space-y-3">
                  {/* Status pills */}
                  <div className="grid grid-cols-2 gap-1.5">
                    {ALL_STATUSES.map((s) => (
                      <button
                        key={s}
                        onClick={() => setStatus(s as Dispute["status"])}
                        className={`py-2 px-2.5 rounded-lg text-[11px] font-semibold border transition-all ${
                          status === s
                            ? `${STATUS_STYLES[s]} border-transparent shadow-sm`
                            : "bg-white border-gray-200 text-gray-500 hover:border-[#cb6f4d]/40"
                        }`}
                      >
                        {STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>

                  {/* Resolution note */}
                  <textarea
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    rows={3}
                    placeholder="Add a resolution note..."
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#cb6f4d]/30 focus:border-[#cb6f4d] resize-none transition"
                  />

                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full py-2.5 rounded-xl bg-[#cb6f4d] text-white text-sm font-semibold hover:bg-[#b5623f] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Saving…
                      </>
                    ) : saved ? (
                      <>
                        <Check size={16} /> Saved
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </button>
                </div>
              </div>

              {/* ── Card 2: Account Action (+ history) ─────────────────────── */}
              <div
                className={`bg-white rounded-xl shadow-md overflow-hidden border ${
                  banRecommended ? "border-red-200" : "border-gray-150"
                }`}
              >
                <div className="flex items-center justify-between px-4 pt-4">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        banRecommended ? "bg-red-50" : "bg-gray-100"
                      }`}
                    >
                      <ShieldAlert
                        size={14}
                        className={banRecommended ? "text-red-500" : "text-gray-400"}
                      />
                    </div>
                    <p className="text-xs font-bold text-gray-700">Account Action</p>
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">
                    {totalAgainst} total
                  </span>
                </div>

                <div className="p-4 space-y-3">
                  {/* History strip */}
                  <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">
                      History vs {dispute.recievedBy?.username ?? "This User"}
                    </p>

                    <div className="flex flex-wrap gap-1.5">
                      {ALL_STATUSES.map((s) =>
                        statusCounts[s] > 0 ? (
                          <span
                            key={s}
                            className={`px-2 py-1 rounded-md text-[10px] font-bold ${STATUS_STYLES[s]}`}
                          >
                            {statusCounts[s]} {STATUS_LABELS[s]}
                          </span>
                        ) : null
                      )}
                      {totalAgainst === 0 && (
                        <span className="text-xs text-gray-400">No prior disputes on record.</span>
                      )}
                    </div>

                    {totalAgainst > 1 && (
                      <div className="space-y-1 max-h-24 overflow-y-auto pt-1">
                        {disputesAgainstUser
                          .filter((d) => d.documentId !== dispute.documentId)
                          .map((d) => (
                            <div
                              key={d.documentId}
                              className="flex items-center justify-between bg-white rounded-lg px-2.5 py-1 border border-gray-100"
                            >
                              <span className="text-[11px] text-gray-500">
                                #{d.id} · {d.reason ? REASON_LABELS[d.reason] : "—"}
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                  STATUS_STYLES[d.status] ?? "bg-gray-200 text-gray-500"
                                }`}
                              >
                                {STATUS_LABELS[d.status] ?? d.status}
                              </span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* Ban recommendation / pending notice */}
                  {banRecommended && (
                    <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-[11px] font-medium rounded-lg px-3 py-2">
                      <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
                      <span>
                        {resolvedAgainst} resolved dispute{resolvedAgainst !== 1 ? "s" : ""} found —
                        meets threshold for ban review.
                      </span>
                    </div>
                  )}
                  {!banRecommended && pendingAgainst > 0 && (
                    <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-medium rounded-lg px-3 py-2">
                      <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
                      <span>
                        {pendingAgainst} dispute{pendingAgainst !== 1 ? "s" : ""} still pending review.
                      </span>
                    </div>
                  )}

                  {/* Ban / Unban control */}
                  {!confirmingBan ? (
                    <button
                      onClick={handleBanClick}
                      disabled={!targetUser}
                      className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-60 flex items-center justify-center gap-2 border ${
                        isBlocked
                          ? "bg-white border-[#cb6f4d] text-[#cb6f4d] hover:bg-[#fdf4f1]"
                          : "bg-white border-red-300 text-red-600 hover:bg-red-50"
                      }`}
                    >
                      {isBlocked ? (
                        <>
                          <ShieldOff size={16} /> Unban {dispute.recievedBy?.username ?? "User"}
                        </>
                      ) : (
                        <>
                          <Ban size={16} /> Ban {dispute.recievedBy?.username ?? "User"}
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-[11px] text-gray-500 text-center">
                        {isBlocked
                          ? "Confirm you want to lift this ban?"
                          : "Confirm — this will block the user from the marketplace."}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setConfirmingBan(false)}
                          disabled={banning}
                          className="flex-1 py-2.5 rounded-xl text-xs font-semibold border border-gray-200 text-gray-500 hover:bg-gray-100 transition-all disabled:opacity-60"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleBanClick}
                          disabled={banning}
                          className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-red-500 text-white hover:bg-red-600 transition-all disabled:opacity-60 flex items-center justify-center gap-1.5"
                        >
                          {banning ? (
                            <>
                              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              {isBlocked ? "Unbanning…" : "Banning…"}
                            </>
                          ) : isBlocked ? (
                            "Confirm Unban"
                          ) : (
                            "Confirm Ban"
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function Disputes() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [filtered, setFiltered] = useState<Dispute[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Dispute | null>(null);
  const hasFetched = useRef(false);

  // ── Fetch ────────────────────────────────────────────────────────────────────
  const fetchDisputes = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `${BACKEND_URL}/api/disputes?populate[order]=true&populate[raisedBy]=true&populate[recievedBy]=true&pagination[pageSize]=100`,
        { headers: { "Content-Type": "application/json" } }
      );
      if (!res.ok) throw new Error("Failed to fetch disputes");
      const json = await res.json();
      const data: Dispute[] = json.data ?? [];
      setDisputes(data);
      setFiltered(data);
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchDisputes();
  }, []);

  // ── Search filter ─────────────────────────────────────────────────────────
  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      disputes.filter(
        (d) =>
          String(d.id).includes(q) ||
          String(d.order?.id ?? "").includes(q) ||
          d.raisedBy?.username?.toLowerCase().includes(q) ||
          d.recievedBy?.username?.toLowerCase().includes(q) ||
          d.status?.toLowerCase().includes(q) ||
          (d.reason ? REASON_LABELS[d.reason].toLowerCase().includes(q) : false)
      )
    );
  }, [search, disputes]);

  // ── Status update ──────────────────────────────────────────────────────────
  const handleStatusUpdate = async (
    documentId: string,
    status: string,
    resolution: string
  ) => {
    try {
      const res = await fetch(
        `${BACKEND_URL}/api/disputes/${documentId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ data: { status, resolution } }),
        }
      );
      if (!res.ok) throw new Error("Update failed");

      setDisputes((prev) =>
        prev.map((d) =>
          d.documentId === documentId
            ? { ...d, status: status as Dispute["status"], resolution }
            : d
        )
      );
      setSelected((prev) =>
        prev && prev.documentId === documentId
          ? { ...prev, status: status as Dispute["status"], resolution }
          : prev
      );
    } catch (err) {
      console.error("Failed to update dispute:", err);
    }
  };

  // ── Ban / Unban user ─────────────────────────────────────────────────────────
  const handleBanUser = async (userId: number, block: boolean) => {
    try {
      // users-permissions PUT uses a flat body, no `data:` wrapper
      const res = await fetch(`${BACKEND_URL}/api/users/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ blocked: block }),
      });
      if (!res.ok) throw new Error("Failed to update user ban status");

      setDisputes((prev) =>
        prev.map((d) =>
          d.recievedBy?.id === userId
            ? { ...d, recievedBy: { ...d.recievedBy!, blocked: block } }
            : d
        )
      );
      setSelected((prev) =>
        prev && prev.recievedBy?.id === userId
          ? { ...prev, recievedBy: { ...prev.recievedBy!, blocked: block } }
          : prev
      );
    } catch (err) {
      console.error("Failed to ban/unban user:", err);
    }
  };

  // ── Skeleton ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafd] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#cb6f4d] border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm font-medium">Loading disputes…</p>
        </div>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[300px]">
        <div className="flex flex-col items-center gap-3 text-center">
          <AlertCircle size={32} className="text-red-400" />
          <p className="text-sm text-gray-500">{error}</p>
          <button
            onClick={fetchDisputes}
            className="px-4 py-2 bg-[#cb6f4d] text-white text-sm rounded-lg hover:bg-[#b5623f] transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-[#f8fafd] min-h-screen font-sans">

      {/* Search */}
      <div className="mb-6 md:mb-8">
        <div className="relative w-full md:max-w-sm">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#cb6f4d]"
            size={18}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ID, user, status, reason…"
            className="w-full pl-10 pr-4 py-2.5 border border-[#cb6f4d] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cb6f4d]/20 bg-white shadow-sm text-sm text-gray-800"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[820px]">
            <thead>
              <tr className="bg-[#ebf1f7] text-[#4a5568] text-xs font-bold uppercase">
                <th className="px-6 py-4">#</th>
                <th className="px-6 py-4">Order</th>
                <th className="px-6 py-4">Raised By</th>
                <th className="px-6 py-4">Against</th>
                <th className="px-6 py-4">Reason</th>
                <th className="px-6 py-4">Refund</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-sm text-gray-400">
                    No disputes found.
                  </td>
                </tr>
              ) : (
                filtered.map((dispute) => (
                  <tr
                    key={dispute.id}
                    className="hover:bg-gray-50/60 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm font-bold text-gray-700">
                      {dispute.id}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-600">
                      #{dispute.order?.id ?? "—"}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-gray-800">
                        {dispute.raisedBy?.username ?? "—"}
                      </p>
                      <p className="text-xs text-gray-400">
                        {dispute.raisedBy?.email ?? ""}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                        {dispute.recievedBy?.username ?? "—"}
                        {dispute.recievedBy?.blocked && (
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-red-100 text-red-600">
                            BANNED
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400">
                        {dispute.recievedBy?.email ?? ""}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {dispute.reason ? REASON_LABELS[dispute.reason] : "—"}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-800">
                      {dispute.refundAmount != null
                        ? `TBH${dispute.refundAmount.toFixed(2)}`
                        : "—"}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`px-3 py-1.5 rounded-md text-[10px] font-bold inline-block ${
                          STATUS_STYLES[dispute.status] ?? "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {STATUS_LABELS[dispute.status] ?? dispute.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end">
                        <div className="flex items-center border border-[#cb6f4d] rounded-md overflow-hidden shadow-sm">
                          <button
                            onClick={() => setSelected(dispute)}
                            className="px-3   text-[#cb6f4d]"
                            title="View details"
                          >
                            Update
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer */}
      {selected && (
        <DisputeDrawer
          dispute={selected}
          allDisputes={disputes}
          onClose={() => setSelected(null)}
          onStatusUpdate={handleStatusUpdate}
          onBanUser={handleBanUser}
        />
      )}
    </div>
  );
}