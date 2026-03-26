"use client";

import React from "react";
import { Search, ChevronDown, Mail } from "lucide-react";

const mockDisputes = [
  { id: 19, disputeId: "270012022", order: "Lione Pleat", buyer: "Jack Peris", amount: "$16.00", status: "New", statusColor: "bg-[#007782]" },
  { id: 12, disputeId: "27001023", order: "Bow Botat", buyer: "Jnrtt Peris", amount: "$16.00", status: "Resolved", statusColor: "bg-[#1156be]" },
  { id: 14, disputeId: "27002002", order: "Jota Ames", buyer: "Sarith Assees", amount: "$10.00", status: "In Court", statusColor: "bg-[#56ab65]" },
];

export default function Disputes() {
  return (
    <div className="p-4 md:p-8 bg-[#f8fafd] min-h-screen font-sans">
      
      {/* Search Input Box - Responsive width */}
      <div className="mb-6 md:mb-8">
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#007782]" size={18} />
          <input
            type="text"
            placeholder="Search..."
            className="w-full pl-10 pr-4 py-2.5 border border-[#007782] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1156be]/20 bg-white shadow-sm text-sm text-gray-800"
          />
        </div>
      </div>

      {/* Disputes Table Container - Added horizontal scroll for mobile */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px] md:min-w-full">
            <thead>
              <tr className="bg-[#ebf1f7] text-[#4a5568] text-xs md:text-sm font-bold">
                <th className="px-4 md:px-6 py-4">ID</th>
                <th className="px-4 md:px-6 py-4">Dispute ID</th>
                <th className="px-4 md:px-6 py-4">Order</th>
                <th className="px-4 md:px-6 py-4">Buyer</th>
                <th className="px-4 md:px-6 py-4">Seller</th>
                <th className="px-4 md:px-6 py-4 text-center">Status</th>
                <th className="px-4 md:px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {mockDisputes.map((dispute) => (
                <tr key={dispute.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 md:px-6 py-4 md:py-5 text-sm font-bold text-gray-700">{dispute.id}</td>
                  <td className="px-4 md:px-6 py-4 md:py-5 text-sm font-bold text-gray-700">{dispute.disputeId}</td>
                  <td className="px-4 md:px-6 py-4 md:py-5 text-sm font-bold text-[#2d3748]">{dispute.order}</td>
                  <td className="px-4 md:px-6 py-4 md:py-5 text-sm font-bold text-gray-700">{dispute.buyer}</td>
                  <td className="px-4 md:px-6 py-4 md:py-5 text-sm font-bold text-[#2d3748]">{dispute.amount}</td>
                  <td className="px-4 md:px-6 py-4 md:py-5 text-center">
                    <span className={`${dispute.statusColor} text-white px-3 md:px-4 py-1.5 rounded-md text-[10px] md:text-xs font-bold min-w-[80px] inline-block`}>
                      {dispute.status}
                    </span>
                  </td>
                  <td className="px-4 md:px-6 py-4 md:py-5">
                    <div className="flex justify-end">
                      <div className="flex items-center border border-gray-200 rounded-md overflow-hidden bg-white shadow-sm">
                        <button className="px-3 py-1.5 hover:bg-gray-50 text-[#1156be] border-r border-gray-200 transition-colors">
                          <Mail size={16} strokeWidth={2.5} />
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