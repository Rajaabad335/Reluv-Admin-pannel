"use client";

import React from "react";
import { Search, ChevronDown, Wallet } from "lucide-react";

const mockPayouts = [
  { id: 11, payoutId: "27/00/2023", seller: "Beatty Pestals", amount: "$56.00", status: "Success", statusColor: "bg-[#007782]" },
  { id: 12, payoutId: "21/00/2023", seller: "Jont Patalls", amount: "$10.00", status: "Pending", statusColor: "bg-[#f2994a]" },
  { id: 13, payoutId: "2/00/2022", seller: "Jota Rames", amount: "$80.00", status: "Refused", statusColor: "bg-[#1156be]" },
];

export default function Payouts() {
  return (
    <div className="p-4 md:p-8 bg-[#f8fafd] min-h-screen font-sans">
      
      {/* Search Input Area - Full width on mobile, max-w-sm on desktop */}
      <div className="mb-6 md:mb-8">
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#007782]" size={18} />
          <input
            type="text"
            placeholder="Search..."
            className="w-full pl-10 pr-4 py-2.5 border border-[#007782] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1156be]/10 bg-white shadow-sm text-sm text-gray-800"
          />
        </div>
      </div>

      {/* Payouts Table Wrapper - Enables horizontal scroll on mobile */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[700px] md:min-w-full">
            <thead>
              <tr className="bg-[#ebf1f7] text-[#4a5568] text-xs md:text-sm font-bold">
                <th className="px-4 md:px-6 py-4">ID</th>
                <th className="px-4 md:px-6 py-4">Payout ID</th>
                <th className="px-4 md:px-6 py-4">Seller</th>
                <th className="px-4 md:px-6 py-4">Amount</th>
                <th className="px-4 md:px-6 py-4 text-center">Status</th>
                <th className="px-4 md:px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {mockPayouts.map((payout) => (
                <tr key={payout.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 md:px-6 py-4 md:py-5 text-sm font-bold text-gray-700">{payout.id}</td>
                  <td className="px-4 md:px-6 py-4 md:py-5 text-sm font-bold text-gray-700">{payout.payoutId}</td>
                  <td className="px-4 md:px-6 py-4 md:py-5 text-sm font-bold text-[#2d3748]">{payout.seller}</td>
                  <td className="px-4 md:px-6 py-4 md:py-5 text-sm font-black text-slate-800">{payout.amount}</td>
                  <td className="px-4 md:px-6 py-4 md:py-5 text-center">
                    <span className={`${payout.statusColor} text-white px-3 md:px-4 py-1.5 rounded-md text-[10px] md:text-[11px] font-bold uppercase min-w-[80px] md:min-w-[90px] inline-block tracking-wider`}>
                      {payout.status}
                    </span>
                  </td>
                  <td className="px-4 md:px-6 py-4 md:py-5">
                    <div className="flex justify-end">
                      <div className="flex items-center border border-gray-200 rounded-md overflow-hidden bg-white shadow-sm">
                        <button className="flex items-center gap-2 px-2 md:px-3 py-1.5 hover:bg-gray-50 text-[#1156be] font-bold text-xs md:text-sm border-r border-gray-200 transition-colors">
                          <Wallet size={14} strokeWidth={2.5} />
                          <span className="hidden xs:inline">Payout</span>
                        </button>
                        <button className="px-2 py-1.5 hover:bg-gray-50 text-gray-400 transition-colors">
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