"use client";

import { useEffect, useRef, useState } from "react";
import { MoreHorizontal, Bell, User } from "lucide-react";
// import { io } from "socket.io-client";

export default function Home() {
  /** 🔹 State (UNCHANGED UI behavior) */
  const [stats, setStats] = useState([]);
  const [orders, setOrders] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true); 
  const hasFetched = useRef(false);



  const fetchDashboardData = async () => {
    setLoading(true); // ← NEW
    try {
      const res = await fetch("http://localhost:1337/api/dashboard-data");
      if (!res.ok) return;

      const json = await res.json();
      const data = json?.data; // ← FIXED: unwrap nested data key

      if (data?.stats)   setStats(data.stats);
      if (data?.orders)  setOrders(data.orders);
      if (data?.payouts) setPayouts(data.payouts);

    } catch (err) {
      console.log("API failed, using default data");
    } finally {
      setLoading(false); // ← NEW
    }
  }

  /** 🔹 Run once on component mount */
  useEffect(() => {
  if (hasFetched.current) return;
  hasFetched.current = true;
    fetchDashboardData();
  }, []);

  // /** 🔹 Socket Integration */
  // useEffect(() => {
  //   const socket = io("http://localhost:3001"); // 🔥 your socket server

  //   socket.on("dashboard:update", () => {
  //     console.log("Socket update received");
  //     fetchDashboardData(); // 🔥 refresh data ONLY when event comes
  //   });

  //   return () => {
  //     socket.disconnect();
  //   };
  // }, []);

  // ── Loader ─────────────────────────────────────────────────────── NEW
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafd] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#007782] border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafd] p-8">   
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, i) => (
          <div
            key={i}
            className="bg-white p-6 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-gray-50"
          >
            <p className="text-gray-500 text-sm font-semibold mb-2">
              {stat?.label}
            </p>
              <p className={`text-3xl font-bold ${stat?.color}`}>
                {stat?.value}
              </p>
          </div>
        ))}
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-gray-50 overflow-hidden">
        <div className="p-6 flex justify-between items-center border-b border-gray-50">
          <h2 className="text-lg font-bold text-[#2d3748]">
            Recent Orders
          </h2>
          <MoreHorizontal className="text-gray-400 cursor-pointer" />
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
                  order.status === "Paid"
                    ? "bg-green-100 text-green-700"
                    : "bg-orange-100 text-orange-700"
                }
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
            <h2 className="font-bold text-[#2d3748]">
              Pending Payouts
            </h2>
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
            <h2 className="font-bold text-[#2d3748]">
              Reported Items
            </h2>
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

/** 🔹 Sub Components (UNCHANGED) */

function OrderRow({ id, buyer, amount, status, statusColor }: any) {
  return (
    <tr className="hover:bg-gray-50/50 transition-colors">
      <td className="px-6 py-4 text-sm font-medium text-slate-700">{id}</td>
      <td className="px-6 py-4 text-sm text-blue-500 font-medium">{buyer}</td>
      <td className="px-6 py-4 text-sm font-bold text-slate-800">{amount}</td>
      <td className="px-6 py-4">
        <span className={`px-3 py-1 rounded-md text-[11px] font-bold uppercase ${statusColor}`}>
          {status}
        </span>
      </td>
      <td className="px-6 py-4 text-right">
        <button className="text-gray-300 hover:text-gray-600">▼</button>
      </td>
    </tr>
  );
}

function PayoutItem({ name, amount }: any) {
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
//    should be in backend
// socket.emit("dashboard:update");
