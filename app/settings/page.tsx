"use client";

import React, { useState, useEffect } from "react";
import { Save, Loader2, AlertCircle } from "lucide-react";
import { BACKEND_URL } from "@/constants";

const API_BASE_URL = BACKEND_URL || "http://localhost:1337";

interface MarketplaceSettings {
  commissionRate: number;
  escrowDays: number;
  currency: string;
  autoPayoutEnabled: boolean;
  autoPayoutThresholdAmount: number;
  maintenanceMode: boolean;
  maintenanceMessage: string;
}

interface SettingsProps {
  /** Called whenever commission rate changes so parent can pass it to Payments/Payouts */
  onCommissionChange?: (rate: number) => void;
}

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("adminToken") || localStorage.getItem("jwt");
}

const DEFAULT_FORM: MarketplaceSettings = {
  commissionRate: 10,
  escrowDays: 7,
  currency: "TBH",
  autoPayoutEnabled: false,
  autoPayoutThresholdAmount: 0,
  maintenanceMode: false,
  maintenanceMessage: "",
};

export default function Settings({ onCommissionChange }: SettingsProps) {
  const [form, setForm] = useState<MarketplaceSettings>(DEFAULT_FORM);
  // Keep track of the existing record id so we UPDATE it instead of
  // creating a brand new entry every time the admin hits save.
  const [recordId, setRecordId] = useState<string | number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);
  const [dirty, setDirty] = useState(false);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // status=published (Strapi v5) so we only ever read the live record,
        // never a stray draft that hasn't been applied yet.
        const res = await fetch(
          `${API_BASE_URL}/api/marketplace-settings?status=published`,
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
        if (!res.ok) throw new Error();
        const json = await res.json();
        const entry = Array.isArray(json.data) ? json.data[0] : json.data;
        const d = entry?.attributes ?? entry ?? {};
        if (entry?.documentId) setRecordId(entry?.documentId);
        setForm({
          commissionRate: parseFloat(d.commissionRate ?? 10),
          escrowDays: parseInt(d.escrowDays ?? 7),
          currency: "TBH",
          autoPayoutEnabled: Boolean(d.autoPayoutEnabled ?? false),
          autoPayoutThresholdAmount: parseFloat(
            d.autoPayoutThresholdAmount ?? 0
          ),
          maintenanceMode: Boolean(d.maintenanceMode ?? false),
          maintenanceMessage: d.maintenanceMessage ?? "",
        });
      } catch {
        // keep defaults
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const set = <K extends keyof MarketplaceSettings>(
    key: K,
    value: MarketplaceSettings[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
    if (key === "commissionRate") onCommissionChange?.(Number(value));
  };

  const handleSave = async () => {
    setSaving(true);
    const payload: Record<string, any> = {
      commissionRate: form.commissionRate,
      escrowDays: form.escrowDays,
      currency: "TBH",
      autoPayoutEnabled: form.autoPayoutEnabled,
      autoPayoutThresholdAmount: form.autoPayoutThresholdAmount,
      maintenanceMode: form.maintenanceMode,
      maintenanceMessage: form.maintenanceMessage,
    };
    try {
      // If we already have a record, PATCH/PUT it. Otherwise create it once.
      // status=published ensures draftAndPublish doesn't leave this sitting
      // as an unpublished draft that never takes effect on the live site.
      const url = recordId
        ? `${API_BASE_URL}/api/marketplace-settings/${recordId}`
        : `${API_BASE_URL}/api/marketplace-settings?status=published`;
      const method = recordId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ data: payload }),
      });
      if (!res.ok) throw new Error();

      const json = await res.json().catch(() => null);
      const entry = Array.isArray(json?.data) ? json.data[0] : json?.data;
      if (!recordId && entry?.documentId) setRecordId(entry.documentId);

      showToast("Settings saved successfully");
      setDirty(false);
    } catch {
      showToast("Could not reach server — settings not saved", "error");
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
        {hint && (
          <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{hint}</p>
        )}
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
        <svg
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
    </div>
  );

  const ToggleField = ({
    label,
    hint,
    checked,
    onChange,
  }: {
    label: string;
    hint?: string;
    checked: boolean;
    onChange: (v: boolean) => void;
  }) => (
    <div className="flex flex-col md:flex-row md:items-center p-5 gap-2 md:gap-0 border-b border-gray-100 last:border-0">
      <div className="md:w-56 flex-shrink-0">
        <p className="text-sm font-semibold text-[#4a5568]">{label}</p>
        {hint && (
          <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{hint}</p>
        )}
      </div>
      <div className="md:flex-1">
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={() => onChange(!checked)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            checked ? "bg-[#cb6f4d]" : "bg-gray-300"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              checked ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>
    </div>
  );

  if (loading) {
   return (
      <div className="min-h-screen bg-[#f8fafd] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#cb6f4d] border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm font-medium">Loading orders…</p>
        </div>
      </div>
    );
  }

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

      {/* Unsaved changes banner */}
      {dirty && (
        <div className="flex items-center justify-between gap-3 mb-6 bg-[#fff6ed] border border-[#f2994a]/30 text-[#a85839] text-sm font-medium rounded-lg px-4 py-3 max-w-2xl">
          <span className="flex items-center gap-2">
            <AlertCircle size={16} />
            You have unsaved changes — save them to apply.
          </span>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 bg-[#cb6f4d] hover:bg-[#a85839] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold px-4 py-1.5 rounded-md transition-colors text-xs"
          >
            {saving ? (
              <>
                <Loader2 className="animate-spin" size={13} />
                Saving…
              </>
            ) : (
              "Save now"
            )}
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden max-w-2xl">
        {/* Commission rate: 1-15% slider */}
        <div className="flex flex-col md:flex-row md:items-start p-5 gap-2 md:gap-0 border-b border-gray-100">
          <div className="md:w-56 flex-shrink-0">
            <p className="text-sm font-semibold text-[#4a5568]">
              Commission rate
            </p>
            <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
              Percentage deducted from each sale before seller payout
            </p>
          </div>
          <div className="md:flex-1">
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={1}
                max={15}
                step={1}
                value={form.commissionRate}
                onChange={(e) => set("commissionRate", parseInt(e.target.value))}
                className="flex-1 accent-[#cb6f4d] cursor-pointer"
              />
              <span className="w-14 text-center text-sm font-semibold text-[#a85839] bg-[#f5e6df] rounded-md py-1.5">
                {form.commissionRate}%
              </span>
            </div>
            <div className="flex justify-between text-[10px] text-gray-400 mt-1 px-0.5">
              <span>1%</span>
              <span>15%</span>
            </div>
          </div>
        </div>

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

        {/* Currency: fixed to TBH, no dropdown */}
        <div className="flex flex-col md:flex-row md:items-start p-5 gap-2 md:gap-0 border-b border-gray-100">
          <div className="md:w-56 flex-shrink-0">
            <p className="text-sm font-semibold text-[#4a5568]">Currency</p>
            <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
              Marketplace currency is fixed
            </p>
          </div>
          <div className="md:flex-1">
            <div className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-600">
              TBH — Thai Baht
            </div>
          </div>
        </div>

        {/* Auto payout */}
        <ToggleField
          label="Auto payout"
          hint="Automatically release payouts once the threshold is met"
          checked={form.autoPayoutEnabled}
          onChange={(v) => set("autoPayoutEnabled", v)}
        />

        {form.autoPayoutEnabled && (
          <div className="flex flex-col md:flex-row md:items-start p-5 gap-2 md:gap-0 border-b border-gray-100">
            <div className="md:w-56 flex-shrink-0">
              <p className="text-sm font-semibold text-[#4a5568]">
                Auto payout threshold
              </p>
              <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                Minimum balance (THB) required to trigger an automatic payout
              </p>
            </div>
            <div className="md:flex-1">
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.autoPayoutThresholdAmount}
                  onChange={(e) =>
                    set(
                      "autoPayoutThresholdAmount",
                      parseFloat(e.target.value) || 0
                    )
                  }
                  className="w-full bg-white border border-[#cb6f4d] rounded-lg px-4 py-2.5 pr-14 text-sm focus:outline-none focus:ring-2 focus:ring-[#cb6f4d]/20 text-gray-800"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">
                  THB
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Maintenance mode */}
        <ToggleField
          label="Maintenance mode"
          hint="Temporarily disable storefront access for shoppers"
          checked={form.maintenanceMode}
          onChange={(v) => set("maintenanceMode", v)}
        />

        {form.maintenanceMode && (
          <div className="flex flex-col md:flex-row md:items-start p-5 gap-2 md:gap-0 border-b border-gray-100 last:border-0">
            <div className="md:w-56 flex-shrink-0">
              <p className="text-sm font-semibold text-[#4a5568]">
                Maintenance message
              </p>
              <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                Shown to visitors while maintenance mode is active
              </p>
            </div>
            <div className="md:flex-1">
              <textarea
                value={form.maintenanceMessage}
                onChange={(e) => set("maintenanceMessage", e.target.value)}
                rows={3}
                placeholder="We're currently performing scheduled maintenance. Please check back soon."
                className="w-full bg-white border border-[#cb6f4d] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#cb6f4d]/20 text-gray-800 resize-none"
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-5 flex justify-end bg-[#fcfdfe]">
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            className="inline-flex items-center gap-2 bg-[#cb6f4d] hover:bg-[#a85839] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold px-8 py-2.5 rounded-lg transition-colors text-sm min-w-[150px] justify-center"
          >
            {saving ? (
              <>
                <Loader2 className="animate-spin" size={15} />
                Saving…
              </>
            ) : (
              <>
                <Save size={15} />
                Save changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}