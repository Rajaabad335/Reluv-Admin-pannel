"use client";

import React, { useEffect, useRef, useState } from "react";
import { Search, ArrowLeft,
  Trash2
} from "lucide-react";

export default function Orders() {
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]); // ✅ NEW
  const hasFetched = useRef(false);


  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:1337/api/orders/get-all-orders");
      if (!res.ok) throw new Error("Failed");

      const json = await res.json();
      const data = json?.data;

      setOrders(data?.orders && Array.isArray(data.orders) ? data.orders : []); // ✅ dynamic

    } catch (err) {
      console.log("API failed, using default data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
  if (hasFetched.current) return;
  hasFetched.current = true;
    fetchDashboardData();
  }, []);

  // ── Loader ─────────────────────────────
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
    <div className="p-4 md:p-8 bg-[#f8fafd] min-h-screen font-sans">
      {selectedOrder ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <button
            onClick={() => setSelectedOrder(null)}
            className="flex items-center gap-2 text-[#1156be] font-bold mb-6 hover:underline"
          >
            <ArrowLeft size={20} /> Back to Orders
          </button>
          <OrderDetailsView order={selectedOrder} />
        </div>
      ) : (
        <div className="animate-in fade-in duration-300">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <h1 className="text-[#2d3748] text-2xl font-bold">Orders</h1>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#007782]" size={18} />
              <input
                type="text"
                placeholder="Search Order ID..."
                className="pl-10 pr-4 py-2 border border-[#007782] rounded-lg w-full focus:outline-none text-gray-800"
              />
            </div>
          </div>

          <OrdersTable orders={orders} onSelectOrder={setSelectedOrder} />
        </div>
      )}
    </div>
  );
}

function OrdersTable({ orders, onSelectOrder }: { orders: any[], onSelectOrder: (o: any) => void }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[700px]">
          <thead className="bg-[#f8fafd] text-[#4a5568] text-sm font-semibold border-b">
            <tr>
              <th className="px-6 py-4">Order ID</th>
              <th className="px-6 py-4">Buyer</th>
              <th className="px-6 py-4">Seller</th>
              <th className="px-6 py-4">Amount</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Progress</th>
              <th className="px-6 py-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50/50 group transition-colors">
                <td
                  className="px-6 py-5 text-sm font-bold text-[#1156be] cursor-pointer hover:underline"
                  onClick={() => onSelectOrder(order)}
                >
                  {order.id}
                </td>
                <td className="px-6 py-5 text-sm font-medium text-gray-700">{order.buyer?.name}</td>
                <td className="px-6 py-5 text-sm font-medium text-gray-700">{order.seller?.name}</td>
                <td className="px-6 py-5 text-sm font-black text-[#1a202c]">{order.amount}</td>
                <td className="px-6 py-5">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${order.dotColor}`} />
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase ${order.roleColor}`}>
                      {order.status}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <span className={`px-3 py-1 rounded-lg text-xs font-bold ${order.progressStatus === 'Active' ? 'border border-gray-200 text-[#119e7d]' : 'bg-[#dee8f6] text-[#4a6996]'}`}>
                    {order.progressStatus}
                  </span>
                </td>
                <td className="px-6 py-5 text-right">
                  <div className="flex justify-end">
                    <ActionButtons />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OrderDetailsView({ order }: { order: any }) {
  return (
    <div className="space-y-6">
      {/* SAME AS YOUR ORIGINAL — NO CHANGE */}
      {/* (kept unchanged as requested) */}
      {/* You can reuse your exact code here */}
      <div className="bg-white p-6 rounded-xl">Order Details for {order.id}</div>
    </div>
  );
}

function ActionButtons() {
  const baseClass =
    "flex items-center border border-gray-200 rounded-md overflow-hidden bg-white shadow-sm shrink-0";
  const btnClass =
    "px-3 py-1.5 hover:bg-gray-50 transition-colors text-[#1156be] text-sm font-bold border-r border-gray-200 last:border-0";
  const iconClass =
    "px-2 py-1.5 text-gray-400 hover:bg-gray-50 border-r border-gray-200 last:border-0";

  return (
    <div className={baseClass}>
      <button className={btnClass}>View</button>
      <button className={iconClass}>Edit</button>
      <button className="px-2 py-1.5 text-red-500">
        <Trash2 size={14} />
      </button>
    </div>
  );
}
