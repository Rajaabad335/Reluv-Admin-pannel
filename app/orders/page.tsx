"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Search,
  ArrowLeft,
  Trash2,
  Package,
  MapPin,
  Phone,
  ShoppingBag,
  User,
  Tag,
  ChevronDown,
  Truck,
} from "lucide-react";
import { BACKEND_URL } from "@/constants";
import { useSearchParams } from "next/navigation";

// ── Types (matching actual API response) ───────────────────────────────────

interface ApiOrder {
  id: number;
  documentId?: string;     // Strapi v5 uses documentId for mutations
  buyer: { name: string; avatar?: string };
  seller: { name: string; avatar?: string };
  amount: string;          // pre-formatted, e.g. "TBH461.25"
  item: string;
  itemImage?: string;
  role: string;
  roleColor: string;
  status: string;          // paymentStatus display label, e.g. "Pending"
  progressStatus: string;  // orderStatus display label, e.g. "In Progress"
  dotColor: string;
  tracking: string;
  carrier: string;
  // schema fields that may come through if your endpoint is extended:
  address?: string;
  phoneNumber?: string;
  deliveryMethod?: "pickup" | "home";
  productPrice?: number;
  buyerProtectionFee?: number;
  shippingFee?: number;
  totalAmount?: number;
  paymentStatus?: string;
  orderStatus?: string;
  createdAt?: string;
}

// ── Static config ──────────────────────────────────────────────────────────

const ORDER_STATUS_STEPS = ["Placed", "In Progress", "Shipped", "Delivered"];

// Maps the API `progressStatus` string → step index
const stepIndex = (progressStatus: string): number => {
  const s = progressStatus.toLowerCase();
  if (s.includes("placed"))     return 0;
  if (s.includes("progress"))   return 1;
  if (s.includes("ship"))       return 2;
  if (s.includes("deliver"))    return 3;
  return -1;
};

const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
  pending:     { bg: "bg-amber-100",   text: "text-amber-700",   dot: "bg-amber-400"   },
  paid:        { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500"  },
  failed:      { bg: "bg-red-100",     text: "text-red-600",     dot: "bg-red-500"      },
  placed:      { bg: "bg-blue-100",    text: "text-blue-700",    dot: "bg-blue-500"     },
  "in progress":{ bg: "bg-violet-100", text: "text-violet-700",  dot: "bg-violet-500"   },
  shipped:     { bg: "bg-orange-100",  text: "text-orange-700",  dot: "bg-orange-500"   },
  delivered:   { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500"  },
  cancelled:   { bg: "bg-red-100",     text: "text-red-600",     dot: "bg-red-500"      },
  "n/a":       { bg: "bg-gray-100",    text: "text-gray-500",    dot: "bg-gray-400"     },
};

function getBadge(label: string) {
  return statusConfig[label.toLowerCase()] ?? statusConfig["n/a"];
}

function fmt(n?: number) {
  if (n == null) return "—";
  return `฿${n.toLocaleString("th-TH", { minimumFractionDigits: 2 })}`;
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function Orders() {
  const [selectedOrder, setSelectedOrder] = useState<ApiOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [search, setSearch] = useState("");
  const hasFetched = useRef(false);
  const searchParams = useSearchParams();

  // Auto-open a specific order when navigated from Dashboard (?orderId=X)
  useEffect(() => {
    const targetId = searchParams.get("orderId");
    if (!targetId || orders.length === 0) return;
    const match = orders.find((o) => String(o.id) === targetId);
    if (match) setSelectedOrder(match);
  }, [orders, searchParams]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/orders/get-all-orders`);
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      setOrders(Array.isArray(json?.data?.orders) ? json.data.orders : []);
    } catch {
      console.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchOrders();
  }, []);

  // Optimistic status update
  // Strapi v4/v5 both require { data: { ... } } wrapper on PUT
  // Strapi v5 uses documentId for the URL; v4 uses numeric id — we support both
  const handleStatusUpdate = async (
    order: ApiOrder,
    field: "orderStatus" | "paymentStatus",
    value: string
  ) => {
    const displayField = field === "orderStatus" ? "progressStatus" : "status";
    // Use documentId (v5) if present, otherwise fall back to numeric id (v4)
    const urlKey = order.documentId ?? order.id;
    try {
      const res = await fetch(`${BACKEND_URL}/api/orders/${urlKey}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: { [field]: value } }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error("Status update failed:", err);
        return;
      }
      const patch = { [field]: value, [displayField]: value };
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, ...patch } : o)));
      setSelectedOrder((prev) => (prev?.id === order.id ? { ...prev, ...patch } : prev));
    } catch {
      console.error("Status update failed");
    }
  };

  const handleDelete = async (order: ApiOrder) => {
    if (!confirm("Delete this order? This cannot be undone.")) return;
    const urlKey = order.documentId ?? order.id;
    try {
      const res = await fetch(`${BACKEND_URL}/api/orders/${urlKey}`, { method: "DELETE" });
      if (!res.ok) return;
      setOrders((prev) => prev.filter((o) => o.id !== order.id));
      if (selectedOrder?.id === order.id) setSelectedOrder(null);
    } catch {
      console.error("Delete failed");
    }
  };

  const filtered = orders.filter(
    (o) =>
      search === "" ||
      String(o.id).includes(search) ||
      o.item?.toLowerCase().includes(search.toLowerCase()) ||
      o.buyer?.name?.toLowerCase().includes(search.toLowerCase())
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
      {selectedOrder ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <button
            onClick={() => setSelectedOrder(null)}
            className="flex items-center gap-2 text-[#cb6f4d] font-bold mb-6 hover:underline"
          >
            <ArrowLeft size={20} /> Back to Orders
          </button>
          <OrderDetailsView
            order={selectedOrder}
            onStatusUpdate={handleStatusUpdate}
            onDelete={handleDelete}
          />
        </div>
      ) : (
        <div className="animate-in fade-in duration-300">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <h1 className="text-[#2d3748] text-2xl font-bold">Orders</h1>
            <div className="relative w-full md:w-64">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#cb6f4d]"
                size={18}
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by ID, item, buyer…"
                className="pl-10 pr-4 py-2 border border-[#cb6f4d] rounded-lg w-full focus:outline-none text-gray-800"
              />
            </div>
          </div>

          <OrdersTable
            orders={filtered}
            onSelectOrder={setSelectedOrder}
            onDelete={handleDelete}
          />
        </div>
      )}
    </div>
  );
}

