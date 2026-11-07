"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  Download,
  Loader2,
  RefreshCw,
  CreditCard,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Scale,
  ShieldCheck,
  FileText,
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
  Banknote,
} from "lucide-react";
import { BACKEND_URL } from "@/constants";
import jsPDF from "jspdf";

const API_BASE_URL = BACKEND_URL || "http://localhost:1337";

interface FinancialSummary {
  totalPaymentsReceived: number;
  totalPlatformCommission: number;
  totalSellerEarnings: number;
  pendingPayouts: number;
  eligiblePayouts: number;
  payoutsOnHold: number;
  completedPayouts: number;
  openDisputes: number;
  pendingRefunds: number;
  currency: string;
}

interface Payment {
  id: number;
  orderRef: string;
  buyer: string;
  seller: string;
  amount: number;
  commission: number;
  sellerAmount: number;
  status: string;
  createdAt: string;
}

interface OrderApiUser {
  username?: string;
  data?: { attributes?: { username?: string } };
}

interface OrderApiAttributes {
  orderRef?: string;
  totalAmount?: string | number;
  total?: string | number;
  buyer?: OrderApiUser | null;
  seller?: OrderApiUser | null;
  paymentStatus?: string;
  status?: string;
  createdAt?: string;
}

interface OrderApiRecord extends OrderApiAttributes {
  id: number;
  attributes?: OrderApiAttributes;
}

interface RefundRecord {
  id: number;
  refundId: string;
  orderId: number;
  orderNumber: string;
  buyer: string;
  seller: string;
  refundAmount: number;
  reason: string;
  stripeRefundId: string;
  status: "REQUESTED" | "APPROVED" | "PROCESSING" | "SUCCEEDED" | "FAILED" | "CANCELLED";
  requestDate: string;
  processingDate: string;
  completionDate: string | null;
}

interface AuditTransaction {
  id: string;
  orderId: string;
  type:
    | "CUSTOMER_PAYMENT"
    | "PLATFORM_COMMISSION"
    | "SELLER_TRANSFER"
    | "SELLER_BANK_PAYOUT"
    | "BUYER_REFUND"
    | "TRANSFER_REVERSAL";
  amount: number;
  currency: string;
  stripeReference: string;
  status: "COMPLETED" | "PENDING" | "FAILED";
  initiatedBy: string;
  createdAt: string;
  processedAt: string;
}

const statusColors: Record<string, string> = {
  paid: "bg-[#cb6f4d]",
  success: "bg-[#56ab65]",
  pending: "bg-[#f2994a]",
  refunded: "bg-[#1156be]",
  failed: "bg-[#d9534f]",
  cancelled: "bg-gray-400",
};

const refundStatusBadge: Record<string, string> = {
  REQUESTED: "bg-amber-100 text-amber-800 border-amber-200",
  APPROVED: "bg-blue-100 text-blue-800 border-blue-200",
  PROCESSING: "bg-indigo-100 text-indigo-800 border-indigo-200",
  SUCCEEDED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  FAILED: "bg-rose-100 text-rose-800 border-rose-200",
  CANCELLED: "bg-gray-100 text-gray-700 border-gray-200",
};

const txTypeColors: Record<string, { bg: string; text: string }> = {
  CUSTOMER_PAYMENT: { bg: "bg-emerald-50 text-emerald-700", text: "Customer Payment" },
  PLATFORM_COMMISSION: { bg: "bg-[#f5e6df] text-[#cb6f4d]", text: "Platform Commission" },
  SELLER_TRANSFER: { bg: "bg-blue-50 text-blue-700", text: "Seller Transfer" },
  SELLER_BANK_PAYOUT: { bg: "bg-purple-50 text-purple-700", text: "Bank Payout" },
  BUYER_REFUND: { bg: "bg-rose-50 text-rose-700", text: "Buyer Refund" },
  TRANSFER_REVERSAL: { bg: "bg-orange-50 text-orange-700", text: "Reversal" },
};

