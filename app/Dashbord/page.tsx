"use client";

import { MoreHorizontal, Bell, User } from "lucide-react";

const stats = [
  { label: "Total Users", value: "23,540", color: "text-[#007782]" },
  { label: "Total Sellers", value: "8,120", color: "text-[#1156be]" },
  { label: "Total Orders", value: "15,430", color: "text-slate-800" },
  { label: "Pending Payouts", value: "€4,320", color: "text-green-600" },
  { label: "Active Disputes", value: "18", color: "text-slate-800" },
  { label: "Revenue", value: "€61,750", color: "text-[#007782]" },
  { label: "Revenue 4", value: "€12,540", color: "text-orange-500" },
  { label: "Reported Items", value: "Stacked", isImage: true },
];

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-[#f8fafd] p-8">
      {/* Top Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-[#2d3748] text-2xl font-bold">Admin Dashboard</h1>
        <div className="flex items-center gap-4">
          <div className="p-2 bg-white rounded-lg shadow-sm border border-gray-100">
            <User size={20} className="text-gray-500" />
          </div>
          <img 
            src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" 
            alt="Admin" 
            className="w-10 h-10 rounded-lg border-2 border-white shadow-sm"
          />
          <Bell size={24} className="text-gray-400 ml-2" />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-gray-50">
            <p className="text-gray-500 text-sm font-semibold mb-2">{stat.label}</p>
            {stat.isImage ? (
              <div className="flex -space-x-3 mt-2">
                <div className="w-8 h-8 rounded-full bg-teal-400 border-2 border-white" />
                <div className="w-8 h-8 rounded-full bg-blue-400 border-2 border-white" />
                <div className="w-8 h-8 rounded-full bg-orange-300 border-2 border-white" />
              </div>
            ) : (
              <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            )}
          </div>
        ))}
      </div>

      {/* Recent Orders Section */}
      <div className="bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-gray-50 overflow-hidden">
        <div className="p-6 flex justify-between items-center border-b border-gray-50">
          <h2 className="text-lg font-bold text-[#2d3748]">Recent Orders</h2>
          <MoreHorizontal className="text-gray-400 cursor-pointer" />
        </div>
        <table className="w-full text-left">
          <thead className="bg-gray-50/50 text-gray-400 text-sm uppercase">
            <tr>
              <th className="px-6 py-4 font-semibold text-xs">Order ID</th>
              <th className="px-6 py-4 font-semibold text-xs">Buyer</th>
              <th className="px-6 py-4 font-semibold text-xs">Amount</th>
              <th className="px-6 py-4 font-semibold text-xs">Status</th>
              <th className="px-6 py-4 font-semibold text-xs text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            <OrderRow id="60,3803" buyer="Eivaf Robers" amount="$5,000" status="Paid" statusColor="bg-green-100 text-green-700" />
            <OrderRow id="€0,4863" buyer="Kalle Trenssse" amount="$5,600" status="Seller" statusColor="bg-orange-100 text-orange-700" />
          </tbody>
        </table>
      </div>

      {/* Bottom Grid for Payouts/Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        {/* Simplified Pending Payouts Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-50">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-bold text-[#2d3748]">Pending Payouts</h2>
            <MoreHorizontal size={18} className="text-gray-300" />
          </div>
          <div className="space-y-4">
            <PayoutItem name="Mark Mondez" amount="€11,009.50" />
            <PayoutItem name="Goby Bariho" amount="€694,500" />
          </div>
        </div>

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
             <span className="px-3 py-1 bg-blue-100 text-blue-700 text-[10px] rounded uppercase font-bold">Detailed</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function OrderRow({ id, buyer, amount, status, statusColor }: any) {
  return (
    <tr className="hover:bg-gray-50/50 transition-colors">
      <td className="px-6 py-4 text-sm font-medium text-slate-700">{id}</td>
      <td className="px-6 py-4 text-sm text-blue-500 font-medium">{buyer}</td>
      <td className="px-6 py-4 text-sm font-bold text-slate-800">{amount}</td>
      <td className="px-6 py-4">
        <span className={`px-3 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider ${statusColor}`}>
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
        <div className="w-10 h-10 bg-gray-200 rounded-lg overflow-hidden" />
        <span className="text-sm font-medium text-slate-700">{name}</span>
      </div>
      <span className="font-bold text-slate-800">{amount}</span>
    </div>
  );
}