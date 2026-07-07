"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, Users, Package, ShoppingCart, 
  CreditCard, ShieldCheck, Banknote, Scale, 
  BarChart3, ListTree, Star, Settings, ShieldAlert, 
  X
} from "lucide-react";

const menu = [
  { name: "Admin Dashboard", path: "/", icon: LayoutDashboard },
  { name: "Users Management", path: "/UserManagement", icon: Users },
  { name: "Orders Details", path: "/orders", icon: ShoppingCart },
  { name: "Payments", path: "/Payments", icon: CreditCard },
  { name: "Payouts", path: "/payouts", icon: Banknote },
  { name: "Active Disputes", path: "/Disputes", icon: Scale },
  { name: "System Settings", path: "/settings", icon: Settings },
];

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();

return (
    <div className="w-64 bg-[#cb6f4d] h-screen text-white flex flex-col font-sans transition-all duration-300">
      {/* Brand Logo Area */}
      <div className="p-6 flex justify-between items-center">
        <h1 className="text-4xl font-black italic tracking-tighter" style={{ fontFamily: 'serif' }}>
          Reluv
        </h1>
        {/* Mobile Close Button */}
        <button onClick={onClose} className="lg:hidden p-1 hover:bg-white/10 rounded">
          <X size={24} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar">
        {menu.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              onClick={onClose}
              className={`flex items-center gap-4 px-4 py-2.5 rounded-lg transition-all duration-200 ${
                isActive 
                  ? "bg-white/15 shadow-inner opacity-100" 
                  : "hover:bg-white/5 opacity-80 hover:opacity-100"
              }`}
            >
              <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span className={`text-[15px] ${isActive ? "font-bold" : "font-medium"}`}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>
      
      <div className="p-4 border-t border-white/10 text-[10px] uppercase tracking-widest opacity-40 text-center">
        Reluv Admin System
      </div>
    </div>
  );
}