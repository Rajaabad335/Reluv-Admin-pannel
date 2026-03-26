"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  ChevronDown,
  Pencil,
  Lock,
  X,
  Wallet,
  Delete,
  Trash2,
} from "lucide-react";

const mockUsers = [
  {
    id: 22,
    name: "Laura Mendez",
    email: "laura@example.com",
    role: "Seller",
    status: "Active",
    type: "view",
  },
  {
    id: 40,
    name: "Adam Fauz",
    email: "adam@example.com",
    role: "Seller",
    status: "Active",
    type: "verify",
  },
  {
    id: 53,
    name: "Danny Hortz",
    email: "danny@example.com",
    role: "Seller",
    status: "Active",
    type: "verify",
  },
  {
    id: 54,
    name: "Yamis Chohin",
    email: "yamis@example.com",
    role: "Admin",
    status: "Active",
    type: "verify",
  },
  {
    id: 62,
    name: "Mark Hopkins",
    email: "mark@example.com",
    role: "Seller",
    status: "Active",
    type: "wallet",
    amount: "150.75€",
  },
];

export default function UserManagement() {
  const [activeTab, setActiveTab] = useState("All Users");
  const [searchQuery, setSearchQuery] = useState("");

  // Logic to filter users based on the Active Tab and Search Input
  const filteredUsers = useMemo(() => {
    return mockUsers.filter((user) => {
      // 1. Filter by Tab
      const matchesTab =
        activeTab === "All Users" ||
        (activeTab === "Active" && user.status === "Active") ||
        (activeTab === "Sellers" && user.role === "Seller") ||
        (activeTab === "Banned" && user.status === "Banned");

      // 2. Filter by Search Query (Name or Email)
      const matchesSearch =
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesTab && matchesSearch;
    });
  }, [activeTab, searchQuery]);

  return (
    <div className="p-4 md:p-8 bg-[#f8fafd] min-h-screen font-sans">
      <h1 className="text-[#2d3748] text-2xl font-bold mb-4">
        User Management
      </h1>
      {/* Control Bar: Stacks search on top for mobile, row for desktop */}
      <div className="flex flex-col-reverse md:flex-row md:items-center justify-between gap-4 mb-6">
        {/* Tabs Navigation */}
        <div className="flex overflow-x-auto no-scrollbar">
          <div className="flex bg-white rounded-lg border border-gray-200 shadow-sm shrink-0 overflow-hidden">
            {["All Users", "Sellers", "Active", "Banned"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 md:px-6 py-2 text-sm font-semibold transition-colors whitespace-nowrap border-r border-gray-100 last:border-0 ${
                  activeTab === tab
                    ? "bg-[#007782] text-white cursor-pointer"
                    : "text-gray-500 hover:bg-gray-50 cursor-pointer"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#007782]"
            size={18}
          />
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-[#007782] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1156be]/20 bg-white text-gray-800 text-sm"
          />
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[900px]">
            <thead className="bg-[#fcfdfe] border-b border-gray-100">
              <tr className="text-gray-500 text-sm">
                {/* <th className="px-6 py-4 w-12">
                  <input type="checkbox" className="rounded" />
                </th> */}
                <th className="px-6 py-4 font-semibold">ID</th>
                <th className="px-6 py-4 font-semibold">Name</th>
                <th className="px-6 py-4 font-semibold">Email</th>
                <th className="px-6 py-4 font-semibold">Role</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 text-right pr-10 font-semibold">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    {/* <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300"
                      />
                    </td> */}
                    <td className="px-6 py-4 text-sm font-medium text-gray-700">
                      {user.id}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-800">
                      {user.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-700">
                      {user.role}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded text-xs font-bold text-white ${user.status === "Banned" ? "bg-red-500" : "bg-[#007782]"}`}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end">
                        <ActionButtons type={user.type} amount={user.amount} />
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-gray-400"
                  >
                    No users found for "{activeTab}"{" "}
                    {searchQuery && `matching "${searchQuery}"`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ActionButtons({ type, amount }: { type: string; amount?: string }) {
  const baseClass =
    "flex items-center border border-gray-200 rounded-md overflow-hidden bg-white shadow-sm shrink-0";
  const btnClass =
    "px-3 py-1.5 hover:bg-gray-50 transition-colors text-[#007782] text-sm font-bold border-r border-gray-200 last:border-0";
  return (
    <div className={baseClass}>
      <button className={btnClass}>View</button>
      <button className={btnClass}>Edit</button>
      {/* <button className={iconClass}><Lock size={14} /></button> */}
      <button className="px-2 py-1.5 text-red-400">
        <Trash2 size={14} />
      </button>
    </div>
  );

  return null;
}
