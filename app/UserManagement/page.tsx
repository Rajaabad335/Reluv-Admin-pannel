"use client";

import React, { useState } from "react";
import { Search, ChevronDown, Pencil, Lock, X, Wallet } from "lucide-react";

const mockUsers = [
  { id: 22, name: "Laura Mendez", email: "laura@example.com", role: "Seller", status: "Active", type: "view" },
  { id: 40, name: "Adam Fauz", email: "laura@example.com", role: "Seller", status: "Active", type: "verify" },
  { id: 53, name: "Danny Hortz", email: "laura@example.com", role: "Seller", status: "Active", type: "verify" },
  { id: 53, name: "Yamis Chohin", email: "laura@example.com", role: "Admin", status: "Active", type: "verify" },
  { id: 62, name: "Mark Hopkins", email: "laura@example.com", role: "Seller", status: "Active", type: "wallet", amount: "€150.75" },
];

export default function UserManagement() {
  const [activeTab, setActiveTab] = useState("All Users");

  return (
    <div className="p-4 md:p-8 bg-[#f8fafd] min-h-screen font-sans">
      {/* Header with Search - Stacks on mobile */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <h1 className="text-[#2d3748] text-2xl font-bold">User Management</h1>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search"
            className="w-full pl-10 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1156be]/20 bg-white"
          />
        </div>
      </div>

      {/* Tabs Navigation - Scrollable row on mobile */}
      <div className="flex overflow-x-auto pb-2 mb-6 no-scrollbar">
        <div className="flex gap-0 bg-white rounded-lg border border-gray-200 shadow-sm shrink-0">
          {["All Users", "Verified", "Sellers", "Banned"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 md:px-6 py-2.5 text-sm font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === tab 
                  ? "bg-[#1156be] text-white" 
                  : "text-gray-500 hover:bg-gray-50 border-r border-gray-100 last:border-0"
              }`}
            >
              {tab}
              {tab === "Verified" && <ChevronDown size={14} />}
            </button>
          ))}
        </div>
      </div>

      {/* Table Container - Horizontal scroll for mobile */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[900px]">
            <thead className="bg-[#fcfdfe] border-b border-gray-100">
              <tr className="text-gray-500 text-sm">
                <th className="px-6 py-4 w-12"><input type="checkbox" className="rounded" /></th>
                <th className="px-6 py-4 font-semibold">ID</th>
                <th className="px-6 py-4 font-semibold">Name</th>
                <th className="px-6 py-4 font-semibold">Email</th>
                <th className="px-6 py-4 font-semibold">Role</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 text-right pr-10 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {mockUsers.map((user, idx) => (
                <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4"><input type="checkbox" className="rounded border-gray-300" /></td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-700">{user.id}</td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-800">{user.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{user.email}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-700">{user.role}</td>
                  <td className="px-6 py-4">
                    <span className="bg-[#56ab65] text-white px-3 py-1 rounded text-xs font-bold">
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end">
                       <ActionButtons type={user.type} amount={user.amount} />
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

function ActionButtons({ type, amount }: { type: string; amount?: string }) {
  const baseClass = "flex items-center border border-gray-200 rounded-md overflow-hidden bg-white shadow-sm shrink-0";
  const btnClass = "px-3 py-1.5 hover:bg-gray-50 transition-colors text-[#1156be] text-sm font-bold border-r border-gray-200 last:border-0";
  const iconClass = "px-2 py-1.5 text-gray-400 hover:bg-gray-50 border-r border-gray-200 last:border-0";

  if (type === "view") {
    return (
      <div className={baseClass}>
        <button className={btnClass}>View</button>
        <button className={iconClass}><Pencil size={14} /></button>
        <button className={iconClass}><Lock size={14} /></button>
        <button className="px-2 py-1.5 text-gray-400"><ChevronDown size={14} /></button>
      </div>
    );
  }

  if (type === "verify") {
    return (
      <div className={baseClass}>
        <button className={btnClass}>Verify</button>
        <button className={iconClass}><X size={14} className="text-gray-400" /></button>
        <button className={iconClass}><Lock size={14} /></button>
        <button className="px-2 py-1.5 text-gray-400"><ChevronDown size={14} /></button>
      </div>
    );
  }

  if (type === "wallet") {
    return (
      <div className={baseClass}>
        <button className={btnClass}>Wallet</button>
        <button className="px-3 md:px-4 py-1.5 text-gray-800 text-sm font-bold border-r border-gray-200 bg-gray-50/50">{amount}</button>
        <button className="px-2 py-1.5 text-gray-400"><ChevronDown size={14} /></button>
      </div>
    );
  }

  return null;
}