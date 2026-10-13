import api from "./axiosClient";

export async function signup(payload) {
  const response = await api.post("/auth/signup", payload);
  return response.data;
}

export async function login(payload) {
  const response = await api.post("/auth/login", payload);
  return response.data;
}

export async function getMe() {
  const response = await api.get("/auth/me");
  return response.data;
}

export async function logout() {
  const response = await api.post("/auth/logout");
  return response.data;
}
