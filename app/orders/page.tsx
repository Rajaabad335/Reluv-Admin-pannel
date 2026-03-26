"use client";

import React, { useState } from "react";
import { 
  MoreHorizontal, ChevronDown, ChevronRight, Star, 
  Undo2, ShieldCheck, Truck, Search, ArrowLeft, 
  Trash2
} from "lucide-react";

// --- MOCK DATA ---
const ALL_ORDERS = [
  {
    id: "60,3803",
    buyer: { name: "Eivaf Robers", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Eivaf" },
    seller: { name: "Mark's Closet", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mark" },
    amount: "€50.00",
    item: "Nike Sneakers",
    itemImage: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300",
    role: "User",
    roleColor: "bg-[#56ab65]",
    status: "Shipped",
    progressStatus: "Pending",
    dotColor: "bg-green-600",
    tracking: "TRK123456789",
    carrier: "DHL"
  },
  {
    id: "€0,4863",
    buyer: { name: "Kale Trenssse", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Kale" },
    seller: { name: "Vintage Hub", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Hub" },
    amount: "€120.00",
    item: "Levi's 501",
    itemImage: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=300",
    role: "Seller",
    roleColor: "bg-[#ffede0] text-[#f2994a]",
    status: "Delivered",
    progressStatus: "Active",
    dotColor: "bg-orange-500",
    tracking: "TRK987654321",
    carrier: "FedEx"
  }
];

export default function Orders() {
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

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
          <OrdersTable onSelectOrder={setSelectedOrder} />
        </div>
      )}
    </div>
  );
}

function OrdersTable({ onSelectOrder }: { onSelectOrder: (o: any) => void }) {
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
            {ALL_ORDERS.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50/50 group transition-colors">
                <td 
                  className="px-6 py-5 text-sm font-bold text-[#1156be] cursor-pointer hover:underline"
                  onClick={() => onSelectOrder(order)}
                >
                  {order.id}
                </td>
                <td className="px-6 py-5 text-sm font-medium text-gray-700">{order.buyer.name}</td>
                <td className="px-6 py-5 text-sm font-medium text-gray-700">{order.seller.name}</td>
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
                        <ActionButtons  />
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-[#1156be] p-4 flex justify-between items-center text-white">
          <div className="flex items-center gap-2 font-bold text-lg">
            Order # {order.id} <ChevronRight size={18} />
          </div>
          <div className="flex gap-4">
            <Star size={18} className="cursor-pointer" />
            <Undo2 size={18} className="cursor-pointer" />
            <ChevronDown size={18} className="cursor-pointer" />
          </div>
        </div>
        
        <div className="p-4 md:p-6 space-y-4">
          {/* Buyer/Seller Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <img src={order.buyer.avatar} className="w-8 h-8 rounded" alt="" />
                <span className="text-gray-500 font-bold">Buyer: <span className="text-[#1156be]">{order.buyer.name}</span></span>
              </div>
              <ChevronDown size={16} className="text-gray-300" />
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <img src={order.seller.avatar} className="w-8 h-8 rounded" alt="" />
                <span className="text-gray-500 font-bold">Seller: <span className="text-[#1156be]">{order.seller.name}</span></span>
              </div>
              <ChevronDown size={16} className="text-gray-300" />
            </div>
          </div>

          {/* Item Details Section */}
          <div className="flex flex-col lg:flex-row gap-6 lg:items-center py-6 border-y border-gray-50">
            <div className="flex-1">
              <div className="mb-4"><span className="text-gray-500 font-bold">Item: </span><span className="font-bold">{order.item}</span></div>
              <div className="bg-gray-50 p-3 rounded-lg border inline-block">
                <span className="text-gray-500 font-bold">Payment: </span><span className="font-black text-lg">{order.amount}</span>
              </div>
            </div>
            
            <img src={order.itemImage} className="w-full lg:w-40 h-48 lg:h-28 object-cover rounded-lg border shadow-sm" alt="" />
            
            <div className="flex-1 space-y-2">
              <div className="flex border rounded-lg overflow-hidden">
                <span className="p-2 text-sm font-bold flex-1 bg-gray-50">Status: {order.status}</span>
                <button className="bg-[#1156be] text-white px-3 py-2 text-sm flex items-center gap-1 font-bold">
                  <ShieldCheck size={14} /> Escrow <ChevronDown size={14} />
                </button>
              </div>
              <div className="flex border rounded-lg overflow-hidden">
                <button className="bg-[#1156be] text-white p-2 text-sm font-bold">Tickets</button>
                <button className="bg-[#94a3b8] text-white p-2 text-sm font-bold flex-1 text-left px-4">Held in Escrow</button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button className="flex-1 bg-[#56ab65] text-white px-4 py-2.5 rounded-lg font-bold text-sm md:text-base">Release Funds</button>
            <button className="flex-1 bg-[#d9534f] text-white px-4 py-2.5 rounded-lg font-bold text-sm md:text-base">Refund Buyer</button>
            <button className="flex-1 bg-[#1156be] text-white px-4 py-2.5 rounded-lg font-bold text-sm md:text-base">Resolve Dispute</button>
          </div>
        </div>
      </div>

      {/* Shipping Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b font-bold flex items-center gap-2">
          <Truck size={18} /> Shipping Info
        </div>
        <div className="p-4 md:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 bg-gray-50 rounded-lg p-4 border gap-4">
            <div className="space-y-2 sm:border-r sm:pr-4">
              <div className="flex justify-between"><span className="text-sm text-gray-500">Tracking:</span> <span className="text-sm font-bold">{order.tracking}</span></div>
              <div className="flex justify-between"><span className="text-sm text-gray-500">Status:</span> <span className="text-sm font-bold">In Transit</span></div>
            </div>
            <div className="sm:pl-4 flex justify-between items-center">
              <span className="text-sm text-gray-500">Carrier:</span> <span className="text-sm font-bold">{order.carrier}</span>
            </div>
          </div>
        </div>
      </div>
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
      {/* <button className={iconClass}><Lock size={14} /></button> */}
      <button className="px-2 py-1.5 text-red-500">
        <Trash2 size={14} />
      </button>
    </div>
  );

  return null;
}