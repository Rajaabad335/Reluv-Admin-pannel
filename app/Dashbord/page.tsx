"use client";

import { useEffect, useRef, useState } from "react";
import { MoreHorizontal, ExternalLink, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { BACKEND_URL } from "@/constants";

const DISPUTE_STATUS_COLORS: Record<string, string> = {
  OPEN:         "bg-red-100 text-red-700",
  UNDER_REVIEW: "bg-amber-100 text-amber-700",
  RESOLVED:     "bg-green-100 text-green-700",
  REJECTED:     "bg-gray-100 text-gray-500",
  CLOSED:       "bg-gray-100 text-gray-500",
};

const REASON_LABELS: Record<string, string> = {
  ITEM_NOT_RECEIVED: "Item Not Received",
  DAMAGED_PRODUCT:   "Damaged Product",
  WRONG_ITEM:        "Wrong Item",
  PAYMENT_ISSUE:     "Payment Issue",
};

export default function Dashboard() {
  const [stats,         setStats]         = useState<any[]>([]);
  const [orders,        setOrders]        = useState<any[]>([]);
  const [payouts,       setPayouts]       = useState<any[]>([]);
  const [reportedItems, setReportedItems] = useState<any[]>([]);
  const [loading,       setLoading]       = useState(true);
  const hasFetched = useRef(false);
  const router = useRouter();

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/dashboard-data`);
      if (!res.ok) return;
      const json = await res.json();
      const data = json?.data;
      if (data?.stats)         setStats(data.stats);
      if (data?.orders)        setOrders(data.orders);
      if (data?.payouts)       setPayouts(data.payouts);
      if (data?.reportedItems) setReportedItems(data.reportedItems);
    } catch (err) {
      console.error("Dashboard fetch failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#cb6f4d] border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm font-medium">Loading ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#f8fafd]">

      {/* ── Stats Grid ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat: any, i: number) => (
          <div
            key={i}
            className="bg-white p-6 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-gray-50"
          >
            <p className="text-gray-500 text-sm font-semibold mb-2">{stat?.label}</p>
            <p className={`text-3xl font-bold ${stat?.color}`}>{stat?.value}</p>
          </div>
        ))}
      </div>

      {/* ── Recent Orders ──────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-gray-50 overflow-hidden">
        <div className="p-6 flex justify-between items-center border-b border-gray-50">
          <h2 className="text-lg font-bold text-[#2d3748]">Recent Orders</h2>
          <button
            onClick={() => router.push("/orders")}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#cb6f4d] hover:underline"
          >
            See all <ExternalLink size={12} />
          </button>
        </div>

        <table className="w-full text-left">
          <thead className="bg-gray-50/50 text-gray-400 text-sm uppercase">
            <tr>
              <th className="px-6 py-4 text-xs">Order ID</th>
              <th className="px-6 py-4 text-xs">Buyer</th>
              <th className="px-6 py-4 text-xs">Amount</th>
              <th className="px-6 py-4 text-xs">Status</th>
              <th className="px-6 py-4 text-xs text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {orders.map((order: any, i: number) => (
              <OrderRow
                key={i}
                id={order.id}
                buyer={order.buyer}
                amount={order.amount}
                status={order.status}
                statusColor={
                  order.status?.toLowerCase() === "paid"
                    ? "bg-green-100 text-green-700"
                    : order.status?.toLowerCase() === "failed"
                    ? "bg-red-100 text-red-700"
                    : "bg-orange-100 text-orange-700"
                }
                onView={() => router.push(`/orders?orderId=${order.id}`)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Bottom Section ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">

        {/* Pending Payouts */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-50">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-bold text-[#2d3748]">Pending Payouts</h2>
            <MoreHorizontal size={18} className="text-gray-300" />
          </div>

          {payouts.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">
              No pending payouts.
            </p>
          ) : (
            <div className="space-y-3">
              {payouts.map((p: any, i: number) => (
                <PayoutItem
                  key={i}
                  name={p.name}
                  amount={p.amount}
                  orderCount={p.orderCount}
                />
              ))}
            </div>
          )}
        </div>

        {/* Reported Items */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-50">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-bold text-[#2d3748]">Reported Items</h2>
            <button
              onClick={() => router.push("/Disputes")}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#cb6f4d] hover:underline"
            >
              See all <ExternalLink size={12} />
            </button>
          </div>

          {reportedItems.length === 0 ? (
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={16} className="text-green-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">No active disputes</p>
                <p className="text-xs text-gray-400">All clear!</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {reportedItems.map((item: any) => (
                <ReportedItem
                  key={item.id}
                  item={item}
                  onClick={() =>
                    router.push(`/Disputes?disputeId=${item.id}`)
                  }
                />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function OrderRow({
  id, buyer, amount, status, statusColor, onView,
}: {
  id: number | string;
  buyer: string;
  amount: string;
  status: string;
  statusColor: string;
  onView: () => void;
}) {
  return (
    <tr
      className="hover:bg-gray-50/50 transition-colors cursor-pointer group"
      onClick={onView}
    >
      <td className="px-6 py-4 text-sm font-bold text-[#cb6f4d] group-hover:underline">
        #{id}
      </td>
      <td className="px-6 py-4 text-sm text-[#cb6f4d] font-medium">{buyer}</td>
      <td className="px-6 py-4 text-sm font-bold text-slate-800">{amount}</td>
      <td className="px-6 py-4">
        <span className={`px-3 py-1 rounded-md text-[11px] font-bold uppercase ${statusColor}`}>
          {status}
        </span>
      </td>
      <td className="px-6 py-4 text-right">
        <ExternalLink
          size={14}
          className="inline text-gray-300 group-hover:text-[#cb6f4d] transition-colors"
        />
      </td>
    </tr>
  );
}

function PayoutItem({
  name,
  amount,
  orderCount,
}: {
  name: string;
  amount: string;
  orderCount: number;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-gray-50 hover:bg-gray-50/50 transition-colors">
      <div className="flex items-center gap-3">
        {/* Avatar placeholder */}
        <div className="w-9 h-9 bg-gradient-to-br from-[#cb6f4d]/20 to-[#cb6f4d]/10 rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-bold text-[#cb6f4d]">
            {name.charAt(0).toUpperCase()}
          </span>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-700">{name}</p>
          <p className="text-xs text-gray-400">
            {orderCount} pending order{orderCount !== 1 ? "s" : ""}
          </p>
        </div>
      </div>
      <span className="font-bold text-slate-800 text-sm">{amount}</span>
    </div>
  );
}

function ReportedItem({
  item,
  onClick,
}: {
  item: {
    id: number;
    reason: string;
    status: string;
    raisedBy: string;
    orderId: number | null;
  };
  onClick: () => void;
}) {
  const statusColor =
    DISPUTE_STATUS_COLORS[item.status] ?? "bg-gray-100 text-gray-500";
  const reasonLabel =
    REASON_LABELS[item.reason] ?? item.reason.replace(/_/g, " ");

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-red-50/50 transition-colors group"
    >
      <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
        <AlertTriangle size={16} className="text-orange-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-700 truncate">
          {reasonLabel}
        </p>
        <p className="text-xs text-gray-400 truncate">
          By {item.raisedBy}
          {item.orderId ? ` · Order #${item.orderId}` : ""}
        </p>
      </div>
      <span className={`flex-shrink-0 px-2.5 py-1 rounded text-[10px] font-bold uppercase ${statusColor}`}>
        {item.status.replace("_", " ")}
      </span>
    </div>
  );
}