export default function Payments({
  commissionRate: initialCommissionRate = 10,
}: {
  commissionRate?: number;
}) {
  const [activeTab, setActiveTab] = useState<"payments" | "refunds" | "transactions">(
    "payments"
  );

  // Financial summary (Authoritative backend-calculated values)
  const [summary, setSummary] = useState<FinancialSummary | null>(null);

  const [payments, setPayments] = useState<Payment[]>([]);
  const [refunds, setRefunds] = useState<RefundRecord[]>([]);
  const [transactions, setTransactions] = useState<AuditTransaction[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [txTypeFilter, setTxTypeFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [commissionRate, setCommissionRate] = useState(initialCommissionRate);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  // 1. Fetch Authoritative Financial Summary
  const fetchFinancialSummary = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/financial-summary`, {
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Could not load financial summary.");
      const json = await res.json();
      if (!json.ok || !json.data) throw new Error("Financial summary is unavailable.");
      setSummary(json.data);
    } catch (err) {
      setSummary(null);
      setLoadError(err instanceof Error ? err.message : "Could not load financial summary.");
    }
  }, []);

  // 2. Fetch Customer Payments
  const fetchPayments = useCallback(async () => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/orders?populate[buyer]=true&populate[seller]=true&pagination[pageSize]=100&sort[0]=createdAt:desc`,
        { headers: { "Content-Type": "application/json" } }
      );
      if (!res.ok) throw new Error("Could not load customer payments.");
      const json = (await res.json()) as { data?: OrderApiRecord[] };
      const mapped: Payment[] = (json.data || []).map((o) => {
        const a = o.attributes ?? o;
        const total = Number(a.totalAmount ?? a.total ?? 0);
        const comm = Math.round(total * (commissionRate / 100) * 100) / 100;
        return {
          id: o.id,
          orderRef: a.orderRef ?? `ORD-${String(o.id).padStart(5, "0")}`,
          buyer: a.buyer?.data?.attributes?.username ?? a.buyer?.username ?? "Customer",
          seller: a.seller?.data?.attributes?.username ?? a.seller?.username ?? "Seller",
          amount: total,
          commission: comm,
          sellerAmount: Math.round((total - comm) * 100) / 100,
          status: (a.paymentStatus ?? a.status ?? "pending").toLowerCase(),
          createdAt: a.createdAt || "",
        };
      });
      setPayments(mapped);
    } catch (err) {
      setPayments([]);
      setLoadError(err instanceof Error ? err.message : "Could not load payments.");
    }
  }, [commissionRate]);

  // 3. Fetch Refunds
  const fetchRefunds = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/refunds`, {
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.ok && Array.isArray(json.data)) {
          setRefunds(
            json.data.filter(
              (refund: RefundRecord & { isMock?: boolean }) =>
                refund.isMock !== true &&
                !refund.stripeRefundId?.startsWith("re_mock_")
            )
          );
          return;
        }
      }
      throw new Error("Failed to fetch refunds");
    } catch (err) {
      setRefunds([]);
      setLoadError(err instanceof Error ? err.message : "Could not load refunds.");
    }
  }, []);

  // 4. Fetch Transactions Audit Trail
  const fetchTransactions = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/transactions`, {
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.ok && Array.isArray(json.data)) {
          setTransactions(
            json.data.filter(
              (transaction: AuditTransaction & { isMock?: boolean }) =>
                transaction.isMock !== true &&
                String(transaction.type) !== "MOCK_PAYOUT" &&
                !/^(tr|po|re)_mock_/.test(transaction.stripeReference)
            )
          );
          return;
        }
      }
      throw new Error("Failed to load transactions");
    } catch (err) {
      setTransactions([]);
      setLoadError(err instanceof Error ? err.message : "Could not load transactions.");
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    await Promise.all([
      fetchFinancialSummary(),
      fetchPayments(),
      fetchRefunds(),
      fetchTransactions(),
    ]);
    setLoading(false);
  }, [fetchFinancialSummary, fetchPayments, fetchRefunds, fetchTransactions]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Download PDF Slip
  const handleDownloadSlip = async (p: Payment) => {
    setDownloadingId(p.id);
    try {
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const brand = "#cb6f4d";
      const dark = "#2d3748";
      const gray = "#8a94a3";

      const commAmt = (p.amount * commissionRate) / 100;
      const netAmt = p.amount - commAmt;
      const now = new Date();
      const dateStr = now.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

      doc.setFillColor(brand);
      doc.rect(0, 0, pageWidth, 90, "F");
      doc.setTextColor("#ffffff");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("Reluv Marketplace", 48, 45);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Official Payment & Payout Summary Slip", 48, 65);

      doc.setFontSize(9);
      doc.text(`Generated: ${dateStr} · ${timeStr}`, pageWidth - 48, 45, { align: "right" });
      doc.text(`Ref: ${p.orderRef}`, pageWidth - 48, 60, { align: "right" });

      let y = 130;
      const row = (label: string, value: string, opts?: { bold?: boolean; accent?: boolean }) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(gray);
        doc.text(label, 48, y);

        doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
        doc.setFontSize(opts?.bold ? 11 : 10);
        doc.setTextColor(opts?.accent ? brand : dark);
        doc.text(value, pageWidth - 48, y, { align: "right" });
        y += 26;
      };

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(dark);
      doc.text("Transaction Information", 48, y);
      y += 10;
      doc.setDrawColor("#ebf1f7");
      doc.line(48, y, pageWidth - 48, y);
      y += 24;

      row("Order Reference", p.orderRef, { bold: true });
      row("Buyer", p.buyer);
      row("Seller", p.seller);
      row("Status", p.status.toUpperCase(), { accent: true });

      y += 12;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(dark);
      doc.text("Financial Breakdown (10% Commission Model)", 48, y);
      y += 10;
      doc.line(48, y, pageWidth - 48, y);
      y += 24;

      row("Total Customer Payment", `${p.amount.toLocaleString()} THB`, { bold: true });
      row(`Platform Commission (${commissionRate}%)`, `-${commAmt.toFixed(2)} THB`, { accent: true });

      doc.setDrawColor("#e2e8f0");
      doc.line(48, y - 6, pageWidth - 48, y - 6);
      y += 8;

      row("Net Seller Amount (90%)", `${netAmt.toFixed(2)} THB`, { bold: true });

      const footerY = doc.internal.pageSize.getHeight() - 60;
      doc.setDrawColor("#ebf1f7");
      doc.line(48, footerY, pageWidth - 48, footerY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(gray);
      doc.text(
        "This slip is generated from authoritative backend financial records of Reluv Marketplace.",
        48,
        footerY + 20
      );
      doc.text("Confidential financial document - For admin and audit records only.", 48, footerY + 34);

      doc.save(`reluv-slip-${p.orderRef}.pdf`);
    } catch (err) {
      console.error("Failed to generate slip:", err);
    } finally {
      setDownloadingId(null);
    }
  };

  // Filtered Payments
  const filteredPayments = payments.filter((p) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      p.orderRef.toLowerCase().includes(q) ||
      p.buyer.toLowerCase().includes(q) ||
      p.seller.toLowerCase().includes(q);
    const matchesStatus = !statusFilter || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Filtered Refunds
  const filteredRefunds = refunds.filter((r) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      r.refundId.toLowerCase().includes(q) ||
      r.orderNumber.toLowerCase().includes(q) ||
      r.buyer.toLowerCase().includes(q) ||
      r.seller.toLowerCase().includes(q);
    const matchesStatus = !statusFilter || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Filtered Transactions
  const filteredTransactions = transactions.filter((t) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      t.id.toLowerCase().includes(q) ||
      t.orderId.toLowerCase().includes(q) ||
      t.stripeReference.toLowerCase().includes(q) ||
      t.initiatedBy.toLowerCase().includes(q);
    const matchesType = !txTypeFilter || t.type === txTypeFilter;
    const matchesStatus = !statusFilter || t.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="p-4 md:p-8 bg-[#f8fafd] min-h-screen font-sans">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#2d3748]">
            Payment & Financial Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Authoritative platform financials, payouts, dispute holds, and audit trail
          </p>
        </div>

        <button
          onClick={loadAll}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium bg-white text-gray-700 hover:bg-gray-50 transition shadow-sm disabled:opacity-60"
        >
          <RefreshCw size={15} className={loading ? "animate-spin text-[#cb6f4d]" : ""} />
          <span>Sync Real-Time Data</span>
        </button>
      </div>

      {loadError && (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
        >
          {loadError} Financial data shown below is limited to successfully loaded records.
        </div>
      )}

      {/* ── 1. The 9 Required Financial Summary Cards (Backend-backed) ────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 mb-8">
        {/* 1. TOTAL PAYMENTS RECEIVED */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold tracking-wider uppercase text-gray-400">
              Total Payments Received
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CreditCard size={18} />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#2d3748]">
            {summary?.totalPaymentsReceived.toLocaleString("en-US", {
              minimumFractionDigits: 2,
            }) ?? "—"}{" "}
            <span className="text-xs font-normal text-gray-400">THB</span>
          </p>
          <p className="text-[11px] text-gray-400 mt-1">Gross paid buyer volume</p>
        </div>

        {/* 2. TOTAL PLATFORM COMMISSION */}
        <div className="bg-white rounded-2xl border border-[#cb6f4d]/20 p-5 shadow-xs bg-linear-to-br from-white to-[#fff9f6]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold tracking-wider uppercase text-[#cb6f4d]">
              Total Platform Commission (10%)
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#f5e6df] text-[#cb6f4d] flex items-center justify-center">
              <TrendingUp size={18} />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#cb6f4d]">
            {summary?.totalPlatformCommission.toLocaleString("en-US", {
              minimumFractionDigits: 2,
            }) ?? "—"}{" "}
            <span className="text-xs font-normal text-[#cb6f4d]/70">THB</span>
          </p>
          <p className="text-[11px] text-[#cb6f4d]/70 mt-1">Net platform revenue</p>
        </div>

        {/* 3. TOTAL SELLER EARNINGS */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold tracking-wider uppercase text-gray-400">
              Total Seller Earnings (90%)
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <DollarSign size={18} />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#2d3748]">
            {summary?.totalSellerEarnings.toLocaleString("en-US", {
              minimumFractionDigits: 2,
            }) ?? "—"}{" "}
            <span className="text-xs font-normal text-gray-400">THB</span>
          </p>
          <p className="text-[11px] text-gray-400 mt-1">Total allocated to sellers</p>
        </div>

        {/* 4. PENDING PAYOUTS */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold tracking-wider uppercase text-gray-400">
              Pending Payouts
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock size={18} />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#f2994a]">
            {summary?.pendingPayouts.toLocaleString("en-US", {
              minimumFractionDigits: 2,
            }) ?? "—"}{" "}
            <span className="text-xs font-normal text-gray-400">THB</span>
          </p>
          <p className="text-[11px] text-gray-400 mt-1">Undelivered or within 48h dispute window</p>
        </div>

        {/* 5. ELIGIBLE PAYOUTS */}
        <div className="bg-white rounded-2xl border border-emerald-200 p-5 shadow-xs bg-linear-to-br from-white to-emerald-50/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold tracking-wider uppercase text-emerald-700">
              Eligible Payouts
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-700">
            {summary?.eligiblePayouts.toLocaleString("en-US", {
              minimumFractionDigits: 2,
            }) ?? "—"}{" "}
            <span className="text-xs font-normal text-emerald-600/70">THB</span>
          </p>
          <p className="text-[11px] text-emerald-600 mt-1">
            Delivered &gt;48h, no active dispute (Ready to release)
          </p>
        </div>

        {/* 6. PAYOUTS ON HOLD */}
        <div className="bg-white rounded-2xl border border-rose-200 p-5 shadow-xs bg-linear-to-br from-white to-rose-50/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold tracking-wider uppercase text-rose-700">
              Payouts On Hold
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
              <AlertTriangle size={18} />
            </div>
          </div>
          <p className="text-2xl font-bold text-rose-700">
            {summary?.payoutsOnHold.toLocaleString("en-US", {
              minimumFractionDigits: 2,
            }) ?? "—"}{" "}
            <span className="text-xs font-normal text-rose-600/70">THB</span>
          </p>
          <p className="text-[11px] text-rose-600 mt-1">Blocked by active disputes or refund reviews</p>
        </div>

        {/* 7. COMPLETED PAYOUTS */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold tracking-wider uppercase text-gray-400">
              Completed Payouts
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Banknote size={18} />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#2d3748]">
            {summary?.completedPayouts.toLocaleString("en-US", {
              minimumFractionDigits: 2,
            }) ?? "—"}{" "}
            <span className="text-xs font-normal text-gray-400">THB</span>
          </p>
          <p className="text-[11px] text-gray-400 mt-1">Confirmed seller transfers</p>
        </div>

        {/* 8. OPEN DISPUTES */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold tracking-wider uppercase text-gray-400">
              Open Disputes
            </span>
            <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
              <Scale size={18} />
            </div>
          </div>
          <p className="text-2xl font-bold text-orange-600">
            {summary?.openDisputes ?? "—"}{" "}
            <span className="text-xs font-normal text-gray-400">Cases</span>
          </p>
          <p className="text-[11px] text-gray-400 mt-1">Active complaints requiring admin review</p>
        </div>

        {/* 9. PENDING REFUNDS */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold tracking-wider uppercase text-gray-400">
              Pending Refunds
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <RotateCcw size={18} />
            </div>
          </div>
          <p className="text-2xl font-bold text-blue-600">
            {summary?.pendingRefunds ?? "—"}{" "}
            <span className="text-xs font-normal text-gray-400">Requests</span>
          </p>
          <p className="text-[11px] text-gray-400 mt-1">Awaiting refund authorization</p>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="border-b border-gray-200 mb-6 flex gap-4">
        <button
          onClick={() => {
            setActiveTab("payments");
            setStatusFilter("");
          }}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "payments"
              ? "border-[#cb6f4d] text-[#cb6f4d]"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <CreditCard size={16} />
          <span>Customer Payments</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
            {payments.length}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab("refunds");
            setStatusFilter("");
          }}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "refunds"
              ? "border-[#cb6f4d] text-[#cb6f4d]"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <RotateCcw size={16} />
          <span>Refund Management</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
            {refunds.length}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab("transactions");
            setStatusFilter("");
            setTxTypeFilter("");
          }}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "transactions"
              ? "border-[#cb6f4d] text-[#cb6f4d]"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <ShieldCheck size={16} />
          <span>Transaction History & Audit</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
            {transactions.length}
          </span>
        </button>
      </div>

      {/* ── TAB 1: Customer Payments ─────────────────────────────────────────── */}
      {activeTab === "payments" && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px] max-w-xs">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#cb6f4d]"
                size={16}
              />
              <input
                type="text"
                placeholder="Search order ref, buyer, seller..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-[#cb6f4d]/40 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#cb6f4d]/20 bg-white text-gray-800"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-2 px-3 border border-gray-200 rounded-xl text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#cb6f4d]/20 cursor-pointer"
            >
              <option value="">All statuses</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="refunded">Refunded</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl shadow-xs border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[760px]">
                <thead>
                  <tr className="bg-[#ebf1f7] text-[#4a5568] text-xs font-semibold border-b border-gray-100">
                    <th className="px-5 py-4">ID</th>
                    <th className="px-5 py-4">Order Ref</th>
                    <th className="px-5 py-4">Buyer</th>
                    <th className="px-5 py-4">Seller</th>
                    <th className="px-5 py-4">Gross Paid</th>
                    <th className="px-5 py-4">Commission (10%)</th>
                    <th className="px-5 py-4">Seller Net (90%)</th>
                    <th className="px-5 py-4 text-center">Status</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        {Array.from({ length: 9 }).map((__, j) => (
                          <td key={j} className="px-5 py-4">
                            <div className="h-4 bg-gray-100 rounded w-3/4" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-5 py-12 text-center text-sm text-gray-400">
                        No payments found matching criteria
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-4 text-sm font-semibold text-gray-400">#{p.id}</td>
                        <td className="px-5 py-4 text-sm font-semibold text-[#cb6f4d]">
                          {p.orderRef}
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-700 font-medium">{p.buyer}</td>
                        <td className="px-5 py-4 text-sm text-gray-600">{p.seller}</td>
                        <td className="px-5 py-4 text-sm font-bold text-[#2d3748]">
                          {p.amount.toLocaleString()} THB
                        </td>
                        <td className="px-5 py-4 text-sm font-medium text-[#cb6f4d]">
                          {p.commission.toLocaleString()} THB
                        </td>
                        <td className="px-5 py-4 text-sm font-semibold text-gray-700">
                          {p.sellerAmount.toLocaleString()} THB
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span
                            className={`${statusColors[p.status] ?? "bg-gray-400"} text-white px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide inline-block min-w-[72px]`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => handleDownloadSlip(p)}
                            disabled={downloadingId === p.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-[#cb6f4d] hover:bg-[#f5e6df] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {downloadingId === p.id ? (
                              <>
                                <Loader2 size={13} className="animate-spin" /> Generating…
                              </>
                            ) : (
                              <>
                                <Download size={13} /> Official Slip
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: Refund Management (Requirement 9) ────────────────────────── */}
      {activeTab === "refunds" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[220px] max-w-xs">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#cb6f4d]"
                size={16}
              />
              <input
                type="text"
                placeholder="Search refund ID, order #, buyer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-[#cb6f4d]/40 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#cb6f4d]/20 bg-white text-gray-800"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-2 px-3 border border-gray-200 rounded-xl text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#cb6f4d]/20 cursor-pointer"
            >
              <option value="">All statuses</option>
              <option value="REQUESTED">Requested</option>
              <option value="APPROVED">Approved</option>
              <option value="PROCESSING">Processing</option>
              <option value="SUCCEEDED">Succeeded</option>
              <option value="FAILED">Failed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div className="bg-white rounded-2xl shadow-xs border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[900px]">
                <thead>
                  <tr className="bg-[#ebf1f7] text-[#4a5568] text-xs font-semibold border-b border-gray-100">
                    <th className="px-5 py-4">Refund ID</th>
                    <th className="px-5 py-4">Order Number</th>
                    <th className="px-5 py-4">Buyer</th>
                    <th className="px-5 py-4">Seller</th>
                    <th className="px-5 py-4">Refund Amount</th>
                    <th className="px-5 py-4">Reason</th>
                    <th className="px-5 py-4">Stripe Refund ID</th>
                    <th className="px-5 py-4 text-center">Status</th>
                    <th className="px-5 py-4">Dates (Req / Comp)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        {Array.from({ length: 9 }).map((__, j) => (
                          <td key={j} className="px-5 py-4">
                            <div className="h-4 bg-gray-100 rounded w-3/4" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : filteredRefunds.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-5 py-12 text-center text-sm text-gray-400">
                        No refund records found
                      </td>
                    </tr>
                  ) : (
                    filteredRefunds.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-4 text-sm font-bold text-gray-700">{r.refundId}</td>
                        <td className="px-5 py-4 text-sm font-semibold text-[#cb6f4d]">
                          {r.orderNumber}
                        </td>
                        <td className="px-5 py-4 text-sm font-medium text-gray-800">{r.buyer}</td>
                        <td className="px-5 py-4 text-sm text-gray-600">{r.seller}</td>
                        <td className="px-5 py-4 text-sm font-bold text-rose-600">
                          {r.refundAmount.toLocaleString()} THB
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-600 max-w-xs truncate">
                          {r.reason}
                        </td>
                        <td className="px-5 py-4 text-xs font-mono text-gray-500">
                          <span className="bg-gray-100 px-2 py-0.5 rounded text-[11px]">
                            {r.stripeRefundId || "—"}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-md text-[10px] font-bold border uppercase tracking-wide inline-block ${
                              refundStatusBadge[r.status] || "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-xs text-gray-500">
                          <div>
                            Req:{" "}
                            {new Date(r.requestDate).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                            })}
                          </div>
                          <div>
                            {r.completionDate ? (
                              <span className="text-emerald-600">
                                Done:{" "}
                                {new Date(r.completionDate).toLocaleDateString("en-GB", {
                                  day: "2-digit",
                                  month: "short",
                                })}
                              </span>
                            ) : (
                              <span className="text-amber-600">Pending review</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: Transaction Audit Trail (Requirement 10) ──────────────────── */}
      {activeTab === "transactions" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[220px] max-w-xs">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#cb6f4d]"
                size={16}
              />
              <input
                type="text"
                placeholder="Search transaction ID, order ref, stripe..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-[#cb6f4d]/40 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#cb6f4d]/20 bg-white text-gray-800"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={txTypeFilter}
                onChange={(e) => setTxTypeFilter(e.target.value)}
                className="py-2 px-3 border border-gray-200 rounded-xl text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#cb6f4d]/20 cursor-pointer"
              >
                <option value="">All transaction types</option>
                <option value="CUSTOMER_PAYMENT">Customer Payment</option>
                <option value="PLATFORM_COMMISSION">Platform Commission</option>
                <option value="SELLER_TRANSFER">Seller Transfer</option>
                <option value="SELLER_BANK_PAYOUT">Bank Payout</option>
                <option value="BUYER_REFUND">Buyer Refund</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="py-2 px-3 border border-gray-200 rounded-xl text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#cb6f4d]/20 cursor-pointer"
              >
                <option value="">All statuses</option>
                <option value="COMPLETED">Completed</option>
                <option value="PENDING">Pending</option>
                <option value="FAILED">Failed</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xs border border-gray-100 overflow-hidden">
            <div className="p-3 bg-amber-50/70 border-b border-amber-100 flex items-center justify-between text-xs text-amber-900">
              <span className="font-semibold flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-amber-700" />
                Immutable Financial Audit Trail: Read-only ledger of all platform money flows
              </span>
              <span className="text-gray-500">Admins cannot edit or delete audit logs</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[950px]">
                <thead>
                  <tr className="bg-[#ebf1f7] text-[#4a5568] text-xs font-semibold border-b border-gray-100">
                    <th className="px-5 py-4">Transaction ID</th>
                    <th className="px-5 py-4">Order ID</th>
                    <th className="px-5 py-4">Transaction Type</th>
                    <th className="px-5 py-4">Amount</th>
                    <th className="px-5 py-4">Stripe Reference</th>
                    <th className="px-5 py-4 text-center">Status</th>
                    <th className="px-5 py-4">Initiated By</th>
                    <th className="px-5 py-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        {Array.from({ length: 8 }).map((__, j) => (
                          <td key={j} className="px-5 py-4">
                            <div className="h-4 bg-gray-100 rounded w-3/4" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-12 text-center text-sm text-gray-400">
                        No transactions recorded
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((tx) => {
                      const badge = txTypeColors[tx.type] || {
                        bg: "bg-gray-100 text-gray-700",
                        text: tx.type,
                      };
                      return (
                        <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-5 py-4 text-xs font-mono font-bold text-gray-700">
                            {tx.id}
                          </td>
                          <td className="px-5 py-4 text-sm font-semibold text-[#cb6f4d]">
                            {tx.orderId}
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold ${badge.bg}`}
                            >
                              {badge.text}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-sm font-bold text-[#2d3748]">
                            {tx.amount.toLocaleString()} {tx.currency}
                          </td>
                          <td className="px-5 py-4 text-xs font-mono text-gray-500">
                            {tx.stripeReference}
                          </td>
                          <td className="px-5 py-4 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                tx.status === "COMPLETED"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : tx.status === "PENDING"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {tx.status}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-sm text-gray-600">{tx.initiatedBy}</td>
                          <td className="px-5 py-4 text-xs text-gray-500 whitespace-nowrap">
                            {new Date(tx.createdAt).toLocaleString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
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
    </div>
  );
}
