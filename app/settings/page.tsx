"use client";

import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

export default function Settings() {
  // State management for form fields
  const [formData, setFormData] = useState({
    commissionRate: "10%",
    escrowPeriod: "3",
    currency: "EUR",
    stripeApiKey: "sk_test_51Mzxxxxxxxxxxxxxx",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      commission_rate: parseFloat(formData.commissionRate.replace("%", "")),
      escrow_days: parseInt(formData.escrowPeriod),
      currency_code: formData.currency,
      stripe_key: formData.stripeApiKey,
      updated_at: new Date().toISOString(),
    };

    console.log("Sending to API:", payload);
    alert("Settings updated successfully!");
  };

  return (
    <div className="p-4 md:p-8 bg-[#f8fafd] min-h-screen font-sans">
      <h1 className="text-[#2d3748] text-2xl font-bold mb-6 md:mb-8">Settings</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden max-w-4xl">
        <form onSubmit={handleSubmit} className="divide-y divide-gray-100">
          
          {/* Commission Rate */}
          <div className="flex flex-col md:flex-row md:items-center p-4 md:p-6 gap-2 md:gap-0">
            <label className="md:w-1/3 text-[#4a5568] font-bold text-sm">Commission Rate</label>
            <div className="md:w-2/3 relative">
              <select 
                name="commissionRate"
                value={formData.commissionRate}
                onChange={handleChange}
                className="w-full appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1156be] cursor-pointer"
              >
                <option value="5%">5%</option>
                <option value="10%">10%</option>
                <option value="15%">15%</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
            </div>
          </div>

          {/* Escrow Period */}
          <div className="flex flex-col md:flex-row md:items-center p-4 md:p-6 gap-2 md:gap-0">
            <label className="md:w-1/3 text-[#4a5568] font-bold text-sm">Escrow Period (Days)</label>
            <div className="md:w-2/3 relative">
              <select 
                name="escrowPeriod"
                value={formData.escrowPeriod}
                onChange={handleChange}
                className="w-full appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1156be] cursor-pointer"
              >
                <option value="3">3</option>
                <option value="7">7</option>
                <option value="14">14</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
            </div>
          </div>

          {/* Currency */}
          <div className="flex flex-col md:flex-row md:items-center p-4 md:p-6 gap-2 md:gap-0">
            <label className="md:w-1/3 text-[#4a5568] font-bold text-sm">Currency</label>
            <div className="md:w-2/3 relative">
              <select 
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                className="w-full appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1156be] cursor-pointer"
              >
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
            </div>
          </div>

          {/* Stripe API Key */}
          <div className="flex flex-col md:flex-row md:items-center p-4 md:p-6 gap-2 md:gap-0">
            <label className="md:w-1/3 text-[#4a5568] font-bold text-sm">Stripe API Key</label>
            <div className="md:w-2/3">
              <input 
                type="password" 
                name="stripeApiKey"
                value={formData.stripeApiKey}
                onChange={handleChange}
                placeholder="sk_test_..."
                className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1156be]"
              />
            </div>
          </div>

          {/* Form Footer / Submit */}
          <div className="p-4 md:p-6 flex justify-center bg-[#fcfdfe]">
            <button 
              type="submit"
              className="w-full md:w-auto bg-[#1156be] hover:bg-[#0e48a1] text-white font-bold px-10 py-3 md:py-2.5 rounded-lg transition-colors shadow-sm"
            >
              Save Changes
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}