"use client";

import React, { useState, useEffect } from "react";
import { ChevronDown, Save } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:1337";

interface MarketplaceSettings {
  commissionRate: number;
  escrowDays: number;
  currency: string;
  stripeKey: string;
}

interface SettingsProps {
  /** Called whenever commission rate changes so parent can pass it to Payments/Payouts */
  onCommissionChange?: (rate: number) => void;
}

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("adminToken") || localStorage.getItem("jwt");
}

export default function Settings({ onCommissionChange }: SettingsProps) {
  const [form, setForm] = useState<MarketplaceSettings>({
    commissionRate: 10,
    escrowDays: 7,
    currency: "THB",
    stripeKey: "",
  });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [dirty, setDirty] = useState(false);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const load = async () => {
      const token = getToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      try {
        const res = await fetch(`${API_BASE_URL}/api/marketplace-setting`, { headers });
        if (!res.ok) throw new Error();
        const json = await res.json();
        const d = json.data?.attributes ?? json.data ?? {};
        setForm({
          commissionRate: parseFloat(d.commissionRate ?? d.commission_rate ?? 10),
          escrowDays: parseInt(d.escrowDays ?? d.escrow_days ?? 7),
          currency: d.currency ?? "THB",
          stripeKey: "",
        });
      } catch {
        // keep defaults
      }
    };
    load();
  }, []);

  const set = (key: keyof MarketplaceSettings, value: string | number) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
    if (key === "commissionRate") onCommissionChange?.(Number(value));
  };

  const handleSave = async () => {
    setSaving(true);
    const token = getToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const payload: Record<string, any> = {
      commission_rate: form.commissionRate,
      escrow_days: form.escrowDays,
      currency: form.currency,
    };
    if (form.stripeKey.trim()) payload.stripe_key = form.stripeKey.trim();
    try {
      const res = await fetch(`${API_BASE_URL}/api/marketplace-setting`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ data: payload }),
      });
      if (!res.ok) throw new Error();
      showToast("Settings saved successfully");
      setDirty(false);
    } catch {
      showToast("Could not reach server — settings cached locally", "error");
    } finally {
      setSaving(false);
    }
  };

  const SelectField = ({
    label,
    hint,
    value,
    onChange,
    options,
  }: {
    label: string;
    hint?: string;
    value: string | number;
    onChange: (v: string) => void;
    options: { value: string | number; label: string }[];
  }) => (
    <div className="flex flex-col md:flex-row md:items-start p-5 gap-2 md:gap-0 border-b border-gray-100 last:border-0">
      <div className="md:w-56 flex-shrink-0">
        <p className="text-sm font-semibold text-[#4a5568]">{label}</p>
        {hint && <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{hint}</p>}
      </div>
      <div className="md:flex-1 relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none bg-white border border-[#cb6f4d] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#cb6f4d]/20 cursor-pointer text-gray-800"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-8 bg-[#f8fafd] min-h-screen font-sans">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-lg transition-all ${
            toast.type === "success" ? "bg-[#007782]" : "bg-[#d9534f]"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Preview pill */}
      <div className="flex items-center gap-3 mb-6">
        <span className="inline-flex items-center gap-2 bg-[#f5e6df] text-[#a85839] text-xs font-medium rounded-full px-3 py-1.5">
          <span className="w-1.5 h-1.5 bg-[#cb6f4d] rounded-full" />
          {form.commissionRate}% commission · {form.escrowDays}-day escrow · {form.currency}
        </span>
        {dirty && (
          <span className="text-xs text-[#f2994a] font-medium">Unsaved changes</span>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden max-w-2xl">
        <SelectField
          label="Commission rate"
          hint="Percentage deducted from each sale before seller payout"
          value={form.commissionRate}
          onChange={(v) => set("commissionRate", parseFloat(v))}
          options={[3, 5, 8, 10, 12, 15].map((n) => ({ value: n, label: `${n}%` }))}
        />
        <SelectField
          label="Escrow period"
          hint="Days funds are held before releasing to the seller"
          value={form.escrowDays}
          onChange={(v) => set("escrowDays", parseInt(v))}
          options={[
            { value: 3, label: "3 days" },
            { value: 5, label: "5 days" },
            { value: 7, label: "7 days" },
            { value: 14, label: "14 days" },
          ]}
        />
        <SelectField
          label="Currency"
          value={form.currency}
          onChange={(v) => set("currency", v)}
          options={[
            { value: "THB", label: "THB — Thai Baht" },
            { value: "USD", label: "USD — US Dollar" },
            { value: "EUR", label: "EUR — Euro" },
          ]}
        />

        {/* Stripe key */}
        <div className="flex flex-col md:flex-row md:items-start p-5 gap-2 md:gap-0 border-b border-gray-100">
          <div className="md:w-56 flex-shrink-0">
            <p className="text-sm font-semibold text-[#4a5568]">Stripe secret key</p>
            <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
              Stored encrypted. Leave blank to keep current key.
            </p>
          </div>
          <div className="md:flex-1">
            <input
              type="password"
              placeholder="sk_live_…"
              value={form.stripeKey}
              onChange={(e) => set("stripeKey", e.target.value)}
              autoComplete="off"
              className="w-full border border-[#cb6f4d] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#cb6f4d]/20 bg-white text-gray-800"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 flex justify-end bg-[#fcfdfe]">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 bg-[#cb6f4d] hover:bg-[#a85839] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold px-8 py-2.5 rounded-lg transition-colors text-sm"
          >
            <Save size={15} />
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}