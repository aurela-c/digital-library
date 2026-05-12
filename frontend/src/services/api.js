import axios from "axios";
import { getApiBaseURL } from "../config/apiBase.js";

const API = axios.create({
  baseURL: getApiBaseURL(),
  headers: {
    "Content-Type": "application/json",
  },
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const url = String(originalRequest?.url || "");

    if (!originalRequest || originalRequest._retry) {
      return Promise.reject(error);
    }

    const isAuthRefresh = url.includes("/auth/refresh");
    const isAuthLogin = url.includes("/auth/login");
    const isAuthRegister = url.includes("/auth/register");

    const refreshToken = localStorage.getItem("refreshToken");
    const hadAuth = Boolean(originalRequest.headers?.Authorization);

    if (
      status === 401 &&
      refreshToken &&
      hadAuth &&
      !isAuthRefresh &&
      !isAuthLogin &&
      !isAuthRegister
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return API(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const base = getApiBaseURL();
        const { data } = await axios.post(
          `${base}/auth/refresh`,
          { token: refreshToken },
          { headers: { "Content-Type": "application/json" } }
        );
        const { accessToken, refreshToken: newRefresh } = data;
        localStorage.setItem("accessToken", accessToken);
        if (newRefresh) {
          localStorage.setItem("refreshToken", newRefresh);
        }
        processQueue(null, accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return API(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        localStorage.removeItem("userId");
        localStorage.removeItem("name");
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export const login = (data) => API.post("/auth/login", data);
export const register = (data) => API.post("/auth/register", data);
export const logoutSession = (refreshToken) =>
  API.post("/auth/logout", { token: refreshToken });

export const getMe = (id) => API.get(`/users/${id}`);
export const getUser = (id) => API.get(`/users/${id}`);

export const getAuthProfile = (id) => API.get(`/auth/${id}`);

export const getBooks = () => API.get("/books");
export const getBook = (id) => API.get(`/books/${id}`);

export const borrowBook = (data) => API.post("/borrow", data);
export const getBorrowedBooks = (userId) => API.get(`/borrow/${userId}`);
export const returnBook = (borrowId) => API.put(`/borrow/return/${borrowId}`);

export default API;
