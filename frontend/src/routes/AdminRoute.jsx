import React from "react";
import { Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { isAdminRole, roleFromToken } from "../utils/roles.js";

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

    let storedUser = null;
    try {
      const raw = localStorage.getItem("user");
      if (raw) storedUser = JSON.parse(raw);
    } catch {
      storedUser = null;
    }

    if (!isAdminRole(roleFromToken(decoded, storedUser))) {
      return <Navigate to="/home" replace />;
    }

    return children;
  } catch {
    return <Navigate to="/login" replace />;
  }
};

export default AdminRoute;
