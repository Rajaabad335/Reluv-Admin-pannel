import { apiRequest } from "./api";

export function login(identifier: string, password: string) {
  return apiRequest("/auth/local", {
    method: "POST",
    body: JSON.stringify({ identifier, password }),
  });
}

export function register(username: string, email: string, password: string) {
  return apiRequest("/auth/local/register", {
    method: "POST",
    body: JSON.stringify({ username, email, password }),
  });
}
export function getUser(id: number) {
  return apiRequest(
    `/users/${id}?populate[products][populate]=*&populate[role]=*&populate[received_reviews][populate]=*&populate[following][populate]=*&populate[followers][populate]=*`, 
    {
      method: "GET",
    }
  );
}
export function getUserAvatr(id: number) {
  return apiRequest(
    `/users/${id}?populate[avatar][populate]=*`,
     { method: "GET",
    }
  );
}
export function AccountUpdate(id: number, data: any) {
  return apiRequest(`/users/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json", // Tells the server you're sending JSON
    },
    body: JSON.stringify(data), // Converts your object to a JSON string
  });
}
export function updateUserProfile(id: number, data: FormData) {
return apiRequest(`/users/${id}`, {
    method: "PUT",
    body: data, 
    headers: {
      "Content-Type": "application/json", 
    },
  });
}
export function logout() {
  localStorage.removeItem("jwt");
  localStorage.removeItem("user");
}
export async function loginWithGoogle(token: string) {
  const res = await fetch(
    `http://localhost:1337/api/auth/google/callback?access_token=${token}`,
    { method: "GET" }
  );
  if (!res.ok) throw new Error(await res.text());
  return res.json(); 
}
export async function loginWithFacebook(accessToken: string) {
  const res = await fetch(`http://localhost:1337/auth/facebook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ access_token: accessToken }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Facebook login failed");
  }
  return res.json(); // expects { jwt, user }
}

