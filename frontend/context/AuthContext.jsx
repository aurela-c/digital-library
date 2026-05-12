import {
  createContext,
  useCallback,
  useMemo,
  useState,
} from "react";
import { logoutSession } from "../src/services/api.js";

export const AuthContext = createContext();

const readStoredUser = () => {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => readStoredUser());

  const loginUser = useCallback((accessToken, refreshToken, nextUser) => {
    setUser(nextUser);
    localStorage.setItem("accessToken", accessToken);
    if (refreshToken) {
      localStorage.setItem("refreshToken", refreshToken);
    }
    if (nextUser) {
      localStorage.setItem("user", JSON.stringify(nextUser));
      if (nextUser.id != null) {
        localStorage.setItem("userId", String(nextUser.id));
      }
      if (nextUser.username) {
        localStorage.setItem("name", nextUser.username);
      }
    }
  }, []);

  const logout = useCallback(async () => {
    const rt = localStorage.getItem("refreshToken");
    try {
      if (rt) {
        await logoutSession(rt);
      }
    } catch {
      /* still clear client session */
    }
    setUser(null);
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    localStorage.removeItem("userId");
    localStorage.removeItem("name");
    localStorage.removeItem("token");
  }, []);

  const value = useMemo(
    () => ({ user, loginUser, logout }),
    [user, loginUser, logout]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
