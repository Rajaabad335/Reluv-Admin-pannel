"use client";

import Link from "next/link";

const menu = [
  { name: "Dashboard", path: "/" },
  { name: "Users", path: "/users" },
  { name: "Items", path: "/items" },
  { name: "Orders", path: "/orders" },
  { name: "Payments", path: "/payments" },
  { name: "Escrow", path: "/escrow" },
  { name: "Payouts", path: "/payouts" },
  { name: "Disputes", path: "/disputes" },
  { name: "Categories", path: "/categories" },
  { name: "Settings", path: "/settings" },
];

export default function Sidebar() {
  return (
    <div className="w-64 bg-[#007782] h-full">
      <div className="p-4 text-xl font-bold">
        Admin Panel
      </div>
      

      {menu.map((m) => (
        <Link
          key={m.path}
          href={m.path}
          className="block px-4 py-2 hover:bg-blue-600"
        >
          {m.name}
        </Link>
      ))}
    </div>
  );
}
