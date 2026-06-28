"use client";

import React, { useEffect, useRef, useState } from "react";
import { Search, ChevronDown, Mail, X, Check, AlertCircle } from "lucide-react";
import { BACKEND_URL } from "@/constants";

// ── Types ──────────────────────────────────────────────────────────────────────
interface DisputeUser {
  id: number;
  username: string;
  email: string;
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

// ── Detail / Action Drawer ─────────────────────────────────────────────────────
function DisputeDrawer({
  dispute,
  onClose,
  onStatusUpdate,
}: {
  dispute: Dispute;
  onClose: () => void;
  onStatusUpdate: (id: string, status: string, resolution: string) => Promise<void>;
}) {
  const [status, setStatus] = useState(dispute.status);
  const [resolution, setResolution] = useState(dispute.resolution ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onStatusUpdate(dispute.documentId, status, resolution);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

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
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
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
              <p className="text-sm font-semibold text-gray-800">
                {dispute.recievedBy?.username ?? "—"}
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

          <div className="border-t border-gray-100" />

          {/* Update Status */}
          <div>
            <p className="text-xs font-bold text-gray-700 mb-2">Update Status</p>
            <div className="grid grid-cols-2 gap-2">
              {ALL_STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s as Dispute["status"])}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                    status === s
                      ? `${STATUS_STYLES[s]} border-transparent`
                      : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          {/* Resolution Note */}
          <div>
            <p className="text-xs font-bold text-gray-700 mb-2">Resolution Note</p>
            <textarea
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              rows={4}
              placeholder="Add a resolution note..."
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#cb6f4d]/30 focus:border-[#cb6f4d] resize-none transition"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 rounded-xl bg-[#cb6f4d] text-white text-sm font-semibold hover:bg-[#b5623f] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
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
      const token = localStorage.getItem("jwt");
      const res = await fetch(
        `${BACKEND_URL}/api/disputes?populate[order]=true&populate[raisedBy]=true&populate[recievedBy]=true&pagination[pageSize]=100`,
        { headers: { Authorization: `Bearer ${token}` } }
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
      const token = localStorage.getItem("jwt");
      const res = await fetch(
        `${BACKEND_URL}/api/disputes/${documentId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ data: { status, resolution } }),
        }
      );
      if (!res.ok) throw new Error("Update failed");

      // Optimistic update in local state
      setDisputes((prev) =>
        prev.map((d) =>
          d.documentId === documentId
            ? { ...d, status: status as Dispute["status"], resolution }
            : d
        )
      );
      // Also update selected so drawer reflects change immediately
      setSelected((prev) =>
        prev && prev.documentId === documentId
          ? { ...prev, status: status as Dispute["status"], resolution }
          : prev
      );
    } catch (err) {
      console.error("Failed to update dispute:", err);
    }
  };

  // ── Skeleton ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-4 md:p-8 bg-[#f8fafd] min-h-screen">
        <div className="h-10 w-64 bg-gray-200 rounded-lg animate-pulse mb-8" />
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-6 px-6 py-5 border-b border-gray-50">
              {[...Array(6)].map((_, j) => (
                <div
                  key={j}
                  className="h-4 bg-gray-100 rounded animate-pulse"
                  style={{ width: `${[40, 80, 120, 100, 90, 70][j]}px` }}
                />
              ))}
            </div>
          ))}
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
                      <p className="text-sm font-semibold text-gray-800">
                        {dispute.recievedBy?.username ?? "—"}
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
                        ? `฿${dispute.refundAmount.toFixed(2)}`
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
          onClose={() => setSelected(null)}
          onStatusUpdate={handleStatusUpdate}
        />
      )}
    </div>
  );
}