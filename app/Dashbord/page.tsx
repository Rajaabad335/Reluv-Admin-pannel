"use client";

import { useEffect, useRef, useState } from "react";
import { MoreHorizontal, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { BACKEND_URL } from "@/constants";

export default function Dashboard() {
  const [stats, setStats]     = useState<any[]>([]);
  const [orders, setOrders]   = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const hasFetched = useRef(false);
  const router = useRouter();

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/dashboard-data`);
      if (!res.ok) return;
      const json = await res.json();
      const data = json?.data;
      if (data?.stats)   setStats(data.stats);
      if (data?.orders)  setOrders(data.orders);
      if (data?.payouts) setPayouts(data.payouts);
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
      {/* Stats Grid */}
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

      {/* Recent Orders */}
      <div className="bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-gray-50 overflow-hidden">
        <div className="p-6 flex justify-between items-center border-b border-gray-50">
          <h2 className="text-lg font-bold text-[#2d3748]">Recent Orders</h2>
          {/* "See all" navigates to the Orders page */}
          <button
            onClick={() => router.push("/orders")}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#1156be] hover:underline"
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
                buyer={order.buyer?.name ?? order.buyer}
                amount={order.amount}
                status={order.status}
                statusColor={
                  order.status?.toLowerCase() === "paid"
                    ? "bg-green-100 text-green-700"
                    : "bg-orange-100 text-orange-700"
                }
                // Clicking the row opens the Orders page — the Orders component
                // manages its own selected-order state, so we just navigate there.
                // If you want deep-link to a specific order, add ?orderId=X and
                // read it in the Orders component via useSearchParams().
                onView={() => router.push(`/orders?orderId=${order.id}`)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        {/* Payouts */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-50">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-bold text-[#2d3748]">Pending Payouts</h2>
            <MoreHorizontal size={18} className="text-gray-300" />
          </div>
          <div className="space-y-4">
            {payouts.map((p: any, i: number) => (
              <PayoutItem key={i} name={p.name} amount={p.amount} />
            ))}
          </div>
        </div>

        {/* Reported Items */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-50">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-bold text-[#2d3748]">Reported Items</h2>
            <MoreHorizontal size={18} className="text-gray-300" />
          </div>
          <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 bg-orange-100 rounded" />
            <div className="flex-1">
              <p className="text-sm font-medium">Held in Escrow</p>
              <p className="text-xs text-gray-400">Reason: Pending</p>
            </div>
            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-[10px] rounded uppercase font-bold">
              Detailed
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function OrderRow({
  id,
  buyer,
  amount,
  status,
  statusColor,
  onView,
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
      <td className="px-6 py-4 text-sm font-bold text-[#1156be] group-hover:underline">
        #{id}
      </td>
      <td className="px-6 py-4 text-sm text-blue-500 font-medium">{buyer}</td>
      <td className="px-6 py-4 text-sm font-bold text-slate-800">{amount}</td>
      <td className="px-6 py-4">
        <span className={`px-3 py-1 rounded-md text-[11px] font-bold uppercase ${statusColor}`}>
          {status}
        </span>
      </td>
      <td className="px-6 py-4 text-right">
        <ExternalLink size={14} className="inline text-gray-300 group-hover:text-[#1156be] transition-colors" />
      </td>
    </tr>
  );
}

function PayoutItem({ name, amount }: { name: string; amount: string }) {
  return (
    <div className="flex items-center justify-between p-2 border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gray-200 rounded-lg" />
        <span className="text-sm font-medium text-slate-700">{name}</span>
      </div>
      <span className="font-bold text-slate-800">{amount}</span>
    </div>
  );
}