// ── Orders Table ───────────────────────────────────────────────────────────

function OrdersTable({
  orders,
  onSelectOrder,
  onDelete,
}: {
  orders: ApiOrder[];
  onSelectOrder: (o: ApiOrder) => void;
  onDelete: (order: ApiOrder) => void;
}) {
  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 py-20 flex flex-col items-center gap-3 text-gray-400">
        <ShoppingBag size={40} className="text-gray-200" />
        <p className="font-medium">No orders found</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[800px]">
          <thead className="bg-[#f8fafd] text-[#4a5568] text-sm font-semibold border-b">
            <tr>
              <th className="px-6 py-4">Order ID</th>
              <th className="px-6 py-4">Item</th>
              <th className="px-6 py-4">Buyer</th>
              <th className="px-6 py-4">Seller</th>
              <th className="px-6 py-4">Amount</th>
              <th className="px-6 py-4">Payment</th>
              <th className="px-6 py-4">Progress</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {orders.map((order) => {
              const payBadge = getBadge(order.status);
              const progBadge = getBadge(order.progressStatus);
              return (
                <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                  {/* Order ID */}
                  <td
                    className="px-6 py-5 text-sm font-bold text-[#cb6f4d] cursor-pointer hover:underline"
                    onClick={() => onSelectOrder(order)}
                  >
                    #{order.id}
                  </td>

                  {/* Item */}
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      {order.itemImage && (
                        <img
                          src={order.itemImage}
                          alt={order.item}
                          className="w-9 h-9 rounded-lg object-cover border border-gray-100 flex-shrink-0"
                        />
                      )}
                      <span className="text-sm font-medium text-gray-700 max-w-[140px] truncate">
                        {order.item || "—"}
                      </span>
                    </div>
                  </td>

                  {/* Buyer */}
                  <td className="px-6 py-5">
                    {order.buyer?.name}
                  </td>

                  {/* Seller */}
                  <td className="px-6 py-5">
                    {order.seller?.name}
                  </td>

                  {/* Amount */}
                  <td className="px-6 py-5 text-sm font-black text-[#cb6f4d]">
                    {order.amount}
                  </td>

                  {/* Payment status */}
                  <td className="px-6 py-5">
                    <StatusPill label={order.status} badge={payBadge} />
                  </td>

                  {/* Progress status */}
                  <td className="px-6 py-5">
                    <StatusPill label={order.progressStatus} badge={progBadge} />
                  </td>

                  {/* Actions */}
                  <td className="px-3 py-5 text-right">
                    <ActionButtons
                      onView={() => onSelectOrder(order)}
                      onDelete={() => onDelete(order)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Order Details View ─────────────────────────────────────────────────────

function OrderDetailsView({
  order,
  onStatusUpdate,
  onDelete,
}: {
  order: ApiOrder;
  onStatusUpdate: (order: ApiOrder, field: "orderStatus" | "paymentStatus", value: string) => void;
  onDelete: (order: ApiOrder) => void;
}) {
  const payBadge = getBadge(order.status);
  const progBadge = getBadge(order.progressStatus);
  const isCancelled = order.progressStatus?.toLowerCase().includes("cancel") ||
    order.orderStatus?.toLowerCase() === "cancelled";
  const currentStep = isCancelled ? -1 : stepIndex(order.progressStatus);

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-xs text-gray-400 font-medium mb-1">Order</p>
          <h2 className="text-2xl font-bold text-[#2d3748]">#{order.id}</h2>
          {order.createdAt && (
            <p className="text-xs text-gray-400 mt-1">
              Placed{" "}
              {new Date(order.createdAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          {/* Payment status dropdown */}
          <StatusDropdown
            label="Payment"
            value={order.paymentStatus ?? order.status}
            options={["pending", "paid", "failed"]}
            badgeClass={`${payBadge.bg} ${payBadge.text}`}
            onChange={(v) => onStatusUpdate(order, "paymentStatus", v)}
          />

          {/* Order status dropdown */}
          <StatusDropdown
            label="Progress"
            value={order.orderStatus ?? order.progressStatus}
            options={["placed", "in progress", "shipped", "delivered", "cancelled"]}
            badgeClass={`${progBadge.bg} ${progBadge.text}`}
            onChange={(v) => onStatusUpdate(order, "orderStatus", v)}
          />

          <button
            onClick={() => onDelete(order)}
            className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-500 rounded-lg text-sm font-semibold hover:bg-red-50 transition-colors"
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>

      {/* ── Progress tracker ── */}
      {!isCancelled ? (
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <p className="text-sm font-semibold text-gray-500 mb-6">Order Progress</p>
          <div className="flex items-center">
            {ORDER_STATUS_STEPS.map((step, i) => {
              const done = i <= currentStep;
              const active = i === currentStep;
              return (
                <React.Fragment key={step}>
                  <div className="flex flex-col items-center gap-2 flex-shrink-0">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                        done
                          ? "bg-[#cb6f4d] border-[#cb6f4d] shadow-sm"
                          : "bg-white border-gray-200"
                      }`}
                    >
                      {done && (
                        <svg className="w-4 h-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                    <span
                      className={`text-xs font-semibold whitespace-nowrap ${
                        active
                          ? "text-[#cb6f4d]"
                          : done
                          ? "text-gray-600"
                          : "text-gray-300"
                      }`}
                    >
                      {step}
                    </span>
                  </div>
                  {i < ORDER_STATUS_STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 rounded-full transition-colors ${
                        i < currentStep ? "bg-[#cb6f4d]" : "bg-gray-200"
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-6 py-4 text-sm font-semibold flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
          This order has been cancelled.
        </div>
      )}

      {/* ── Detail cards ── */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Product */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4">
          <SectionHeading icon={<Package size={15} />} title="Product" />
          {order.itemImage && (
            <img
              src={order.itemImage}
              alt={order.item}
              className="w-full h-40 object-cover rounded-lg border border-gray-100"
            />
          )}
          <InfoRow label="Name" value={order.item} />
          {order.productPrice != null && (
            <InfoRow label="Price" value={fmt(order.productPrice)} />
          )}
          {order.deliveryMethod && (
            <InfoRow
              label="Delivery"
              value={order.deliveryMethod === "pickup" ? "🏬 Pickup" : "🚚 Home delivery"}
            />
          )}
        </div>

        {/* Pricing */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4">
          <SectionHeading icon={<Tag size={15} />} title="Pricing" />
          {order.productPrice != null && (
            <PriceRow label="Product price" value={fmt(order.productPrice)} />
          )}
          {order.buyerProtectionFee != null && (
            <PriceRow label="Buyer protection" value={fmt(order.buyerProtectionFee)} />
          )}
          {order.shippingFee != null && (
            <PriceRow label="Shipping fee" value={fmt(order.shippingFee)} />
          )}
          <div className="border-t border-dashed border-gray-200 pt-3">
            <PriceRow
              label="Total"
              value={order.totalAmount != null ? fmt(order.totalAmount) : order.amount}
              bold
            />
          </div>
          <div className="pt-1">
            <InfoRow
              label="Payment"
              value={
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${payBadge.bg} ${payBadge.text}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${payBadge.dot}`} />
                  {order.status}
                </span>
              }
            />
          </div>
        </div>

        {/* Parties + Tracking */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4">
          <SectionHeading icon={<User size={15} />} title="Parties" />

          <div className="flex items-center gap-3">
            {order.buyer?.avatar && (
              <img src={order.buyer.avatar} alt={order.buyer.name} className="w-8 h-8 rounded-full border border-gray-200" />
            )}
            <div>
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Buyer</p>
              <p className="text-sm font-semibold text-gray-800">{order.buyer?.name || "—"}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {order.seller?.avatar && (
              <img src={order.seller.avatar} alt={order.seller.name} className="w-8 h-8 rounded-full border border-gray-200" />
            )}
            <div>
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Seller</p>
              <p className="text-sm font-semibold text-gray-800">{order.seller?.name || "—"}</p>
            </div>
          </div>

          {/* Tracking */}
          {(order.tracking || order.carrier) && (
            <div className="border-t border-gray-100 pt-4 space-y-2">
              <SectionHeading icon={<Truck size={15} />} title="Tracking" />
              <InfoRow label="Carrier"  value={order.carrier  !== "N/A" ? order.carrier  : "—"} />
              <InfoRow label="Tracking" value={order.tracking !== "N/A" ? order.tracking : "—"} />
            </div>
          )}

          {/* Delivery address (if home delivery) */}
          {order.deliveryMethod === "home" && order.address && (
            <div className="border-t border-gray-100 pt-4 space-y-2">
              <SectionHeading icon={<MapPin size={15} />} title="Delivery Address" />
              <p className="text-sm text-gray-700 leading-relaxed">{order.address}</p>
              {order.phoneNumber && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone size={13} className="text-gray-400" />
                  {order.phoneNumber}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Shared UI Primitives ───────────────────────────────────────────────────

function UserCell({ name, avatar }: { name?: string; avatar?: string }) {
  return (
    <div className="flex items-center gap-2">
      {avatar ? (
        <img src={avatar} alt={name} className="w-7 h-7 rounded-full border border-gray-200 flex-shrink-0" />
      ) : (
        <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
          <User size={12} className="text-gray-400" />
        </div>
      )}
      <span className="text-sm font-medium text-gray-700">{name || "—"}</span>
    </div>
  );
}

function StatusPill({
  label,
  badge,
}: {
  label: string;
  badge: { bg: string; text: string; dot: string };
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${badge.bg} ${badge.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${badge.dot}`} />
      {label}
    </span>
  );
}

function StatusDropdown({
  label,
  value,
  options,
  badgeClass,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  badgeClass: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((p) => !p)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold ${badgeClass} hover:opacity-90 transition-opacity`}
      >
        <span className="uppercase tracking-wide opacity-70">{label}:</span>
        <span className="capitalize">{value}</span>
        <ChevronDown size={12} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[170px] py-1">
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              className={`w-full text-left px-4 py-2 text-sm capitalize hover:bg-gray-50 transition-colors ${
                opt.toLowerCase() === value.toLowerCase()
                  ? "font-bold text-[#cb6f4d]"
                  : "text-gray-700"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SectionHeading({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 text-[#cb6f4d]">
      {icon}
      <p className="text-xs font-bold uppercase tracking-wider">{title}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs text-gray-400 font-medium flex-shrink-0">{label}</span>
      <span className="text-sm text-gray-800 font-semibold text-right">{value ?? "—"}</span>
    </div>
  );
}

function PriceRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-sm ${bold ? "font-bold text-[#1a202c]" : "text-gray-500"}`}>
        {label}
      </span>
      <span className={`text-sm ${bold ? "font-black text-[#1a202c]" : "text-gray-700 font-medium"}`}>
        {value}
      </span>
    </div>
  );
}

function ActionButtons({
  onView,
  onDelete,
}: {
  onView: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="inline-flex items-center border border-gray-200 rounded-md overflow-hidden bg-white shadow-sm">
      <button
        onClick={onView}
        className="px-3 py-1.5 hover:bg-gray-50 transition-colors text-[#cb6f4d] text-sm font-bold border-r border-gray-200"
      >
        View
      </button>
      <button
        onClick={onDelete}
        className="px-2 py-1.5 text-[#cb6f4d] hover:bg-red-50 transition-colors"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}