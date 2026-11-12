"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  Search,
  Scale,
  X,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Wallet,
  HelpCircle,
  Clock,
  ShieldAlert,
  Loader2,
  RefreshCw,
  Eye,
  FileText,
  AlertCircle,
  Ban,
  ShieldOff,
  User,
  ShoppingBag,
  ExternalLink,
} from "lucide-react";
import { BACKEND_URL } from "@/constants";

const API_BASE_URL = BACKEND_URL || "http://localhost:1337";

interface DisputeItem {
  id: number;
  documentId: string;
  disputeId: string;
  orderId: number;
  orderNumber: string;
  buyer: {
    id: number;
    username: string;
    email: string;
    blocked?: boolean;
  };
  seller: {
    id: number;
    username: string;
    email: string;
    bankAccountLast4?: string;
    stripeAccountId?: string;
    stripeConnectStatus?: string;
    blocked?: boolean;
  };
  product: {
    id: number;
    title: string;
    image: string;
    price: number;
  };
  orderAmount: number;
  commissionAmount: number;
  sellerAmount: number;
  reason: string;
  description: string;
  evidence: string | null;
  status:
    | "OPEN"
    | "UNDER_REVIEW"
    | "AWAITING_INFORMATION"
    | "RESOLVED_REFUND"
    | "RESOLVED_RELEASE"
    | "RESOLVED"
    | "REJECTED"
    | "CLOSED";
  resolution: string | null;
  adminNotes: string | null;
  adminDecision?: string | null;
  stripeRefundId?: string | null;
  refundStatus?: string;
  refundAmount: number;
  resolvedAt?: string | null;
  orderPaymentStatus?: string;
  orderPayoutStatus?: string;
  hasStripePayment?: boolean;
  payoutHoldStatus: "ON_HOLD" | "RELEASED" | "BLOCKED_REFUNDED" | "PAID";
  createdDate: string;
  deliveryDate: string | null;
  disputeDeadline: string | null;
  paymentDate: string | null;
}

const FINALIZED_STATUSES = [
  "RESOLVED_REFUND",
  "RESOLVED_RELEASE",
  "RESOLVED",
  "REJECTED",
  "CLOSED",
];

function resolveEvidenceUrl(rawUrl: string): string {
  const trimmed = String(rawUrl || "").trim();
  if (!trimmed) return "";
  const baseUrl = API_BASE_URL.replace(/\/+$/, "");
  if (trimmed.startsWith("/")) {
    return `${baseUrl}${trimmed}`;
  }
  if (trimmed.startsWith("uploads/")) {
    return `${baseUrl}/${trimmed}`;
  }
  const localMatch = trimmed.match(
    /^https?:\/\/(?:localhost|127\.0\.0\.1|10\.0\.2\.2|0\.0\.0\.0)(?::\d+)?(\/.*)?$/i,
  );
  if (localMatch) {
    return `${baseUrl}${localMatch[1] || ""}`;
  }
  return trimmed;
}

function parseEvidenceUrls(evidence: string | null | undefined): string[] {
  if (!evidence) return [];
  const trimmed = String(evidence).trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((u) => resolveEvidenceUrl(String(u || ""))).filter(Boolean);
      }
    } catch {}
  }
  return trimmed
    .split(/[\n,]+/)
    .map((u) => resolveEvidenceUrl(u))
    .filter(Boolean);
}

const STATUS_BADGES: Record<string, string> = {
  OPEN: "bg-rose-100 text-rose-800 border-rose-300 font-bold",
  UNDER_REVIEW: "bg-amber-100 text-amber-800 border-amber-300 font-bold",
  AWAITING_INFORMATION: "bg-purple-100 text-purple-800 border-purple-300 font-bold",
  RESOLVED_REFUND: "bg-blue-100 text-blue-800 border-blue-300 font-bold",
  RESOLVED_RELEASE: "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold",
  RESOLVED: "bg-teal-100 text-teal-800 border-teal-300 font-bold",
  REJECTED: "bg-gray-100 text-gray-800 border-gray-300",
  CLOSED: "bg-gray-100 text-gray-600 border-gray-200",
};

const REASON_LABELS: Record<string, string> = {
  ITEM_NOT_RECEIVED: "Item Not Received",
  DAMAGED_PRODUCT: "Damaged Product",
  WRONG_ITEM: "Wrong Item Delivered",
  PAYMENT_ISSUE: "Payment Issue",
  PRODUCT_NOT_AS_DESCRIBED: "Product Not As Described",
  MISSING_ITEMS: "Missing Items",
  OTHER: "Other",
};

const BAN_RECOMMEND_THRESHOLD = 3;

