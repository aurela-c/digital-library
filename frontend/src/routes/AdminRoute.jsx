import React from "react";
import { Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

const AdminRoute = ({ children }) => {
  const token = localStorage.getItem("accessToken");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  try {
    const decoded = jwtDecode(token);

    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("user");
      return <Navigate to="/login" replace />;
    }

    const role = String(decoded.role || "").trim();
    if (role !== "ROLE_ADMIN") {
      return <Navigate to="/home" replace />;
    }

    return children;
  } catch {
    return <Navigate to="/login" replace />;
  }
};

export default AdminRoute;
