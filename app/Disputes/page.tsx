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
  refundAmount: number;
  payoutHoldStatus: "ON_HOLD" | "RELEASED" | "BLOCKED_REFUNDED";
  createdDate: string;
  deliveryDate: string | null;
  disputeDeadline: string | null;
  paymentDate: string | null;
}

const STATUS_BADGES: Record<string, string> = {
  OPEN: "bg-rose-100 text-rose-800 border-rose-300 font-bold",
  UNDER_REVIEW: "bg-amber-100 text-amber-800 border-amber-300 font-bold",
  AWAITING_INFORMATION: "bg-purple-100 text-purple-800 border-purple-300 font-bold",
  RESOLVED_REFUND: "bg-blue-100 text-blue-800 border-blue-300 font-bold",
  RESOLVED_RELEASE: "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold",
  RESOLVED: "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold",
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

interface DisputeActionPayload {
  disputeId: number | string;
  action: "REFUND_BUYER" | "RELEASE_TO_SELLER" | "REQUEST_MORE_INFO";
  refundAmount?: number;
  resolution?: string;
  adminNotes?: string;
}

export default function DisputesPage() {
  const [disputes, setDisputes] = useState<DisputeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Selected Dispute for Details View Drawer / Modal
  const [selectedDispute, setSelectedDispute] = useState<DisputeItem | null>(null);

  // Modal Actions
  const [actionType, setActionType] = useState<
    "REFUND_BUYER" | "RELEASE_TO_SELLER" | "REQUEST_MORE_INFO" | null
  >(null);
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
        payload.adminNotes = actionInput.trim();
      } else if (actionType === "RELEASE_TO_SELLER") {
        if (!actionInput.trim()) {
          throw new Error("Admin resolution note is required when resolving in favor of seller.");
        }
        payload.resolution = actionInput.trim();
        payload.adminNotes = actionInput.trim();
      } else if (actionType === "REQUEST_MORE_INFO") {
        if (!actionInput.trim()) {
          throw new Error("Please provide instructions or questions for the buyer.");
        }
        payload.adminNotes = actionInput.trim();
        payload.resolution = `Admin requested info: ${actionInput.trim()}`;
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

      // Refresh dispute list
      await fetchDisputes();

      // Update selected dispute locally
      if (selectedDispute) {
        setSelectedDispute({
          ...selectedDispute,
          status: json.status || selectedDispute.status,
          resolution: payload.resolution ?? selectedDispute.resolution,
          adminNotes: payload.adminNotes ?? selectedDispute.adminNotes,
          payoutHoldStatus:
            actionType === "RELEASE_TO_SELLER"
              ? "RELEASED"
              : actionType === "REFUND_BUYER"
              ? "BLOCKED_REFUNDED"
              : "ON_HOLD",
        });
      }

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
    if (statusFilter === "OPEN") {
      matchesFilter = d.status === "OPEN";
    } else if (statusFilter === "UNDER_REVIEW") {
      matchesFilter = d.status === "UNDER_REVIEW";
    } else if (statusFilter === "AWAITING_INFORMATION") {
      matchesFilter = d.status === "AWAITING_INFORMATION";
    } else if (statusFilter === "RESOLVED") {
      matchesFilter =
        d.status === "RESOLVED" ||
        d.status === "RESOLVED_REFUND" ||
        d.status === "RESOLVED_RELEASE";
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

        {/* Required Filters: ALL, OPEN, UNDER REVIEW, AWAITING INFORMATION, RESOLVED */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
          {["ALL", "OPEN", "UNDER_REVIEW", "AWAITING_INFORMATION", "RESOLVED"].map((filter) => {
            const labelMap: Record<string, string> = {
              ALL: "All Disputes",
              OPEN: "Open",
              UNDER_REVIEW: "Under Review",
              AWAITING_INFORMATION: "Awaiting Information",
              RESOLVED: "Resolved",
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
                        {d.evidence ? (
                          <a
                            href={d.evidence}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[#cb6f4d] font-semibold hover:underline"
                          >
                            <span>View</span>
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
                          {d.status.replace("_", " ")}
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
                          {d.payoutHoldStatus.replace("_", " ")}
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
                    {selectedDispute.status.replace("_", " ")}
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
                    <span className="font-medium text-gray-700">
                      {selectedDispute.seller.username} ({selectedDispute.seller.email})
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
                      {selectedDispute.payoutHoldStatus.replace("_", " ")}
                    </span>
                  </div>
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
                    <span className="text-gray-400 block">Buyer Description</span>
                    <p className="bg-[#f8fafd] p-3 rounded-xl text-gray-700 mt-1 border border-gray-100 leading-relaxed">
                      {selectedDispute.description || "No description provided."}
                    </p>
                  </div>

                  {selectedDispute.evidence && (
                    <div>
                      <span className="text-gray-400 block mb-1">Uploaded Evidence</span>
                      <a
                        href={selectedDispute.evidence}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-[#cb6f4d] font-semibold underline"
                      >
                        <span>Open Buyer Attachment</span>
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  )}

                  {selectedDispute.adminNotes && (
                    <div>
                      <span className="text-gray-400 block">Admin Notes</span>
                      <p className="bg-amber-50/60 p-3 rounded-xl text-amber-900 mt-1 border border-amber-200 leading-relaxed">
                        {selectedDispute.adminNotes}
                      </p>
                    </div>
                  )}

                  {selectedDispute.resolution && (
                    <div>
                      <span className="text-gray-400 block">Resolution Decision</span>
                      <p className="bg-emerald-50/60 p-3 rounded-xl text-emerald-900 mt-1 border border-emerald-200 leading-relaxed">
                        {selectedDispute.resolution}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* ── 5.4 ADMIN ACTIONS ────────────────────────────────────────── */}
              <div className="bg-linear-to-br from-white to-[#fff8f5] rounded-2xl border border-[#cb6f4d]/30 p-5 space-y-3">
                <h3 className="text-xs font-black tracking-wider uppercase text-[#cb6f4d]">
                  ADMIN RESOLUTION ACTIONS
                </h3>
                <p className="text-xs text-gray-500">
                  Select an authoritative resolution. Payout holds are automatically updated.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  {/* Action 1: REFUND BUYER */}
                  <button
                    onClick={() => {
                      setActionType("REFUND_BUYER");
                      setCustomRefundAmount(selectedDispute.refundAmount || selectedDispute.orderAmount);
                      setActionInput("");
                      setActionFeedback(null);
                    }}
                    className="p-3 rounded-xl border border-rose-200 bg-rose-50/60 hover:bg-rose-100/80 text-rose-800 text-xs font-bold transition flex flex-col items-center text-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw size={18} className="text-rose-600" />
                    <span>1. REFUND BUYER</span>
                  </button>

                  {/* Action 2: RELEASE TO SELLER */}
                  <button
                    onClick={() => {
                      setActionType("RELEASE_TO_SELLER");
                      setActionInput("");
                      setActionFeedback(null);
                    }}
                    className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/80 text-emerald-800 text-xs font-bold transition flex flex-col items-center text-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 size={18} className="text-emerald-600" />
                    <span>2. RELEASE TO SELLER</span>
                  </button>

                  {/* Action 3: REQUEST MORE INFORMATION */}
                  <button
                    onClick={() => {
                      setActionType("REQUEST_MORE_INFO");
                      setActionInput("");
                      setActionFeedback(null);
                    }}
                    className="p-3 rounded-xl border border-purple-200 bg-purple-50/60 hover:bg-purple-100/80 text-purple-800 text-xs font-bold transition flex flex-col items-center text-center gap-1.5 cursor-pointer"
                  >
                    <HelpCircle size={18} className="text-purple-600" />
                    <span>3. REQUEST MORE INFO</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 6. REFUND BUYER CONFIRMATION MODAL (Requirement 6) ──────────────── */}
      {actionType === "REFUND_BUYER" && selectedDispute && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                  <RotateCcw size={16} />
                </div>
                <h3 className="font-bold text-gray-800 text-base">Refund Buyer</h3>
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

              <p className="text-gray-600 leading-relaxed">
                This action will initiate a refund to the buyer&apos;s original payment method. Seller payout
                will remain permanently blocked for this order.
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
                    <span>Processing Refund...</span>
                  </>
                ) : (
                  <span>CONFIRM REFUND</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 7. RELEASE TO SELLER CONFIRMATION MODAL (Requirement 7) ─────────── */}
      {actionType === "RELEASE_TO_SELLER" && selectedDispute && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <CheckCircle2 size={16} />
                </div>
                <h3 className="font-bold text-gray-800 text-base">Release to Seller</h3>
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
                  <span className="text-gray-400">Seller Earnings:</span>
                  <span className="font-extrabold text-emerald-700 text-sm">
                    {selectedDispute.sellerAmount.toLocaleString()} THB
                  </span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Dispute Details:</span>
                  <span>{REASON_LABELS[selectedDispute.reason] || selectedDispute.reason}</span>
                </div>
              </div>

              <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 text-amber-900 leading-relaxed text-[11px]">
                <span className="font-bold">IMPORTANT: </span>
                Resolving a dispute in favor of the seller removes the dispute hold and marks the
                order eligible. It does NOT immediately disburse bank funds; you must separately
                click RELEASE PAYMENT from Payout Management.
              </div>

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
                disabled={actionLoading || !actionInput.trim()}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Resolving Dispute...</span>
                  </>
                ) : (
                  <span>CONFIRM RELEASE TO SELLER</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 8. REQUEST MORE INFORMATION MODAL (Requirement 8) ────────────────── */}
      {actionType === "REQUEST_MORE_INFO" && selectedDispute && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <HelpCircle size={16} />
                </div>
                <h3 className="font-bold text-gray-800 text-base">Request More Information</h3>
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
                This will update the dispute status to{" "}
                <span className="font-bold text-purple-700">AWAITING_INFORMATION</span> and notify the
                buyer. Seller payout remains strictly <span className="font-bold text-rose-600">ON HOLD</span>.
              </p>

              <div>
                <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                  Required Explanation / Questions for Buyer:
                </label>
                <textarea
                  placeholder="Specify clear photos, packaging images, or courier receipt required from buyer..."
                  value={actionInput}
                  onChange={(e) => setActionInput(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-purple-200 h-24"
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
                disabled={actionLoading || !actionInput.trim()}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Notifying Buyer...</span>
                  </>
                ) : (
                  <span>SEND REQUEST</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
