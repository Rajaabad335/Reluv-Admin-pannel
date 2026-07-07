"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Search, Download, Loader2 } from "lucide-react";
import { BACKEND_URL } from "@/constants";
import jsPDF from "jspdf";

const API_BASE_URL = BACKEND_URL || "http://localhost:1337";

interface Payment {
  id: number;
  orderRef: string;
  buyer: string;
  amount: number;
  status: string;
}

const statusColors: Record<string, string> = {
  paid: "bg-[#cb6f4d]",
  success: "bg-[#cb6f4d]",
  pending: "bg-[#f2994a]",
  refunded: "bg-[#1156be]",
  returned: "bg-[#1156be]",
  failed: "bg-[#d9534f]",
  new: "bg-[#d9534f]",
};

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("adminToken") || localStorage.getItem("jwt");
}

export default function Payments({
  commissionRate: initialCommissionRate = 10,
}: {
  commissionRate?: number;
}) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filtered, setFiltered] = useState<Payment[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [commissionRate, setCommissionRate] = useState(initialCommissionRate);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const stats = React.useMemo(() => {
    const paid = payments.filter((p) => p.status === "paid");
    const pending = payments.filter((p) => p.status === "pending");
    const total = paid.reduce((s, p) => s + p.amount, 0);
    return {
      total,
      commission: total * commissionRate / 100,
      pending: pending.reduce((s, p) => s + p.amount, 0),
      count: payments.length,
    };
  }, [payments, commissionRate]);

  const fetchCommissionRate = useCallback(async () => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/marketplace-settings?status=published`,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      const entry = Array.isArray(json.data) ? json.data[0] : json.data;
      const d = entry?.attributes ?? entry ?? {};
      const rate = parseFloat(d.commissionRate ?? initialCommissionRate);
      if (!Number.isNaN(rate)) setCommissionRate(rate);
    } catch {
      setCommissionRate(initialCommissionRate);
    }
  }, [API_BASE_URL, initialCommissionRate]);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/orders?populate[buyer]=true&pagination[pageSize]=100`,
        { headers: { "Content-Type": "application/json" } }
      );
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      const mapped: Payment[] = (json.data || []).map((o: any) => {
        const a = o.attributes ?? o;
        return {
          id: o.id,
          orderRef: a.orderRef ?? `ORD-${String(o.id).padStart(4, "0")}`,
          buyer: a.buyer?.data?.attributes?.username ?? a.buyer?.username ?? "Unknown",
          amount: parseFloat(a.totalAmount ?? a.total ?? 0),
          status: (a.paymentStatus ?? a.status ?? "pending").toLowerCase(),
        };
      });
      setPayments(mapped);
    } catch {
      setPayments([
        { id: 1, orderRef: "ORD-0001", buyer: "Aria K.", amount: 850, status: "paid" },
        { id: 2, orderRef: "ORD-0002", buyer: "Ben T.", amount: 1200, status: "paid" },
        { id: 3, orderRef: "ORD-0003", buyer: "Chanya R.", amount: 400, status: "pending" },
        { id: 4, orderRef: "ORD-0004", buyer: "Daniel M.", amount: 960, status: "refunded" },
        { id: 5, orderRef: "ORD-0005", buyer: "Elena S.", amount: 350, status: "paid" },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCommissionRate();
    fetchPayments();
  }, [fetchCommissionRate, fetchPayments]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      payments.filter(
        (p) =>
          (!q || p.orderRef.toLowerCase().includes(q) || p.buyer.toLowerCase().includes(q)) &&
          (!statusFilter || p.status === statusFilter)
      )
    );
  }, [payments, search, statusFilter]);

  const commission = (amount: number) =>
    ((amount * commissionRate) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // ── Slip generation ────────────────────────────────────────────────────────
  const handleDownloadSlip = async (payment: Payment) => {
    setDownloadingId(payment.id);
    try {
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const brand = "#cb6f4d";
      const dark = "#2d3748";
      const gray = "#8a94a3";

      const commissionAmt = (payment.amount * commissionRate) / 100;
      const netAmt = payment.amount - commissionAmt;
      const now = new Date();
      const dateStr = now.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

      // Header band
      doc.setFillColor(brand);
      doc.rect(0, 0, pageWidth, 90, "F");
      doc.setTextColor("#ffffff");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text("Reluv", 48, 45);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Payment Slip", 48, 64);

      doc.setFontSize(9);
      doc.text(`Generated: ${dateStr} · ${timeStr}`, pageWidth - 48, 45, { align: "right" });
      doc.text(`Ref: ${payment.orderRef}`, pageWidth - 48, 60, { align: "right" });

      let y = 130;

      const row = (label: string, value: string, opts?: { bold?: boolean; accent?: boolean }) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(gray);
        doc.text(label, 48, y);

        doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
        doc.setFontSize(opts?.bold ? 12 : 11);
        doc.setTextColor(opts?.accent ? brand : dark);
        doc.text(value, pageWidth - 48, y, { align: "right" });
        y += 28;
      };

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(dark);
      doc.text("Order Details", 48, y);
      y += 12;
      doc.setDrawColor("#ebf1f7");
      doc.line(48, y, pageWidth - 48, y);
      y += 26;

      row("Order Reference", payment.orderRef, { bold: true });
      row("Buyer", payment.buyer);
      row("Payment Status", payment.status.toUpperCase());

      y += 8;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(dark);
      doc.text("Amount Breakdown", 48, y);
      y += 12;
      doc.line(48, y, pageWidth - 48, y);
      y += 26;

      row("Order Amount", `${payment.amount.toLocaleString()} THB`);
      row(`Commission (${commissionRate}%)`, `-${commissionAmt.toFixed(2)} THB`, { accent: true });

      doc.setDrawColor("#e2e8f0");
      doc.line(48, y - 8, pageWidth - 48, y - 8);
      y += 8;

      row("Net Payout", `${netAmt.toFixed(2)} THB`, { bold: true });

      // Footer
      const footerY = doc.internal.pageSize.getHeight() - 60;
      doc.setDrawColor("#ebf1f7");
      doc.line(48, footerY, pageWidth - 48, footerY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(gray);
      doc.text(
        "This slip is a system-generated summary and does not constitute a tax invoice.",
        48,
        footerY + 20
      );
      doc.text("Reluv Marketplace", 48, footerY + 34);

      doc.save(`slip-${payment.orderRef}.pdf`);
    } catch (err) {
      console.error("Failed to generate slip:", err);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="p-4 md:p-8 bg-[#f8fafd] min-h-screen font-sans">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total collected", value: `${stats.total.toLocaleString()} TBH` },
          { label: "Commission earned", value: `${stats.commission.toFixed(0)} TBH`, accent: true },
          { label: "Pending volume", value: `${stats.pending.toLocaleString()} TBH` },
          { label: "Transactions", value: stats.count.toString() },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs text-gray-400 mb-1">{s.label}</p>
            <p className={`text-xl font-semibold ${s.accent ? "text-[#cb6f4d]" : "text-[#2d3748]"}`}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#cb6f4d]" size={16} />
          <input
            type="text"
            placeholder="Search payments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-[#cb6f4d] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#cb6f4d]/20 bg-white text-gray-800"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="py-2 px-3 border border-gray-200 rounded-lg text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#cb6f4d]/20 cursor-pointer"
        >
          <option value="">All statuses</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="refunded">Refunded</option>
          <option value="failed">Failed</option>
        </select>
        <button
          onClick={fetchPayments}
          className="py-2 px-4 border border-gray-200 rounded-lg text-sm bg-white text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[700px]">
            <thead>
              <tr className="bg-[#ebf1f7] text-[#4a5568] text-xs font-semibold border-b border-gray-100">
                <th className="px-5 py-4">ID</th>
                <th className="px-5 py-4">Order</th>
                <th className="px-5 py-4">Buyer</th>
                <th className="px-5 py-4">Amount</th>
                <th className="px-5 py-4">Commission ({commissionRate}%)</th>
                <th className="px-5 py-4 text-center">Status</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-3 bg-gray-100 rounded w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-gray-400">
                    No payments found
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-4 text-sm font-semibold text-gray-500">#{p.id}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-[#cb6f4d]">{p.orderRef}</td>
                    <td className="px-5 py-4 text-sm text-gray-600">{p.buyer}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-[#2d3748]">
                      {p.amount.toLocaleString()} TBH
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1 bg-[#f5e6df] text-[#a85839] text-xs font-medium rounded-full px-3 py-1">
                        {commission(p.amount)} TBH
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span
                        className={`${statusColors[p.status] ?? "bg-gray-400"} text-white px-3 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wide inline-block min-w-[72px]`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => handleDownloadSlip(p)}
                        disabled={downloadingId === p.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-[#cb6f4d] hover:bg-[#f5e6df] transition-colors disabled:opacity-60 disabled:cursor-not-allowed min-w-[120px] justify-center"
                      >
                        {downloadingId === p.id ? (
                          <>
                            <Loader2 size={13} className="animate-spin" /> Generating…
                          </>
                        ) : (
                          <>
                            <Download size={13} /> Download Slip
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
  );
}