import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyEmail from "./pages/VerifyEmail";
import VerifyEmailSuccess from "./pages/VerifyEmailSuccess";
import ResetPassword from "./pages/ResetPassword";
import ResetRequest from "./pages/ResetRequest";

import Home from "./pages/Home";
import Profile from "./pages/Profile";
import BookCard from "./pages/BookCard";
import CategoryBooks from "./pages/CategoryBooks";
import AdminDashboard from "./pages/AdminDashboard";
import Contact from "./pages/Contact";

import ProtectedRoute from "./routes/ProtectedRoute";
import AdminRoute from "./routes/AdminRoute";
import { isAdminRole, readCurrentRole } from "./utils/roles.js";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

/**
 * Admins no longer have a "user profile" page. They get the Admin
 * Tools Panel instead. Any attempt (direct URL, old link, etc.) to
 * reach /profile while logged in as admin is redirected to /admin.
 */
const ProfileRoute = () => {
  if (isAdminRole(readCurrentRole())) {
    return <Navigate to="/admin" replace />;
  }
  return <Profile />;
};

/**
 * Contact Us is the user-facing support form. Admins consume support
 * tickets through the Admin Tools Panel (the Support section), so if an
 * admin opens /contact directly they get redirected to /admin.
 */
const ContactRoute = () => {
  if (isAdminRole(readCurrentRole())) {
    return <Navigate to="/admin" replace />;
  }
  return <Contact />;
};

function App() {
  return (
    <BrowserRouter>
      <ToastContainer position="top-center" autoClose={2000} />

      <Routes>

        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        {/* Email-verification landing page (auto-login + redirect to /home). */}
        <Route path="/verify-email" element={<VerifyEmailSuccess />} />
        {/* Back-compat alias for older email links. */}
        <Route path="/verify-email-success" element={<VerifyEmailSuccess />} />
        {/* Legacy path-param style (redirects internally to /verify-email). */}
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
              <ProfileRoute />
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

        <Route path="/contact" element={<ContactRoute />} />

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