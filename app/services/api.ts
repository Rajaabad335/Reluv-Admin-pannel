const BASE_URL = "http://localhost:1337/api";

export async function apiRequest(
  endpoint: string,
  options?: RequestInit
) {
  const jwt =
    typeof window !== "undefined"
      ? localStorage.getItem("jwt")
      : null;

  // 1. Check if the body is FormData
  const isFormData = options?.body instanceof FormData;

  const headers: Record<string, string> = {
    ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
    ...(options?.headers as Record<string, string> || {}),
  };

  // 2. Only add JSON header if it's NOT FormData and not already set
  if (!isFormData && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  // 3. If it IS FormData, we MUST ensure Content-Type is removed 
  // so the browser can set the correct multipart/form-data boundary
  if (isFormData) {
    delete headers["Content-Type"];
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: headers,
  });

  let data;

  try {
    data = await res.json();   // ✅ SAFE parsing
  } catch (err) {
    // If the server returns an empty success or non-JSON error
    if (res.ok) return { success: true };
    throw new Error(`Invalid JSON response (${res.status})`);
  }

  if (!res.ok) {
    throw new Error(data?.error?.message || `API Error ${res.status}`);
  }

  return data;
}