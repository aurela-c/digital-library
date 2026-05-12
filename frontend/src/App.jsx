import { BrowserRouter, Routes, Route } from "react-router-dom";

import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyEmail from "./pages/VerifyEmail";
import ResetPassword from "./pages/ResetPassword";
import ResetRequest from "./pages/ResetRequest";

import Home from "./pages/Home";
import Profile from "./pages/Profile";
import BookCard from "./pages/BookCard";
import CategoryBooks from "./pages/CategoryBooks";
import AdminDashboard from "./pages/AdminDashboard";

import ProtectedRoute from "./routes/ProtectedRoute";
import AdminRoute from "./routes/AdminRoute";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function App() {
  return (
    <BrowserRouter>
      <ToastContainer position="top-center" autoClose={2000} />

      <Routes>

        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify/:token" element={<VerifyEmail />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/forgot-password" element={<ResetRequest />} />

        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/book/:id"
          element={
            <ProtectedRoute>
              <BookCard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/categories/:category"
          element={
            <ProtectedRoute>
              <CategoryBooks />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />

        <Route
          path="*"
          element={
            <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-[#f5efe9]">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center text-gray-800">
                404 - Page Not Found
              </h1>
              <p className="mt-3 text-gray-600 text-sm sm:text-base text-center max-w-md">
                The page you are looking for does not exist or has been moved.
              </p>
            </div>
          }
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;