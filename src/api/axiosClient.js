import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "https://api.dukankhata.in/api/v1",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const url = config.url || "";
  const isAuthPublicRoute =
    url.includes("/auth/login") ||
    url.includes("/auth/signup") ||
    url.includes("/auth/forgot-password") ||
    url.includes("/auth/reset-password");

  if (!isAuthPublicRoute) {
    const token = localStorage.getItem("dk_access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } else {
    delete config.headers.Authorization;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("dk_access_token");
    }
    return Promise.reject(error);
  }
);

export default api;