type DisputeActionType =
  | "UNDER_REVIEW"
  | "REQUEST_MORE_INFO"
  | "REFUND_BUYER"
  | "RELEASE_TO_SELLER"
  | "MARK_RESOLVED"
  | "REJECT_DISPUTE"
  | "CLOSE_DISPUTE";

interface DisputeActionPayload {
  disputeId: number | string;
  action: DisputeActionType;
  refundAmount?: number;
  resolution?: string;
  adminNotes?: string;
}

const GENERIC_NOTE_ACTION_CONFIG: Record<
  "UNDER_REVIEW" | "REQUEST_MORE_INFO" | "MARK_RESOLVED" | "REJECT_DISPUTE" | "CLOSE_DISPUTE",
  {
    title: string;
    targetStatus: DisputeItem["status"];
    badgeClass: string;
    description: string;
    label: string;
    placeholder: string;
    buttonLabel: string;
    loadingLabel: string;
    buttonClass: string;
    requireInput: boolean;
  }
> = {
  UNDER_REVIEW: {
    title: "Start Review / Add Admin Notes",
    targetStatus: "UNDER_REVIEW",
    badgeClass: "text-amber-700",
    description:
      "Moves active disputes to UNDER_REVIEW and records your investigation notes while keeping the seller payout ON HOLD.",
    label: "Admin Review Notes:",
    placeholder: "Record verification checks, seller/buyer statements, or internal investigation notes...",
    buttonLabel: "SAVE & MARK UNDER REVIEW",
    loadingLabel: "Saving Review Notes...",
    buttonClass: "bg-amber-600 hover:bg-amber-700",
    requireInput: true,
  },
  REQUEST_MORE_INFO: {
    title: "Request More Information",
    targetStatus: "AWAITING_INFORMATION",
    badgeClass: "text-purple-700",
    description:
      "Moves status to AWAITING_INFORMATION and notifies the buyer to upload additional photos/evidence. Seller payout stays ON HOLD.",
    label: "Required Explanation / Image Evidence Request for Buyer:",
    placeholder: "Specify clear photos, unboxing evidence, or courier proof needed from buyer...",
    buttonLabel: "SEND INFO REQUEST",
    loadingLabel: "Notifying Buyer...",
    buttonClass: "bg-purple-600 hover:bg-purple-700",
    requireInput: true,
  },
  MARK_RESOLVED: {
    title: "Mark Dispute as Resolved",
    targetStatus: "RESOLVED",
    badgeClass: "text-teal-700",
    description:
      "Marks dispute RESOLVED (e.g., settled mutually or offline) without triggering an automatic Stripe refund/transfer, and removes the dispute hold.",
    label: "Resolution Summary Note (Required):",
    placeholder: "Summarize how the dispute was resolved...",
    buttonLabel: "CONFIRM RESOLVED",
    loadingLabel: "Marking Resolved...",
    buttonClass: "bg-teal-600 hover:bg-teal-700",
    requireInput: true,
  },
  REJECT_DISPUTE: {
    title: "Reject Buyer Dispute",
    targetStatus: "REJECTED",
    badgeClass: "text-gray-800",
    description:
      "Marks dispute REJECTED when buyer claim is not upheld, lifts the dispute hold, and restores normal 48h seller payout eligibility.",
    label: "Rejection Reason (Required):",
    placeholder: "Explain why this dispute claim was rejected...",
    buttonLabel: "CONFIRM REJECT",
    loadingLabel: "Rejecting Dispute...",
    buttonClass: "bg-gray-800 hover:bg-gray-900",
    requireInput: true,
  },
  CLOSE_DISPUTE: {
    title: "Close Dispute",
    targetStatus: "CLOSED",
    badgeClass: "text-slate-700",
    description:
      "Closes the dispute (CLOSED) and lifts the dispute payout hold according to the order's 48h delivery schedule.",
    label: "Closure Reason (Required):",
    placeholder: "Enter reason for closing this dispute...",
    buttonLabel: "CONFIRM CLOSE",
    loadingLabel: "Closing Dispute...",
    buttonClass: "bg-slate-700 hover:bg-slate-800",
    requireInput: true,
  },
};

