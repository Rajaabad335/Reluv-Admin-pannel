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
    `/users/${id}?populate[products][populate]=*&populate[role]=*&populate[received_reviews][populate]=author&populate[following][populate]=*&populate[followers][populate]=*`, 
    {
      method: "GET",
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

