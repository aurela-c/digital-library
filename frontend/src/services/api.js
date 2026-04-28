import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:4000",
  headers: {
    "Content-Type": "application/json",
  },
});

//auth
export const login = (data) => API.post("/auth/login", data);
export const register = (data) => API.post("/auth/register", data);
export const getMe = (id) => API.get(`/auth/${id}`);

//user
export const getUser = (id) => API.get(`/users/${id}`);

//book
export const getBooks = () => API.get("/books");
export const getBook = (id) => API.get(`/books/${id}`);

//borrow
export const borrowBook = (data) => API.post("/borrow", data);
export const getBorrowedBooks = (userId) =>
  API.get(`/borrow/${userId}`);
export const returnBook = (borrowId) =>
  API.put(`/borrow/return/${borrowId}`);

export default API;