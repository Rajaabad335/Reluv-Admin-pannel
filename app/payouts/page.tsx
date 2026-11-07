"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  Wallet,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Lock,
  ArrowRight,
  ExternalLink,
  ShieldAlert,
  Loader2,
  Info,
  Building,
  UserCheck,
  Eye,
  X,
} from "lucide-react";
import { BACKEND_URL } from "@/constants";

const API_BASE_URL = BACKEND_URL || "http://localhost:1337";

interface PayoutOrder {
  id: number;
  orderId: number;
  orderRef: string;
  seller: {
    id: number;
    name: string;
    email: string;
    bankName: string;
    bankAccountLast4: string;
    stripeConnectStatus: string;
  };
  buyer: {
    id: number;
    name: string;
    email: string;
  };
  productTitle: string;
  orderAmount: number;
  commissionRate: number;
  commissionAmount: number;
  sellerAmount: number;
  orderStatus: string;
  paymentStatus: string;
  deliveredAt: string | null;
  releaseDate: string | null;
  is48hExpired: boolean;
  disputeStatus: string;
  hasActiveDispute: boolean;
  payoutStatus:
    | "Not eligible"
    | "Eligible"
    | "On hold"
    | "Processing"
    | "Transferred"
    | "Bank payout pending"
    | "Paid"
    | "Failed";
  canRelease: boolean;
  payoutId: number | null;
  payoutNotes: string | null;
  createdAt: string;
}

interface SellerProfile {
  sellerId: number;
  name: string;
  email: string;
  bankName: string;
  maskedAccountNumber: string;
  stripeConnectStatus: string;
  pendingEarnings: number;
  eligibleEarnings: number;
  completedPayouts: number;
}

const statusBadgeStyles: Record<string, string> = {
  "Not eligible": "bg-gray-100 text-gray-600 border-gray-200",
  Eligible: "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold",
  "On hold": "bg-rose-100 text-rose-800 border-rose-300 font-bold",
  Processing: "bg-indigo-100 text-indigo-800 border-indigo-200",
  Transferred: "bg-blue-100 text-blue-800 border-blue-200",
  "Bank payout pending": "bg-amber-100 text-amber-800 border-amber-200",
  Paid: "bg-[#f5e6df] text-[#cb6f4d] border-[#cb6f4d]/30 font-bold",
  Failed: "bg-red-100 text-red-800 border-red-200",
};

