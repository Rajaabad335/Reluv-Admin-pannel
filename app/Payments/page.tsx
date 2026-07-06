"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Search, Eye } from "lucide-react";
import { BACKEND_URL } from "@/constants";

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
                      <button className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-[#cb6f4d] hover:bg-[#f5e6df] transition-colors">
                        <Eye size={13} /> View
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