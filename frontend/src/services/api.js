import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:4500", 
  headers: {
    "Content-Type": "application/json",
  },
});


API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});




// AUTH
export const login = (data) => API.post("/auth/login", data);
export const register = (data) => API.post("/auth/register", data);
export const getMe = (id) => API.get(`/auth/${id}`);


// USER
export const getUser = (id) => API.get(`/users/${id}`);


// BOOKS
export const getBooks = () => API.get("/books");
export const getBook = (id) => API.get(`/books/${id}`);


// BORROW
export const borrowBook = (data) => API.post("/borrow", data);
export const getBorrowedBooks = (userId) =>
  API.get(`/borrow/${userId}`);

export const returnBook = (borrowId) =>
  API.put(`/borrow/return/${borrowId}`);

export default API;