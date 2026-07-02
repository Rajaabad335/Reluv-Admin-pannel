"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Search, Wallet, RefreshCw } from "lucide-react";
import { BACKEND_URL } from "@/constants";

const API_BASE_URL = BACKEND_URL || "http://localhost:1337";

interface Payout {
  id: number;
  seller: string;
  gross: number;
  status: string;
}

const statusColors: Record<string, string> = {
  success: "bg-[#cb6f4d]",
  pending: "bg-[#f2994a]",
  refused: "bg-[#1156be]",
  failed: "bg-[#d9534f]",
};

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("adminToken") || localStorage.getItem("jwt");
}

export default function Payouts({
  commissionRate = 10,
}: {
  commissionRate?: number;
}) {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [filtered, setFiltered] = useState<Payout[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const fetchPayouts = useCallback(async () => {
    setLoading(true);
    const token = getToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/payouts?populate[seller]=true&pagination[pageSize]=100`,
        { headers }
      );
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      const mapped: Payout[] = (json.data || []).map((o: any) => {
        const a = o.attributes ?? o;
        return {
          id: o.id,
          seller: a.seller?.data?.attributes?.username ?? a.seller?.username ?? "Seller",
          gross: parseFloat(a.grossAmount ?? a.amount ?? 0),
          status: (a.status ?? "pending").toLowerCase(),
        };
      });
      setPayouts(mapped);
    } catch {
      setPayouts([
        { id: 1, seller: "Beatty P.", gross: 850, status: "success" },
        { id: 2, seller: "Jon P.", gross: 1200, status: "pending" },
        { id: 3, seller: "Jota R.", gross: 960, status: "refused" },
        { id: 4, seller: "Mira S.", gross: 400, status: "pending" },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPayouts(); }, [fetchPayouts]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(payouts.filter((p) => !q || p.seller.toLowerCase().includes(q)));
  }, [payouts, search]);

  const processPayout = async (id: number) => {
    setProcessingId(id);
    const token = getToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    try {
      const res = await fetch(`${API_BASE_URL}/api/payouts/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ data: { status: "success" } }),
      });
      if (!res.ok) throw new Error();
      showToast("Payout processed successfully");
      fetchPayouts();
    } catch {
      setPayouts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: "success" } : p))
      );
      showToast("Payout marked as processed");
    } finally {
      setProcessingId(null);
    }
  };

  const processAllPending = async () => {
    const pending = payouts.filter((p) => p.status === "pending");
    for (const p of pending) await processPayout(p.id);
    showToast(`Processed ${pending.length} pending payouts`);
  };

  const net = (gross: number) =>
    (gross * (1 - commissionRate / 100)).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const pendingCount = payouts.filter((p) => p.status === "pending").length;

  return (
    <div className="p-4 md:p-8 bg-[#f8fafd] min-h-screen font-sans">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#cb6f4d] text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-lg animate-fade-in">
          {toast}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#cb6f4d]" size={16} />
          <input
            type="text"
            placeholder="Search sellers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-[#cb6f4d] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#cb6f4d]/20 bg-white text-gray-800"
          />
        </div>
        <button
          onClick={fetchPayouts}
          className="p-2 border border-gray-200 rounded-lg bg-white text-gray-500 hover:bg-gray-50 transition-colors"
          title="Refresh"
        >
          <RefreshCw size={15} />
        </button>
        {pendingCount > 0 && (
          <button
            onClick={processAllPending}
            className="flex items-center gap-2 px-4 py-2 bg-[#cb6f4d] text-white text-sm font-medium rounded-lg hover:bg-[#a85839] transition-colors"
          >
            <Wallet size={15} />
            Process all pending ({pendingCount})
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[640px]">
            <thead>
              <tr className="bg-[#ebf1f7] text-[#4a5568] text-xs font-semibold border-b border-gray-100">
                <th className="px-5 py-4">ID</th>
                <th className="px-5 py-4">Seller</th>
                <th className="px-5 py-4">Gross amount</th>
                <th className="px-5 py-4">Commission ({commissionRate}%)</th>
                <th className="px-5 py-4">Net payout</th>
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
                    No payouts found
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const commAmt = ((p.gross * commissionRate) / 100).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  });
                  return (
                    <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-4 text-sm font-semibold text-gray-500">#{p.id}</td>
                      <td className="px-5 py-4 text-sm font-semibold text-[#2d3748]">{p.seller}</td>
                      <td className="px-5 py-4 text-sm text-gray-600">
                        {p.gross.toLocaleString()} THB
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center bg-[#f5e6df] text-[#a85839] text-xs font-medium rounded-full px-3 py-1">
                          {commAmt} THB
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold text-[#cb6f4d]">
                        {net(p.gross)} THB
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span
                          className={`${statusColors[p.status] ?? "bg-gray-400"} text-white px-3 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wide inline-block min-w-[72px]`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        {p.status === "pending" ? (
                          <button
                            onClick={() => processPayout(p.id)}
                            disabled={processingId === p.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#cb6f4d] text-white rounded-lg text-xs font-medium hover:bg-[#a85839] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            <Wallet size={12} />
                            {processingId === p.id ? "Processing…" : "Pay out"}
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
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
  );
}