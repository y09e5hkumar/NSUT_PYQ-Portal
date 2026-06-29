import axios from "axios";

let rawUrl = import.meta.env.VITE_API_URL || "http://localhost:5001/api";
// Clean up trailing slash
rawUrl = rawUrl.replace(/\/$/, "");
// Ensure it ends with /api
const API_URL = rawUrl.endsWith("/api") ? rawUrl : `${rawUrl}/api`;

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export { API_URL };
export default api;