export default function PayoutsPage({
  commissionRate: initialCommissionRate = 10,
}: {
  commissionRate?: number;
}) {
  const [activeTab, setActiveTab] = useState<"orders" | "sellers">("orders");
  const [orders, setOrders] = useState<PayoutOrder[]>([]);
  const [sellers, setSellers] = useState<SellerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");

  // Release Modal State
  const [selectedOrderForRelease, setSelectedOrderForRelease] =
    useState<PayoutOrder | null>(null);
  const [isReleasing, setIsReleasing] = useState(false);
  const [releaseNote, setReleaseNote] = useState("");
  const [operationResult, setOperationResult] = useState<{
    type: "success" | "error";
    message: string;
    details?: { transferId?: string };
  } | null>(null);

  // View Details Modal State
  const [viewingOrder, setViewingOrder] = useState<PayoutOrder | null>(null);

  // Fetch Payout Orders
  const fetchPayoutOrders = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/payout-orders`, {
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.ok && Array.isArray(json.data)) {
          setOrders(
            json.data.map((order: PayoutOrder & { isMock?: boolean }) => ({
              ...order,
              seller: {
                ...order.seller,
                bankName:
                  order.seller.bankName === "Kasikornbank (KBank)"
                    ? "Not provided"
                    : order.seller.bankName,
                bankAccountLast4:
                  order.seller.bankAccountLast4 === "8821"
                    ? ""
                    : order.seller.bankAccountLast4,
                stripeConnectStatus:
                  order.seller.stripeConnectStatus === "Active"
                    ? "Not connected"
                    : order.seller.stripeConnectStatus,
              },
              ...(order.isMock && order.payoutId
                ? { payoutStatus: "Failed" as const, canRelease: false }
                : {}),
            }))
          );
          return;
        }
      }
      throw new Error("Failed to load payout orders");
    } catch (err) {
      setOrders([]);
      setLoadError(err instanceof Error ? err.message : "Could not load payout orders.");
    }
  }, []);

  // Fetch Seller Payout Profiles (Requirement 11)
  const fetchSellerProfiles = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/seller-payout-profiles`, {
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.ok && Array.isArray(json.data)) {
          setSellers(
            json.data.map((seller: SellerProfile) => ({
              ...seller,
              bankName:
                seller.bankName === "Kasikornbank (KBank)"
                  ? "Not provided"
                  : seller.bankName,
              maskedAccountNumber:
                seller.maskedAccountNumber === "•••• 8821"
                  ? "Not provided"
                  : seller.maskedAccountNumber,
              stripeConnectStatus:
                seller.stripeConnectStatus === "Active"
                  ? "Not connected"
                  : seller.stripeConnectStatus,
            }))
          );
          return;
        }
      }
      throw new Error("Failed to load seller profiles");
    } catch (err) {
      setSellers([]);
      setLoadError(err instanceof Error ? err.message : "Could not load seller payout profiles.");
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    await Promise.all([fetchPayoutOrders(), fetchSellerProfiles()]);
    setLoading(false);
  }, [fetchPayoutOrders, fetchSellerProfiles]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Execute Release Payout
  const handleConfirmRelease = async () => {
    if (!selectedOrderForRelease) return;
    setIsReleasing(true);
    setOperationResult(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/release-payout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: selectedOrderForRelease.orderId,
          notes: releaseNote || "Released by admin",
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok || json.isMock === true || json.payout?.isMock === true) {
        throw new Error(json.message || json.error?.message || "Failed to release payout.");
      }
      if (!json.payout?.transferId || json.payout.transferId.startsWith("tr_mock_")) {
        throw new Error("The backend did not confirm a real Stripe transfer. No payout was recorded.");
      }

      setOperationResult({
        type: "success",
        message: `Stripe transfer of ${selectedOrderForRelease.sellerAmount.toLocaleString()} THB was created for ${selectedOrderForRelease.seller.name}.`,
        details: json.payout,
      });

      // Refresh data
      await loadData();
    } catch (err: unknown) {
      setOperationResult({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "An unexpected error occurred during payout release.",
      });
    } finally {
      setIsReleasing(false);
    }
  };

  // Filter orders
  const filteredOrders = orders.filter((o) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      o.orderRef.toLowerCase().includes(q) ||
      o.seller.name.toLowerCase().includes(q) ||
      o.buyer.name.toLowerCase().includes(q);

    let matchesFilter = true;
    if (filterStatus !== "All") {
      matchesFilter = o.payoutStatus.toLowerCase() === filterStatus.toLowerCase();
    }

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="p-4 md:p-8 bg-[#f8fafd] min-h-screen font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#2d3748]">
            Seller Payout Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            48-hour delivery dispute hold enforcement, escrow releases, and banking profiles
          </p>
        </div>

        {loadError && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
          >
            {loadError}
          </div>
        )}

        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium bg-white text-gray-700 hover:bg-gray-50 transition shadow-xs disabled:opacity-60"
        >
          <RefreshCw size={15} className={loading ? "animate-spin text-[#cb6f4d]" : ""} />
          <span>Sync Data</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6 flex gap-4">
        <button
          onClick={() => setActiveTab("orders")}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "orders"
              ? "border-[#cb6f4d] text-[#cb6f4d]"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <Wallet size={16} />
          <span>Payout Orders &amp; Releases</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
            {orders.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("sellers")}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "sellers"
              ? "border-[#cb6f4d] text-[#cb6f4d]"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <Building size={16} />
          <span>Seller Banking Profiles (Requirement 11)</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
            {sellers.length}
          </span>
        </button>
      </div>

      {/* ── TAB 1: Payout Orders ───────────────────────────────────────────── */}
      {activeTab === "orders" && (
        <div className="space-y-4">
          {/* Toolbar & Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[240px] max-w-sm">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#cb6f4d]"
                size={16}
              />
              <input
                type="text"
                placeholder="Search order number, seller, buyer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-[#cb6f4d]/40 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#cb6f4d]/20 bg-white text-gray-800"
              />
            </div>

            {/* Exact Required Filters */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
              {[
                "All",
                "Eligible",
                "On hold",
                "Not eligible",
                "Processing",
                "Transferred",
                "Bank payout pending",
                "Paid",
                "Failed",
              ].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setFilterStatus(filter)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                    filterStatus === filter
                      ? "bg-[#cb6f4d] text-white shadow-xs"
                      : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {/* Table with EXACT Specified Columns */}
          <div className="bg-white rounded-2xl shadow-xs border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[1050px]">
                <thead>
                  <tr className="bg-[#ebf1f7] text-[#4a5568] text-xs font-semibold border-b border-gray-100">
                    <th className="px-4 py-4">Order ID</th>
                    <th className="px-4 py-4">Seller</th>
                    <th className="px-4 py-4">Buyer</th>
                    <th className="px-4 py-4">Order Amount</th>
                    <th className="px-4 py-4">Commission (10%)</th>
                    <th className="px-4 py-4">Seller Amount (90%)</th>
                    <th className="px-4 py-4">Delivery Date</th>
                    <th className="px-4 py-4">Release Date (+48h)</th>
                    <th className="px-4 py-4 text-center">Dispute Status</th>
                    <th className="px-4 py-4 text-center">Payout Status</th>
                    <th className="px-4 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        {Array.from({ length: 11 }).map((__, j) => (
                          <td key={j} className="px-4 py-4">
                            <div className="h-4 bg-gray-100 rounded w-3/4" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-4 py-12 text-center text-sm text-gray-400">
                        No orders match the selected filter.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((o) => {
                      const badgeClass =
                        statusBadgeStyles[o.payoutStatus] || "bg-gray-100 text-gray-600";

                      return (
                        <tr key={o.id} className="hover:bg-gray-50/50 transition-colors">
                          {/* 1. Order ID */}
                          <td className="px-4 py-4 text-sm font-bold text-[#cb6f4d]">
                            {o.orderRef}
                          </td>

                          {/* 2. Seller */}
                          <td className="px-4 py-4">
                            <div className="text-sm font-semibold text-gray-800">
                              {o.seller.name}
                            </div>
                            <div className="text-[11px] text-gray-400">
                              {o.seller.bankAccountLast4
                                ? `${o.seller.bankName} •••• ${o.seller.bankAccountLast4}`
                                : o.seller.bankName}
                            </div>
                          </td>

                          {/* 3. Buyer */}
                          <td className="px-4 py-4 text-sm text-gray-700">{o.buyer.name}</td>

                          {/* 4. Order Amount */}
                          <td className="px-4 py-4 text-sm font-bold text-[#2d3748]">
                            {o.orderAmount.toLocaleString()} THB
                          </td>

                          {/* 5. Commission (10%) */}
                          <td className="px-4 py-4 text-sm font-medium text-[#cb6f4d]">
                            {o.commissionAmount.toLocaleString()} THB
                          </td>

                          {/* 6. Seller Amount (90%) */}
                          <td className="px-4 py-4 text-sm font-bold text-emerald-700">
                            {o.sellerAmount.toLocaleString()} THB
                          </td>

                          {/* 7. Delivery Date */}
                          <td className="px-4 py-4 text-xs text-gray-600 whitespace-nowrap">
                            {o.deliveredAt ? (
                              new Date(o.deliveredAt).toLocaleString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            ) : (
                              <span className="text-gray-400 italic">Not delivered</span>
                            )}
                          </td>

                          {/* 8. Release Date (Delivery + 48h) */}
                          <td className="px-4 py-4 text-xs whitespace-nowrap">
                            {o.releaseDate ? (
                              <div className="flex flex-col">
                                <span
                                  className={
                                    o.is48hExpired ? "text-emerald-700 font-semibold" : "text-amber-700"
                                  }
                                >
                                  {new Date(o.releaseDate).toLocaleString("en-GB", {
                                    day: "2-digit",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                                <span className="text-[10px] text-gray-400">
                                  {o.is48hExpired ? "✓ 48h window passed" : "⏳ Dispute window active"}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-400 italic">—</span>
                            )}
                          </td>

                          {/* 9. Dispute Status */}
                          <td className="px-4 py-4 text-center">
                            {o.disputeStatus === "NONE" ? (
                              <span className="text-xs text-gray-400 font-medium">None</span>
                            ) : (
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide inline-block ${
                                  o.hasActiveDispute
                                    ? "bg-rose-100 text-rose-800 border border-rose-300"
                                    : "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {o.disputeStatus}
                              </span>
                            )}
                          </td>

                          {/* 10. Payout Status */}
                          <td className="px-4 py-4 text-center">
                            <span
                              className={`px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wide border inline-block ${badgeClass}`}
                            >
                              {o.payoutStatus}
                            </span>
                          </td>

                          {/* 11. Action (View / Release) */}
                          <td className="px-4 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* View Button */}
                              <button
                                onClick={() => setViewingOrder(o)}
                                className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
                                title="View Details"
                              >
                                <Eye size={15} />
                              </button>

                              {/* RELEASE PAYMENT BUTTON */}
                              <button
                                onClick={() => {
                                  setSelectedOrderForRelease(o);
                                  setReleaseNote("");
                                  setOperationResult(null);
                                }}
                                disabled={!o.canRelease}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 min-w-[95px] justify-center ${
                                  o.canRelease
                                    ? "bg-[#cb6f4d] hover:bg-[#b85e3d] text-white shadow-xs cursor-pointer"
                                    : "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
                                }`}
                                title={
                                  !o.canRelease
                                    ? !o.deliveredAt
                                      ? "Order not delivered"
                                      : !o.is48hExpired
                                      ? "48h window not expired"
                                      : o.hasActiveDispute
                                      ? "Active dispute blocks payout"
                                        : o.seller.stripeConnectStatus !== "Connected"
                                        ? "Seller has no connected Stripe account"
                                        : "Payout ineligible or already processed"
                                    : "Release Seller Payment"
                                }
                              >
                                {!o.canRelease && <Lock size={11} />}
                                <span>{o.payoutStatus === "Paid" ? "Released" : "Release"}</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: Seller Payout Details (Requirement 11) ──────────────────── */}
      {activeTab === "sellers" && (
        <div className="space-y-4">
          <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-start gap-3">
            <Info className="text-blue-600 mt-0.5 shrink-0" size={18} />
            <div className="text-xs text-blue-900 leading-relaxed">
              <span className="font-bold">Requirement 11 - Seller Banking &amp; Payout Standing: </span>
              Payouts are released to sellers through their connected Stripe accounts. Bank details are displayed only when available.
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xs border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[900px]">
                <thead>
                  <tr className="bg-[#ebf1f7] text-[#4a5568] text-xs font-semibold border-b border-gray-100">
                    <th className="px-5 py-4">Seller ID</th>
                    <th className="px-5 py-4">Seller Name</th>
                    <th className="px-5 py-4">Email</th>
                    <th className="px-5 py-4">Bank Name</th>
                    <th className="px-5 py-4">Masked Account</th>
                    <th className="px-5 py-4">Stripe Connect Status</th>
                    <th className="px-5 py-4">Pending Earnings</th>
                    <th className="px-5 py-4">Eligible Earnings</th>
                    <th className="px-5 py-4">Completed Payouts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sellers.map((s) => (
                    <tr key={s.sellerId} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-4 text-xs font-mono font-bold text-gray-500">
                        #{s.sellerId}
                      </td>
                      <td className="px-5 py-4 text-sm font-bold text-gray-800">{s.name}</td>
                      <td className="px-5 py-4 text-xs text-gray-500">{s.email}</td>
                      <td className="px-5 py-4 text-sm text-gray-700 font-medium">{s.bankName}</td>
                      <td className="px-5 py-4 text-sm font-mono font-semibold text-gray-700">
                        {s.maskedAccountNumber}
                      </td>
                      <td className="px-5 py-4">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-gray-100 text-gray-700">
                          {s.stripeConnectStatus}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold text-amber-600">
                        {s.pendingEarnings.toLocaleString()} THB
                      </td>
                      <td className="px-5 py-4 text-sm font-bold text-emerald-600">
                        {s.eligibleEarnings.toLocaleString()} THB
                      </td>
                      <td className="px-5 py-4 text-sm font-bold text-[#cb6f4d]">
                        {s.completedPayouts.toLocaleString()} THB
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. RELEASE SELLER PAYMENT CONFIRMATION MODAL (Requirement 3) ────── */}
      {selectedOrderForRelease && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-[#f5e6df] text-[#cb6f4d] flex items-center justify-center">
                  <Wallet size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#2d3748]">RELEASE SELLER PAYMENT</h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrderForRelease(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="py-4 space-y-4">
              <div className="bg-[#f8fafd] rounded-2xl p-4 space-y-2.5 border border-gray-100 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Order:</span>
                  <span className="font-bold text-[#cb6f4d]">
                    #{selectedOrderForRelease.orderId} ({selectedOrderForRelease.orderRef})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Customer Payment:</span>
                  <span className="font-semibold text-gray-800">
                    {selectedOrderForRelease.orderAmount.toLocaleString()} THB
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Platform Commission (10%):</span>
                  <span className="font-semibold text-[#cb6f4d]">
                    -{selectedOrderForRelease.commissionAmount.toLocaleString()} THB
                  </span>
                </div>
                <div className="border-t border-gray-200 pt-2 flex justify-between text-base">
                  <span className="font-bold text-gray-700">Seller Amount:</span>
                  <span className="font-extrabold text-emerald-700">
                    {selectedOrderForRelease.sellerAmount.toLocaleString()} THB
                  </span>
                </div>
                <div className="flex justify-between text-xs pt-1">
                  <span className="text-gray-500">Seller:</span>
                  <span className="font-bold text-gray-800">
                    {selectedOrderForRelease.seller.name}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Stripe Connect:</span>
                  <span>{selectedOrderForRelease.seller.stripeConnectStatus}</span>
                </div>
              </div>

              <p className="text-sm text-gray-700 font-medium">
                Are you sure you want to release this payment?
              </p>

              <div>
                <label className="text-xs text-gray-500 block mb-1">
                  Admin release note (optional):
                </label>
                <input
                  type="text"
                  placeholder="e.g., Delivery confirmed past 48h dispute window"
                  value={releaseNote}
                  onChange={(e) => setReleaseNote(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#cb6f4d]/20 bg-white"
                />
              </div>

              {/* Status/Error/Success Box */}
              {operationResult && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                    operationResult.type === "success"
                      ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
                      : "bg-rose-50 text-rose-900 border border-rose-200"
                  }`}
                >
                  {operationResult.type === "success" ? (
                    <CheckCircle2 size={16} className="text-emerald-600 mt-0.5 shrink-0" />
                  ) : (
                    <AlertTriangle size={16} className="text-rose-600 mt-0.5 shrink-0" />
                  )}
                  <div>
                    <p className="font-semibold">{operationResult.message}</p>
                    {operationResult.details?.transferId && (
                      <p className="font-mono text-[11px] text-gray-500 mt-1">
                        Stripe Transfer ID: {operationResult.details.transferId}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
              <button
                onClick={() => setSelectedOrderForRelease(null)}
                disabled={isReleasing}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
              >
                CANCEL
              </button>
              <button
                onClick={handleConfirmRelease}
                disabled={isReleasing || operationResult?.type === "success"}
                className="px-6 py-2.5 rounded-xl bg-[#cb6f4d] hover:bg-[#b85e3d] text-white text-sm font-bold transition shadow-sm disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {isReleasing ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Processing Release...</span>
                  </>
                ) : (
                  <span>CONFIRM RELEASE</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── View Order Details Modal ───────────────────────────────────────── */}
      {viewingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-[#2d3748]">
                Payout Details: {viewingOrder.orderRef}
              </h3>
              <button
                onClick={() => setViewingOrder(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="py-4 space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3 bg-[#f8fafd] p-4 rounded-2xl border border-gray-100">
                <div>
                  <span className="text-xs text-gray-400 block">Product</span>
                  <span className="font-semibold text-gray-800">{viewingOrder.productTitle}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-400 block">Payout Status</span>
                  <span className="font-bold text-[#cb6f4d]">{viewingOrder.payoutStatus}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-400 block">Buyer</span>
                  <span className="font-medium text-gray-700">{viewingOrder.buyer.name}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-400 block">Seller</span>
                  <span className="font-medium text-gray-700">{viewingOrder.seller.name}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-400 block">Customer Paid</span>
                  <span className="font-bold text-gray-800">
                    {viewingOrder.orderAmount.toLocaleString()} THB
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-400 block">Seller Net</span>
                  <span className="font-bold text-emerald-700">
                    {viewingOrder.sellerAmount.toLocaleString()} THB
                  </span>
                </div>
              </div>

              <div className="space-y-1 text-xs text-gray-600">
                <p>
                  <span className="font-semibold">Delivered At:</span>{" "}
                  {viewingOrder.deliveredAt
                    ? new Date(viewingOrder.deliveredAt).toLocaleString("en-GB")
                    : "Not yet delivered"}
                </p>
                <p>
                  <span className="font-semibold">Dispute Release Deadline (+48h):</span>{" "}
                  {viewingOrder.releaseDate
                    ? new Date(viewingOrder.releaseDate).toLocaleString("en-GB")
                    : "Pending delivery"}
                </p>
                <p>
                  <span className="font-semibold">Dispute Hold:</span>{" "}
                  {viewingOrder.hasActiveDispute ? (
                    <span className="text-rose-600 font-bold">YES - Payout blocked</span>
                  ) : (
                    <span className="text-emerald-600 font-bold">NO - Clear of disputes</span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-gray-100">
              <button
                onClick={() => setViewingOrder(null)}
                className="px-5 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
