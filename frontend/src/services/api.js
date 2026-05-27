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

// --- Admin: user management ---
export const getAllUsers = () => API.get("/users");
export const updateUserRole = (id, role) =>
  API.patch(`/users/${id}/role`, { role });
export const updateUserStatus = (id, accountStatus) =>
  API.patch(`/users/${id}/status`, { accountStatus });
export const deleteUser = (id) => API.delete(`/users/${id}`);

// --- Admin: aggregated dashboard stats ---
export const getAdminStats = () => API.get("/users/admin/stats");

export const getAuthProfile = (id) => API.get(`/auth/${id}`);

// --- Profile self-service ---
export const updateMyProfile = (data) => API.patch("/auth/me", data);
export const changeMyPassword = (data) => API.post("/auth/me/password", data);
export const getMySession = () => API.get("/auth/me/session");
export const logoutAllDevices = () => API.post("/auth/me/logout-all");
export const deleteMyAccount = (data) => API.post("/auth/me/delete", data);

/**
 * GET /books — list books.
 *
 * Accepts optional filter params: `{ categoryId, author, title, page, limit }`.
 * The API returns an array; some proxies/caches may wrap as `{ books: [] }`,
 * so we normalise to always resolve `res.data` to a plain array.
 */
export const getBooks = async (params = {}) => {
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(
      ([, v]) => v !== undefined && v !== null && v !== ""
    )
  );

  const res = await API.get("/books", {
    params: Object.keys(cleanParams).length ? cleanParams : undefined,
  });
  const payload = res.data;
  if (Array.isArray(payload)) {
    return res;
  }
  if (payload && Array.isArray(payload.books)) {
    return { ...res, data: payload.books };
  }
  return { ...res, data: [] };
};
export const getBook = (id) => API.get(`/books/${id}`);
export const createBook = (data) => API.post("/books", data);
export const updateBook = (id, data) => API.put(`/books/${id}`, data);
export const deleteBook = (id) => API.delete(`/books/${id}`);

/** Admin-only: toggle a book's "Popular Now" flag. */
export const setBookPopular = (id, isPopular) =>
  API.patch(`/books/${id}`, { isPopular: Boolean(isPopular) });

export const borrowBook = (data) => API.post("/borrow", data);
export const getBorrowedBooks = (userId) => API.get(`/borrow/${userId}`);
export const returnBook = (borrowId) => API.put(`/borrow/return/${borrowId}`);

// --- Support / Help-desk tickets ---
export const createSupportTicket = (data) => API.post("/support/tickets", data);
export const getSupportTickets = (params = {}) =>
  API.get("/support/tickets", { params });
// Always returns the caller's own tickets, even for admins.
export const getMySupportTickets = (params = {}) =>
  API.get("/support/tickets/me", { params });
export const getSupportTicket = (id) => API.get(`/support/tickets/${id}`);
export const replySupportTicket = (id, data) =>
  API.post(`/support/tickets/${id}/reply`, data);
export const updateSupportTicketStatus = (id, status) =>
  API.patch(`/support/tickets/${id}/status`, { status });
export const updateSupportTicketPriority = (id, priority) =>
  API.patch(`/support/tickets/${id}/priority`, { priority });

export default API;
