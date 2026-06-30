"use client";

import React, { useState } from "react";
import Payments from "../Payments/page";
import Payouts from "../payouts/page";
import Settings from "../settings/page";

type Tab = "payments" | "payouts" | "settings";

export default function FinancePanel() {
  const [tab, setTab] = useState<Tab>("payments");
  const [commissionRate, setCommissionRate] = useState(10);

  const tabs: { id: Tab; label: string }[] = [
    { id: "payments", label: "Payments" },
    { id: "payouts", label: "Payouts" },
    { id: "settings", label: "Settings" },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafd]">
      {/* Tab bar */}
      <div className="border-b border-gray-200 bg-white px-4 md:px-8">
        <div className="flex gap-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-5 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? "border-[#cb6f4d] text-[#cb6f4d]"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Panels — keep mounted so state persists */}
      <div className={tab === "payments" ? "" : "hidden"}>
        <Payments commissionRate={commissionRate} />
      </div>
      <div className={tab === "payouts" ? "" : "hidden"}>
        <Payouts commissionRate={commissionRate} />
      </div>
      <div className={tab === "settings" ? "" : "hidden"}>
        <Settings onCommissionChange={setCommissionRate} />
      </div>
    </div>
  );
}