export default function DisputesPage() {
  const [disputes, setDisputes] = useState<DisputeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Selected Dispute for Details View Drawer / Modal
  const [selectedDispute, setSelectedDispute] = useState<DisputeItem | null>(null);

  // Modal Actions
  const [actionType, setActionType] = useState<DisputeActionType | null>(null);
  const [actionInput, setActionInput] = useState("");
  const [customRefundAmount, setCustomRefundAmount] = useState<number | "">("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Ban management
  const [banningUserId, setBanningUserId] = useState<number | null>(null);

  // Fetch disputes
  const fetchDisputes = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/disputes-full`, {
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Could not load disputes.");
      const json = await res.json();
      if (!json.ok || !Array.isArray(json.data)) {
        throw new Error("Dispute records are unavailable.");
      }
      setDisputes(json.data);
      setSelectedDispute((prev) =>
        prev ? json.data.find((d: DisputeItem) => d.id === prev.id) || prev : null
      );
    } catch (err) {
      setDisputes([]);
      setLoadError(err instanceof Error ? err.message : "Could not load disputes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDisputes();
  }, [fetchDisputes]);

  // Execute Dispute Admin Action
  const handleExecuteAction = async () => {
    if (!selectedDispute || !actionType) return;
    setActionLoading(true);
    setActionFeedback(null);

    try {
      const payload: DisputeActionPayload = {
        disputeId: selectedDispute.id || selectedDispute.documentId,
        action: actionType,
      };

      if (actionType === "REFUND_BUYER") {
        payload.refundAmount =
          customRefundAmount !== ""
            ? Number(customRefundAmount)
            : selectedDispute.refundAmount || selectedDispute.orderAmount;
        payload.resolution =
          actionInput.trim() ||
          `Refund of ${payload.refundAmount} THB authorized to buyer original payment method.`;
        payload.adminNotes = actionInput.trim() || undefined;
      } else if (actionType === "RELEASE_TO_SELLER") {
        if (!actionInput.trim()) {
          throw new Error("Admin resolution note is required when releasing payout to seller.");
        }
        payload.resolution = actionInput.trim();
        payload.adminNotes = actionInput.trim();
      } else if (actionType === "UNDER_REVIEW") {
        if (!actionInput.trim()) {
          throw new Error("Please enter admin review notes.");
        }
        payload.adminNotes = actionInput.trim();
      } else if (actionType === "REQUEST_MORE_INFO") {
        if (!actionInput.trim()) {
          throw new Error("Please provide instructions or questions for the buyer.");
        }
        payload.adminNotes = actionInput.trim();
        payload.resolution = `Admin requested info: ${actionInput.trim()}`;
      } else {
        if (!actionInput.trim()) {
          throw new Error("Please provide a resolution or closure reason.");
        }
        payload.resolution = actionInput.trim();
        payload.adminNotes = actionInput.trim();
      }

      const res = await fetch(`${API_BASE_URL}/api/admin/dispute-action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.message || json.error?.message || "Action failed.");
      }

      setActionFeedback({
        type: "success",
        message: json.message || "Action completed successfully.",
      });

      // Refresh dispute list & selected drawer data
      await fetchDisputes();

      setTimeout(() => {
        setActionType(null);
        setActionInput("");
        setCustomRefundAmount("");
        setActionFeedback(null);
      }, 1800);
    } catch (err: unknown) {
      setActionFeedback({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "Failed to execute dispute action.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // User Ban / Unban
  const handleToggleBanUser = async (userId: number, currentBlocked: boolean) => {
    setBanningUserId(userId);
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocked: !currentBlocked }),
      });
      if (res.ok) {
        await fetchDisputes();
      }
    } catch (err) {
      console.error("Error toggling ban:", err);
    } finally {
      setBanningUserId(null);
    }
  };

  // Filtered Disputes
  const filteredDisputes = disputes.filter((d) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      d.disputeId.toLowerCase().includes(q) ||
      d.orderNumber.toLowerCase().includes(q) ||
      d.buyer.username.toLowerCase().includes(q) ||
      d.seller.username.toLowerCase().includes(q) ||
      (d.reason && d.reason.toLowerCase().includes(q));

    let matchesFilter = true;
    if (statusFilter === "ALL") {
      matchesFilter = true;
    } else if (statusFilter === "RESOLVED_GROUP") {
      matchesFilter = FINALIZED_STATUSES.includes(d.status);
    } else {
      matchesFilter = d.status === statusFilter;
    }

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="p-4 md:p-8 bg-[#f8fafd] min-h-screen font-sans">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold text-[#2d3748]">
              Dispute &amp; Refund Management
            </h1>
            <span className="bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1">
              Escrow Protection
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Review buyer claims, examine evidence, request info, approve refunds, or release to
            sellers
          </p>
        </div>

        <button
          onClick={fetchDisputes}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium bg-white text-gray-700 hover:bg-gray-50 transition shadow-xs disabled:opacity-60"
        >
          <RefreshCw size={15} className={loading ? "animate-spin text-[#cb6f4d]" : ""} />
          <span>Refresh Disputes</span>
        </button>
      </div>

      {loadError && (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
        >
          {loadError}
        </div>
      )}

      {/* ── 4. DISPUTE MANAGEMENT PAGE & FILTERS (Requirement 4) ──────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#cb6f4d]"
            size={16}
          />
          <input
            type="text"
            placeholder="Search dispute ID, order #, buyer, seller..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-[#cb6f4d]/40 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#cb6f4d]/20 bg-white text-gray-800"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
          {[
            "ALL",
            "OPEN",
            "UNDER_REVIEW",
            "AWAITING_INFORMATION",
            "RESOLVED_GROUP",
            "RESOLVED_REFUND",
            "RESOLVED_RELEASE",
            "RESOLVED",
            "REJECTED",
            "CLOSED",
          ].map((filter) => {
            const labelMap: Record<string, string> = {
              ALL: "All Disputes",
              OPEN: "Open",
              UNDER_REVIEW: "Under Review",
              AWAITING_INFORMATION: "Awaiting Info",
              RESOLVED_GROUP: "All Finalized",
              RESOLVED_REFUND: "Resolved Refund",
              RESOLVED_RELEASE: "Resolved Release",
              RESOLVED: "Resolved",
              REJECTED: "Rejected",
              CLOSED: "Closed",
            };
            return (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  statusFilter === filter
                    ? "bg-[#cb6f4d] text-white shadow-xs"
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                }`}
              >
                {labelMap[filter] || filter}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table with EXACT Specified Columns */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[1100px]">
            <thead>
              <tr className="bg-[#ebf1f7] text-[#4a5568] text-xs font-semibold border-b border-gray-100">
                <th className="px-4 py-4">Dispute ID</th>
                <th className="px-4 py-4">Order Number</th>
                <th className="px-4 py-4">Buyer</th>
                <th className="px-4 py-4">Seller</th>
                <th className="px-4 py-4">Order Amount</th>
                <th className="px-4 py-4">Reason</th>
                <th className="px-4 py-4">Evidence</th>
                <th className="px-4 py-4">Created Date</th>
                <th className="px-4 py-4">Dispute Deadline</th>
                <th className="px-4 py-4 text-center">Status</th>
                <th className="px-4 py-4 text-center">Seller Payout Hold</th>
                <th className="px-4 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 12 }).map((__, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="h-4 bg-gray-100 rounded w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filteredDisputes.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-12 text-center text-sm text-gray-400">
                    No disputes found for this filter.
                  </td>
                </tr>
              ) : (
                filteredDisputes.map((d) => {
                  const evidenceList = parseEvidenceUrls(d.evidence);
                  return (
                    <tr key={d.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-4 text-sm font-bold text-gray-800">{d.disputeId}</td>
                      <td className="px-4 py-4 text-sm font-semibold text-[#cb6f4d]">
                        {d.orderNumber}
                      </td>
                      <td className="px-4 py-4 text-sm font-medium text-gray-800">
                        {d.buyer.username}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700">{d.seller.username}</td>
                      <td className="px-4 py-4 text-sm font-bold text-[#2d3748]">
                        {d.orderAmount.toLocaleString()} THB
                      </td>
                      <td className="px-4 py-4 text-xs font-semibold text-gray-700">
                        {REASON_LABELS[d.reason] || d.reason}
                      </td>
                      <td className="px-4 py-4 text-xs">
                        {evidenceList.length > 0 ? (
                          <a
                            href={evidenceList[0]}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[#cb6f4d] font-semibold hover:underline"
                          >
                            <span>View ({evidenceList.length})</span>
                            <ExternalLink size={12} />
                          </a>
                        ) : (
                          <span className="text-gray-400 italic">None</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-xs text-gray-500 whitespace-nowrap">
                        {new Date(d.createdDate).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </td>
                      <td className="px-4 py-4 text-xs text-gray-500 whitespace-nowrap">
                        {d.disputeDeadline
                          ? new Date(d.disputeDeadline).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wide border inline-block ${
                            STATUS_BADGES[d.status] || "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {d.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-md text-[10px] font-bold border uppercase tracking-wider inline-block ${
                            d.payoutHoldStatus === "ON_HOLD"
                              ? "bg-rose-100 text-rose-800 border-rose-300"
                              : d.payoutHoldStatus === "BLOCKED_REFUNDED"
                              ? "bg-blue-100 text-blue-800 border-blue-300"
                              : "bg-emerald-100 text-emerald-800 border-emerald-300"
                          }`}
                        >
                          {d.payoutHoldStatus.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedDispute(d);
                            setActionType(null);
                            setActionFeedback(null);
                          }}
                          className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-[#cb6f4d] hover:bg-[#f5e6df] transition shadow-2xs"
                        >
                          Review &amp; Resolve
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 5. DISPUTE DETAILS VIEW DRAWER (Requirement 5) ──────────────────── */}
      {selectedDispute && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-[#f8fafd]">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-[#2d3748]">
                    {selectedDispute.disputeId}
                  </h2>
                  <span
                    className={`px-2.5 py-0.5 rounded text-[10px] font-bold border uppercase ${
                      STATUS_BADGES[selectedDispute.status] || "bg-gray-100"
                    }`}
                  >
                    {selectedDispute.status.replace(/_/g, " ")}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Order {selectedDispute.orderNumber} • Filed on{" "}
                  {new Date(selectedDispute.createdDate).toLocaleDateString("en-GB")}
                </p>
              </div>
              <button
                onClick={() => setSelectedDispute(null)}
                className="p-2 rounded-xl hover:bg-gray-200 text-gray-500 transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Drawer Scrollable Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* 5.1 ORDER INFORMATION */}
              <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
                <h3 className="text-xs font-bold tracking-wider uppercase text-gray-400 flex items-center gap-1.5">
                  <ShoppingBag size={14} className="text-[#cb6f4d]" />
                  ORDER INFORMATION
                </h3>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-gray-400 block">Order Number</span>
                    <span className="font-bold text-[#cb6f4d]">{selectedDispute.orderNumber}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Product</span>
                    <span className="font-semibold text-gray-800">
                      {selectedDispute.product.title}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Buyer</span>
                    <span className="font-medium text-gray-700">
                      {selectedDispute.buyer.username} ({selectedDispute.buyer.email})
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Seller</span>
                    <span className="font-medium text-gray-700 block">
                      {selectedDispute.seller.username} ({selectedDispute.seller.email})
                    </span>
                    <span
                      className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                        selectedDispute.seller.stripeConnectStatus === "Connected"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
                      Stripe Connect: {selectedDispute.seller.stripeConnectStatus || "Not connected"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Delivery Confirmation</span>
                    <span className="font-medium text-gray-700">
                      {selectedDispute.deliveryDate
                        ? new Date(selectedDispute.deliveryDate).toLocaleString("en-GB")
                        : "Not confirmed"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Dispute Window Deadline</span>
                    <span className="font-medium text-gray-700">
                      {selectedDispute.disputeDeadline
                        ? new Date(selectedDispute.disputeDeadline).toLocaleString("en-GB")
                        : "Pending delivery"}
                    </span>
                  </div>
                </div>
              </div>

              {/* 5.2 PAYMENT BREAKDOWN */}
              <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
                <h3 className="text-xs font-bold tracking-wider uppercase text-gray-400 flex items-center gap-1.5">
                  <Wallet size={14} className="text-[#cb6f4d]" />
                  PAYMENT BREAKDOWN (10% Commission Model)
                </h3>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Customer Payment:</span>
                    <span className="font-bold text-gray-800">
                      {selectedDispute.orderAmount.toLocaleString()} THB
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Platform Commission (10%):</span>
                    <span className="font-semibold text-[#cb6f4d]">
                      {selectedDispute.commissionAmount.toLocaleString()} THB
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-gray-100 pt-2 font-bold">
                    <span className="text-gray-700">Seller Earnings (90%):</span>
                    <span className="text-emerald-700 font-extrabold">
                      {selectedDispute.sellerAmount.toLocaleString()} THB
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-gray-100 pt-2">
                    <span className="text-gray-500">Current Payout Status:</span>
                    <span
                      className={`font-black uppercase text-[11px] px-2 py-0.5 rounded ${
                        selectedDispute.payoutHoldStatus === "ON_HOLD"
                          ? "bg-rose-100 text-rose-800"
                          : selectedDispute.payoutHoldStatus === "BLOCKED_REFUNDED"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {selectedDispute.payoutHoldStatus.replace(/_/g, " ")}
                    </span>
                  </div>
                  {selectedDispute.stripeRefundId && (
                    <div className="flex justify-between text-[11px] text-blue-700 pt-1">
                      <span>Stripe Refund ID:</span>
                      <span className="font-mono font-semibold">{selectedDispute.stripeRefundId}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 5.3 DISPUTE INFORMATION */}
              <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
                <h3 className="text-xs font-bold tracking-wider uppercase text-gray-400 flex items-center gap-1.5">
                  <FileText size={14} className="text-[#cb6f4d]" />
                  DISPUTE INFORMATION
                </h3>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-gray-400 block">Reason</span>
                    <span className="font-bold text-gray-800">
                      {REASON_LABELS[selectedDispute.reason] || selectedDispute.reason}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Buyer Description &amp; Updates</span>
                    <p className="bg-[#f8fafd] p-3 rounded-xl text-gray-700 mt-1 border border-gray-100 leading-relaxed whitespace-pre-wrap">
                      {selectedDispute.description || "No description provided."}
                    </p>
                  </div>

                  {parseEvidenceUrls(selectedDispute.evidence).length > 0 && (
                    <div>
                      <span className="text-gray-400 block mb-1.5">
                        Uploaded Buyer Evidence ({parseEvidenceUrls(selectedDispute.evidence).length})
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {parseEvidenceUrls(selectedDispute.evidence).map((url, idx) => {
                          const isPdf = /\.pdf(?:\?|#|$)/i.test(url);
                          return (
                            <a
                              key={`${url}-${idx}`}
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="group relative rounded-xl border border-gray-200 overflow-hidden bg-gray-50 block"
                            >
                              {isPdf ? (
                                <div className="h-24 w-full flex flex-col items-center justify-center bg-[#f8fafd] text-[#cb6f4d] px-2">
                                  <span className="rounded-md bg-[#fdeae3] px-2.5 py-1 text-[11px] font-bold tracking-wide">
                                    PDF
                                  </span>
                                  <span className="mt-1.5 text-[10px] font-medium text-gray-500 truncate max-w-full">
                                    Click to open
                                  </span>
                                </div>
                              ) : (
                                <img
                                  src={url}
                                  alt={`Evidence ${idx + 1}`}
                                  className="h-24 w-full object-cover group-hover:scale-105 transition"
                                />
                              )}
                              <span className="flex items-center justify-between px-2 py-1 text-[10px] text-[#cb6f4d] font-semibold bg-white border-t border-gray-100">
                                <span>{isPdf ? `PDF #${idx + 1}` : `Image #${idx + 1}`}</span>
                                <ExternalLink size={10} />
                              </span>
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {selectedDispute.adminNotes && (
                    <div>
                      <span className="text-gray-400 block">Admin Notes</span>
                      <p className="bg-amber-50/60 p-3 rounded-xl text-amber-900 mt-1 border border-amber-200 leading-relaxed whitespace-pre-wrap">
                        {selectedDispute.adminNotes}
                      </p>
                    </div>
                  )}

                  {selectedDispute.resolution && (
                    <div>
                      <span className="text-gray-400 block">Resolution Decision</span>
                      <p className="bg-emerald-50/60 p-3 rounded-xl text-emerald-900 mt-1 border border-emerald-200 leading-relaxed whitespace-pre-wrap">
                        {selectedDispute.resolution}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* ── 5.4 ADMIN ACTIONS ────────────────────────────────────────── */}
              <div className="bg-linear-to-br from-white to-[#fff8f5] rounded-2xl border border-[#cb6f4d]/30 p-5 space-y-3">
                <h3 className="text-xs font-black tracking-wider uppercase text-[#cb6f4d]">
                  ADMIN RESOLUTION &amp; WORKFLOW ACTIONS
                </h3>
                {FINALIZED_STATUSES.includes(selectedDispute.status) ? (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-medium">
                    This dispute is finalized ({selectedDispute.status.replace(/_/g, " ")}).
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-gray-500">
                      Review and add notes to move to Under Review, ask buyer for image evidence (Awaiting Info), or apply a final financial/status outcome.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => {
                          setActionType("UNDER_REVIEW");
                          setActionInput("");
                          setActionFeedback(null);
                        }}
                        className="p-3 rounded-xl border border-amber-200 bg-amber-50/70 hover:bg-amber-100 text-amber-900 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Clock size={16} className="text-amber-700" />
                        <span>REVIEW &amp; ADD NOTES (UNDER REVIEW)</span>
                      </button>

                      <button
                        onClick={() => {
                          setActionType("REQUEST_MORE_INFO");
                          setActionInput("");
                          setActionFeedback(null);
                        }}
                        className="p-3 rounded-xl border border-purple-200 bg-purple-50/70 hover:bg-purple-100 text-purple-900 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <HelpCircle size={16} className="text-purple-700" />
                        <span>REQUEST INFO / IMAGES</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          setActionType("REFUND_BUYER");
                          setCustomRefundAmount(selectedDispute.refundAmount || selectedDispute.orderAmount);
                          setActionInput("");
                          setActionFeedback(null);
                        }}
                        className="p-3 rounded-xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100 text-rose-900 text-xs font-bold transition flex flex-col items-center text-center gap-1 cursor-pointer"
                      >
                        <RotateCcw size={18} className="text-rose-600" />
                        <span>REFUND BUYER (STRIPE)</span>
                      </button>

                      <button
                        onClick={() => {
                          setActionType("RELEASE_TO_SELLER");
                          setActionInput("");
                          setActionFeedback(null);
                        }}
                        className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-900 text-xs font-bold transition flex flex-col items-center text-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 size={18} className="text-emerald-600" />
                        <span>PAYOUT TO SELLER (STRIPE CONNECT)</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <button
                        onClick={() => {
                          setActionType("MARK_RESOLVED");
                          setActionInput("");
                          setActionFeedback(null);
                        }}
                        className="p-2.5 rounded-xl border border-teal-200 bg-teal-50/70 hover:bg-teal-100 text-teal-800 text-[11px] font-bold transition cursor-pointer"
                      >
                        MARK RESOLVED
                      </button>
                      <button
                        onClick={() => {
                          setActionType("REJECT_DISPUTE");
                          setActionInput("");
                          setActionFeedback(null);
                        }}
                        className="p-2.5 rounded-xl border border-gray-300 bg-gray-100 hover:bg-gray-200 text-gray-800 text-[11px] font-bold transition cursor-pointer"
                      >
                        REJECT DISPUTE
                      </button>
                      <button
                        onClick={() => {
                          setActionType("CLOSE_DISPUTE");
                          setActionInput("");
                          setActionFeedback(null);
                        }}
                        className="p-2.5 rounded-xl border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold transition cursor-pointer"
                      >
                        CLOSE DISPUTE
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 6. REFUND BUYER CONFIRMATION MODAL ──────────────── */}
      {actionType === "REFUND_BUYER" && selectedDispute && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                  <RotateCcw size={16} />
                </div>
                <h3 className="font-bold text-gray-800 text-base">Refund Buyer via Stripe</h3>
              </div>
              <button
                onClick={() => setActionType(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs text-gray-700">
              <div className="bg-[#f8fafd] p-4 rounded-2xl border border-gray-100 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Order:</span>
                  <span className="font-bold text-[#cb6f4d]">#{selectedDispute.orderId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Buyer:</span>
                  <span className="font-semibold text-gray-800">{selectedDispute.buyer.username}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Original Payment:</span>
                  <span className="font-semibold text-gray-800">
                    {selectedDispute.orderAmount.toLocaleString()} THB
                  </span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-2 font-bold">
                  <span className="text-gray-700">Refund Amount:</span>
                  <span className="text-rose-600 font-extrabold text-sm">
                    {Number(customRefundAmount || selectedDispute.orderAmount).toLocaleString()} THB
                  </span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Refund Reason:</span>
                  <span>{REASON_LABELS[selectedDispute.reason] || selectedDispute.reason}</span>
                </div>
              </div>

              {selectedDispute.hasStripePayment === false && (
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-800 text-[11px]">
                  This order has no Stripe PaymentIntent/Charge attached, so a live Stripe refund cannot be processed.
                </div>
              )}

              <p className="text-gray-600 leading-relaxed">
                This action issues a real Stripe refund to the buyer&apos;s original payment method,
                updates status to <span className="font-bold">RESOLVED_REFUND</span>, and permanently cancels seller payout.
              </p>

              <div>
                <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                  Custom Refund Amount (THB):
                </label>
                <input
                  type="number"
                  value={customRefundAmount}
                  onChange={(e) =>
                    setCustomRefundAmount(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  max={selectedDispute.orderAmount}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-rose-200"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                  Admin Resolution Note:
                </label>
                <textarea
                  placeholder="Explain reason for refund (visible in audit trail)..."
                  value={actionInput}
                  onChange={(e) => setActionInput(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-rose-200 h-20"
                />
              </div>

              {actionFeedback && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                    actionFeedback.type === "success"
                      ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
                      : "bg-rose-50 text-rose-900 border border-rose-200"
                  }`}
                >
                  {actionFeedback.type === "success" ? (
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <span>{actionFeedback.message}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                onClick={() => setActionType(null)}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition"
              >
                CANCEL
              </button>
              <button
                onClick={handleExecuteAction}
                disabled={actionLoading}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Processing Stripe Refund...</span>
                  </>
                ) : (
                  <span>CONFIRM STRIPE REFUND</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 7. PAYOUT TO SELLER (STRIPE CONNECT) CONFIRMATION MODAL ─────────── */}
      {actionType === "RELEASE_TO_SELLER" && selectedDispute && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <CheckCircle2 size={16} />
                </div>
                <h3 className="font-bold text-gray-800 text-base">Payout to Seller (Stripe Connect)</h3>
              </div>
              <button
                onClick={() => setActionType(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs text-gray-700">
              <div className="bg-[#f8fafd] p-4 rounded-2xl border border-gray-100 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Order:</span>
                  <span className="font-bold text-[#cb6f4d]">#{selectedDispute.orderId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Seller:</span>
                  <span className="font-semibold text-gray-800">{selectedDispute.seller.username}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Seller Stripe Connect:</span>
                  <span
                    className={`font-bold ${
                      selectedDispute.seller.stripeConnectStatus === "Connected"
                        ? "text-emerald-700"
                        : "text-rose-700"
                    }`}
                  >
                    {selectedDispute.seller.stripeConnectStatus || "Not connected"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Seller Earnings (90%):</span>
                  <span className="font-extrabold text-emerald-700 text-sm">
                    {selectedDispute.sellerAmount.toLocaleString()} THB
                  </span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Dispute Reason:</span>
                  <span>{REASON_LABELS[selectedDispute.reason] || selectedDispute.reason}</span>
                </div>
              </div>

              {selectedDispute.seller.stripeConnectStatus !== "Connected" ? (
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-900 leading-relaxed text-[11px]">
                  <span className="font-bold">STRIPE CONNECT REQUIRED: </span>
                  Seller does not have a connected Stripe account yet. They must connect Stripe in
                  Settings -&gt; Payments first, or choose Reject/Close Dispute instead.
                </div>
              ) : (
                <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200 text-emerald-900 leading-relaxed text-[11px]">
                  <span className="font-bold">LIVE STRIPE TRANSFER: </span>
                  Confirming this will execute an immediate Stripe Connect transfer of{" "}
                  {selectedDispute.sellerAmount.toLocaleString()} THB to the seller&apos;s connected
                  account and mark the dispute <span className="font-bold">RESOLVED_RELEASE</span>.
                </div>
              )}

              <div>
                <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                  Admin Resolution Decision Note (Required):
                </label>
                <textarea
                  placeholder="Explain why the dispute was decided in favor of seller (required)..."
                  value={actionInput}
                  onChange={(e) => setActionInput(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-200 h-20"
                />
              </div>

              {actionFeedback && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                    actionFeedback.type === "success"
                      ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
                      : "bg-rose-50 text-rose-900 border border-rose-200"
                  }`}
                >
                  {actionFeedback.type === "success" ? (
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <span>{actionFeedback.message}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                onClick={() => setActionType(null)}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition"
              >
                CANCEL
              </button>
              <button
                onClick={handleExecuteAction}
                disabled={
                  actionLoading ||
                  !actionInput.trim() ||
                  selectedDispute.seller.stripeConnectStatus !== "Connected"
                }
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Transferring to Seller...</span>
                  </>
                ) : (
                  <span>CONFIRM STRIPE PAYOUT</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 8. STATUS / NOTES / INFO / FINALIZE MODAL ────────────────── */}
      {actionType &&
        actionType !== "REFUND_BUYER" &&
        actionType !== "RELEASE_TO_SELLER" &&
        selectedDispute && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-gray-100 text-gray-700 flex items-center justify-center">
                    <FileText size={16} />
                  </div>
                  <h3 className="font-bold text-gray-800 text-base">
                    {GENERIC_NOTE_ACTION_CONFIG[actionType].title}
                  </h3>
                </div>
                <button
                  onClick={() => setActionType(null)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="py-4 space-y-3 text-xs text-gray-700">
                <p className="text-gray-600 leading-relaxed">
                  {GENERIC_NOTE_ACTION_CONFIG[actionType].description}{" "}
                  Target status:{" "}
                  <span className={`font-bold ${GENERIC_NOTE_ACTION_CONFIG[actionType].badgeClass}`}>
                    {GENERIC_NOTE_ACTION_CONFIG[actionType].targetStatus}
                  </span>
                </p>

                <div>
                  <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                    {GENERIC_NOTE_ACTION_CONFIG[actionType].label}
                  </label>
                  <textarea
                    placeholder={GENERIC_NOTE_ACTION_CONFIG[actionType].placeholder}
                    value={actionInput}
                    onChange={(e) => setActionInput(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#cb6f4d]/20 h-24"
                  />
                </div>

                {actionFeedback && (
                  <div
                    className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                      actionFeedback.type === "success"
                        ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
                        : "bg-rose-50 text-rose-900 border border-rose-200"
                    }`}
                  >
                    {actionFeedback.type === "success" ? (
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <span>{actionFeedback.message}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  onClick={() => setActionType(null)}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleExecuteAction}
                  disabled={
                    actionLoading ||
                    (GENERIC_NOTE_ACTION_CONFIG[actionType].requireInput && !actionInput.trim())
                  }
                  className={`px-5 py-2 rounded-xl text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${GENERIC_NOTE_ACTION_CONFIG[actionType].buttonClass}`}
                >
                  {actionLoading ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>{GENERIC_NOTE_ACTION_CONFIG[actionType].loadingLabel}</span>
                    </>
                  ) : (
                    <span>{GENERIC_NOTE_ACTION_CONFIG[actionType].buttonLabel}</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
