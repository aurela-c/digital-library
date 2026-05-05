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

    if (decoded.role !== "ROLE_ADMIN") {
      return <Navigate to="/home" replace />;
    }

    return children;

  } catch (err) {
    return <Navigate to="/login" replace />;
  }
};

export default AdminRoute;