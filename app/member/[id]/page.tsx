"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import {
  Star,
  MapPin,
  Clock,
  Users,
  Mail,
  Heart,
  Shield,
  Eye,
  User,
  Phone,
} from "lucide-react";
import { useParams } from "next/navigation";
import Link from "next/link";

// Same prefix used by UserManagement when it hands off a full user record.
// We read it directly and skip any user/product data-fetching entirely.
const MEMBER_CACHE_PREFIX = "member-cache:";

const readMemberCache = (id: number): any | null => {
  if (typeof window === "undefined") return null;
  try {
    const key = `${MEMBER_CACHE_PREFIX}${id}`;
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    // Intentionally NOT deleted here: React Strict Mode runs effects twice in
    // development, and a delete-on-read would wipe the cache before the
    // second invocation, causing a false "not found". UserManagement always
    // overwrites this key with fresh data before the next navigation anyway.
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const getFirstImageUrl = (images: any[] = []) => {
  if (!Array.isArray(images)) return null;
  const firstImage = images.find((img: any) => img?.url || img?.formats?.thumbnail?.url);
  if (!firstImage) return null;
  return firstImage.url || firstImage.formats?.thumbnail?.url || null;
};

// ── Read-only product card ────────────────────────────────────────────────
function ListingCard({ product }: { product: any }) {
  const imageUrl = product.imageUrl || null;

  return (
    <div className="group relative rounded-2xl overflow-hidden border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow">
      {/* <Link href={`/products/${product.id}`}> */}
        <div className="aspect-square bg-gray-100 overflow-hidden">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={product.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">
              No image
            </div>
          )}
        </div>
      {/* </Link> */}

      <div className="p-3">
        <p className="text-sm font-medium text-gray-900 truncate">
          {product.title || product.brand}
        </p>
        <p className="text-sm font-bold text-[#cb6f4d] mt-0.5">
          {product.price}
        </p>
        {product.category?.name && (
          <p className="text-sm font-normal text-[#cb6f4d] mt-0.5">
            {product.category.name}
          </p>
        )}
        {product.condition && (
          <p className="text-xs text-gray-400 mt-0.5">{product.condition}</p>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────
const ProfilePage = () => {
  const params = useParams();
  const sellerId = params?.id;

  const [activeTab, setActiveTab] = useState("Listings");
  const [userData, setUserData] = useState<any>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const timeAgo = (dateString: string | undefined) => {
    if (!dateString) return "recently";
    const seconds = Math.floor(
      (Date.now() - new Date(dateString).getTime()) / 1000,
    );
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`;
    return new Date(dateString).toLocaleDateString();
  };

  function mapProductToCard(entry: any) {
    return {
      id: entry.id,
      title: entry.title ?? "",
      category: entry.category ?? null,
      brand: entry.brand ?? "",
      size: entry.size ?? "",
      condition: entry.condition ?? "",
      price: entry.price ? `TBH ${entry.price}` : "N/A",
      imageUrl: getFirstImageUrl(entry.images),
      description: entry.description ?? "",
    };
  }

  // ── Load data from the cache UserManagement handed off ──
  // No API calls here: UserManagement already has the full user record
  // (products, reviews, avatar, googlePicture, etc.) in memory, and stashes
  // it in sessionStorage before navigating here.
  useEffect(() => {
    if (!sellerId) return;

    setLoading(true);
    setError(null);

    const cached = readMemberCache(Number(sellerId));

    if (!cached) {
      setError("Profile data not found. Please open this profile from the Admin panel.");
      setLoading(false);
      return;
    }

    const combinedData = {
      ...cached,
      avatarUrl: cached.avatar?.url || cached.googlePicture || null,
    };

    setUserData(combinedData);

    const products = Array.isArray(cached.products) ? cached.products : [];
    setListings(products.map(mapProductToCard));

    setLoading(false);
  }, [sellerId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse space-y-6">
          <div className="w-40 h-40 rounded-full bg-gray-200" />
          <div className="w-64 h-4 bg-gray-200 rounded-full" />
        </div>
      </div>
    );
  }

  if (error || !userData) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <Users size={48} className="text-[#cb6f4d] mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">User Not Found</h2>
          <p className="text-gray-400">
            {error || "We couldn't find this member."}
          </p>
        </div>
      </div>
    );
  }

  const reviews = userData.received_reviews || [];
  const ratingAvg = userData.rating_avg || 5;
  const avatarSrc = userData?.avatarUrl?.trim() || null;

  return (
    <div className="min-h-screen bg-linear-to-br from-[#faf9f7] via-white to-[#f0ede8]">
      {/* Header */}
      <div className="border-b border-[#e0ddd8]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-center md:items-start">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-32 h-32 md:w-56 md:h-56 rounded-full overflow-hidden shadow-xl border-4 border-white bg-white">
                {avatarSrc ? (
                  <Image
                    src={avatarSrc}
                    alt={userData.username || "User"}
                    fill
                    className="object-cover content-center rounded-full"
                    priority
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <User
                      className="w-1/2 h-1/2 text-gray-500 dark:text-gray-400"
                      strokeWidth={1.5}
                    />
                  </div>
                )}
              </div>
              {userData.confirmed && (
                <div className="absolute -bottom-2 -right-2 bg-[#cb6f4d] rounded-full p-3 shadow-lg border-4 border-white">
                  <Shield size={24} className="text-white" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 w-full">
              <div className="mb-6">
                <h1 className="text-3xl md:text-4xl font-serif font-bold text-[#1a1a1a] mb-3">
                  {userData.username}
                </h1>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex text-[#cb6f4d]">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={16}
                        fill={
                          i < Math.floor(ratingAvg) ? "currentColor" : "none"
                        }
                        className={
                          i < Math.floor(ratingAvg) ? "" : "text-[#e0ddd8]"
                        }
                      />
                    ))}
                  </div>
                  <span className="text-[#888] text-sm">
                    {ratingAvg.toFixed(1)} • {reviews.length} reviews
                  </span>
                </div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#fff0e8] border border-[#f0c9b8]">
                  <div className="w-2 h-2 rounded-full bg-[#cb6f4d]" />
                  <span className="text-sm font-medium text-[#cb6f4d]">
                    ✓ Active Seller
                  </span>
                </div>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-[#aaa] mb-4">
                    About
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-[#555]">
                      <MapPin size={18} className="text-[#cb6f4d]" />
                      <span className="text-sm">
                        {userData.country || "—"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[#555]">
                      <Clock size={18} className="text-[#cb6f4d]" />
                      <span className="text-sm">
                        Last seen {timeAgo(userData?.updatedAt)}
                      </span>
                    </div>
                   { userData.phoneNumber && (
                      <div className="flex items-center gap-3 text-[#555]">
                      <Phone size={18} className="text-[#cb6f4d]" />
                      <span className="text-sm">
                         {userData.phoneNumber || ""}
                      </span>
                    </div>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-[#aaa] mb-4">
                    Verified
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Mail
                        size={18}
                        className={
                          userData.confirmed
                            ? "text-[#cb6f4d]"
                            : "text-[#ddd]"
                        }
                      />
                      <span
                        className={`text-sm font-medium ${userData.confirmed ? "text-[#1a1a1a]" : "text-[#aaa]"}`}
                      >
                        {userData.confirmed
                          ? "✓ Email Verified"
                          : "Email Not Verified"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Shield size={18} className="text-[#cb6f4d]" />
                      <span className="text-sm font-medium text-[#1a1a1a]">
                        ✓ Member Since{" "}
                        {(() => {
                          const d = new Date(
                            userData.createdAt || Date.now(),
                          );
                          const month = d.toLocaleString("default", {
                            month: "short",
                          });
                          return `${month} ${d.getFullYear()}`;
                        })()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs + content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="border-b border-[#e0ddd8] mb-8">
          <div className="flex gap-8 justify-center sm:justify-start">
            {["Listings", "Reviews"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-4 text-sm sm:text-base font-semibold transition-all whitespace-nowrap ${
                  activeTab === tab
                    ? "border-b-2 border-[#cb6f4d] text-[#cb6f4d]"
                    : "text-[#aaa] hover:text-[#555]"
                }`}
              >
                {tab === "Listings"
                  ? `Items Listed (${listings.length})`
                  : `Reviews (${reviews.length})`}
              </button>
            ))}
          </div>
        </div>

        {activeTab === "Listings" && (
          <div>
            {listings.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                {listings.map((product: any) => (
                  <ListingCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <Heart size={32} className="text-[#e0ddd8] mx-auto mb-4" />
                <p className="text-[#aaa] text-lg">No items listed yet</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "Reviews" && (
          <div className="max-w-3xl">
            {reviews.length > 0 ? (
              <div className="space-y-6">
                {reviews.map((review: any) => (
                  <div
                    key={review.id}
                    className="bg-white rounded-2xl p-6 border border-[#e0ddd8] shadow-sm"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex text-[#cb6f4d]">
                            {[...Array(review.rating || 5)].map((_, i) => (
                              <Star key={i} size={16} fill="currentColor" />
                            ))}
                          </div>
                          <span className="text-xs font-semibold text-[#aaa]">
                            {review.rating || 5} out of 5
                          </span>
                        </div>
                        <p className="font-semibold text-[#1a1a1a] text-sm">
                          {review.author?.username || "Anonymous"}
                        </p>
                        <p className="text-xs text-[#aaa]">
                          {new Date(review.createdAt).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            },
                          )}
                        </p>
                      </div>
                      <span className="text-xs font-medium text-[#cb6f4d]">
                        Verified Purchase
                      </span>
                    </div>
                    <p className="text-[#555] text-sm leading-relaxed">
                      {review.content}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <Star size={32} className="text-[#e0ddd8] mx-auto mb-4" />
                <p className="text-[#aaa] text-lg">No reviews yet</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;