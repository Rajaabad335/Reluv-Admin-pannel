import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { BACKEND_URL } from "@/constants";

const toDisplayText = (value: unknown): string => {
  if (value == null) return "";
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const candidates = [obj.title, obj.name, obj.label, obj.slug, obj.value];
    for (const candidate of candidates) {
      if (typeof candidate === "string" && candidate.trim().length > 0)
        return candidate;
      if (typeof candidate === "number") return String(candidate);
    }
  }
  return "";
};

const toImageUrl = (value: unknown): string | null => {
  if (typeof value === "string" && value.trim().length > 0) return value;
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const direct = obj.url;
    if (typeof direct === "string" && direct.trim().length > 0) return direct;
    const data = obj.data as Record<string, unknown> | undefined;
    const attrs = data?.attributes as Record<string, unknown> | undefined;
    const nested = attrs?.url;
    if (typeof nested === "string" && nested.trim().length > 0) return nested;
  }
  return null;
};

export default function ProductCard({
  id,
  brand,
  title,
  size,
  condition,
  price,
  totalPrice,
  imageUrl,
  images,
}: any) {
  const safeImageUrl = toImageUrl(imageUrl ?? images?.[0]);
  const productId = encodeURIComponent(String(id ?? "").trim() || "0");
  const nameText = toDisplayText(title);
  const brandText = toDisplayText(brand);
  const sizeText = toDisplayText(size);
  const conditionText = toDisplayText(condition);
  const priceText = toDisplayText(price);
  const totalPriceText = toDisplayText(totalPrice);

  return (
    <Link href={`/products/${productId}`}>
      <div className="group flex cursor-pointer flex-col h-full rounded-2xl overflow-hidden bg-white border border-[#f0ede8] hover:border-[#e0ddd8] transition-all duration-300 hover:shadow-lg hover:shadow-[rgba(203,111,77,0.12)]">

        {/* Image Container */}
        <div className="relative aspect-3/4 w-full overflow-hidden bg-linear-to-br from-[#faf9f7] to-[#f0ede8]">
          {safeImageUrl ? (
            <img
              src={`${BACKEND_URL}${safeImageUrl}`}
              alt={brandText || nameText || "Product"}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div className="h-full w-full bg-linear-to-br from-[#faf9f7] to-[#f0ede8] flex items-center justify-center">
              <div className="text-[#ddd] text-4xl">📦</div>
            </div>
          )}

          {/* Condition Badge */}
          <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-semibold text-[#1a1a1a] shadow-md">
            {conditionText || "Good"}
          </div>
        </div>

        {/* Content Section */}
        <div className="flex flex-col flex-1 p-4">

          {/* Brand */}
          <p className="text-xs font-bold uppercase tracking-widest text-[#cb6f4d] mb-2">
            {brandText || "Brand"}
          </p>

          {/* Product Title */}
          <h3 className="text-sm font-semibold text-[#1a1a1a] line-clamp-2 mb-3 leading-tight">
            {nameText}
          </h3>

          {/* Product Details */}
          <div className="flex items-center gap-2 text-xs text-[#888] mb-4">
            {sizeText && (
              <>
                <span className="bg-[#f5f5f5] px-2 py-0.5 rounded-md font-medium">{sizeText}</span>
                <span>•</span>
              </>
            )}
            <span className="rounded-full border border-[#cb6f4d] text-[#cb6f4d] px-3 py-1 text-[11px] font-medium transition-colors duration-300 hover:bg-[rgb(203,111,77)] hover:text-white">{conditionText || "Good"}</span>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Price Section */}
          <div className="space-y-2 pt-3 border-t border-[#f0ede8]">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-[#aaa]">Price</span>
              <span className="text-lg font-bold text-[#cb6f4d]">{priceText}</span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-[#aaa]">buyer protection Incl.</span>
              <div className="flex items-center gap-1 text-[#1a1a1a] font-semibold">
                <span>100 TBH</span>
                <ShieldCheck size={12} className="text-[#cb6f4d]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}