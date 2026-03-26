"use client";

import React from "react";
import { Search, ChevronDown, CheckSquare } from "lucide-react";

const mockPayments = [
  { id: 11, paymentId: "27/00/2023", order: "Joig Klibte", buyer: "Bolt Salith", amount: "$16.00", status: "Paid", statusColor: "bg-[#007782]" },
  { id: 12, paymentId: "27/00/2001", order: "Dreck Clsat", buyer: "Bot Salith", amount: "$56.00", status: "New", statusColor: "bg-[#d9534f]" },
  { id: 15, paymentId: "27/00/2021", order: "Drarik Rout", buyer: "Role Salith", amount: "$12.00", status: "Returned", statusColor: "bg-[#1156be]" },
];

export default function Payments() {
  return (
    <div className="p-4 md:p-8 bg-[#f8fafd] min-h-screen font-sans">

      {/* Search Section - Full width on mobile, constrained on desktop */}
      <div className="mb-6 md:mb-8">
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#007782]" size={18} />
           <input
            type="text"
            placeholder="Search users..."
            // value={searchQuery}
            // onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-[#007782] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1156be]/20 bg-white text-gray-800 text-sm"
          />
        </div>
      </div>

      {/* Table Section - Added horizontal overflow wrapper */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px] md:min-w-full">
            <thead>
              <tr className="bg-[#ebf1f7] text-[#4a5568] text-xs md:text-sm font-bold border-b border-gray-100">
                <th className="px-4 md:px-6 py-4">ID</th>
                <th className="px-4 md:px-6 py-4">Payment ID</th>
                <th className="px-4 md:px-6 py-4">Order</th>
                <th className="px-4 md:px-6 py-4">Buyer</th>
                <th className="px-4 md:px-6 py-4">Amount</th>
                <th className="px-4 md:px-6 py-4 text-center">Status</th>
                <th className="px-4 md:px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {mockPayments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 md:px-6 py-4 md:py-5 text-sm font-bold text-gray-700">{payment.id}</td>
                  <td className="px-4 md:px-6 py-4 md:py-5 text-sm font-bold text-gray-700">{payment.paymentId}</td>
                  <td className="px-4 md:px-6 py-4 md:py-5 text-sm font-bold text-[#2d3748]">{payment.order}</td>
                  <td className="px-4 md:px-6 py-4 md:py-5 text-sm font-bold text-gray-500">{payment.buyer}</td>
                  <td className="px-4 md:px-6 py-4 md:py-5 text-sm font-black text-[#1a202c]">{payment.amount}</td>
                  <td className="px-4 md:px-6 py-4 md:py-5 text-center">
                    <span className={`${payment.statusColor} text-white px-3 md:px-4 py-1.5 rounded-md text-[10px] md:text-[11px] font-bold uppercase min-w-[80px] md:min-w-[90px] inline-block`}>
                      {payment.status}
                    </span>
                  </td>
                  <td className="px-4 md:px-6 py-4 md:py-5">
                    <div className="flex justify-end">
                      <div className="flex items-center border border-gray-200 rounded-md bg-white shadow-sm overflow-hidden">
                        <button className="px-3 py-1.5 hover:bg-gray-50 text-[#1156be] border-r border-gray-200">
                          <CheckSquare size={16} strokeWidth={2.5} />
                        </button>
                        <button className="px-2 py-1.5 hover:bg-gray-50 text-gray-400">
                          <ChevronDown size={16} />
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}