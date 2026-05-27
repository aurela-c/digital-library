import { useContext, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../services/api";
import PageContainer from "../components/layout/PageContainer";
import { AuthContext } from "../../context/AuthContext.jsx";


const VerifyEmailSuccess = () => {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const navigate = useNavigate();
  const { loginUser } = useContext(AuthContext);

  const [status, setStatus] = useState("loading"); // loading | success | error
  const [message, setMessage] = useState("Verifying your email…");
  const [countdown, setCountdown] = useState(3);
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return; 
    ranRef.current = true;

    if (!token) {
      setStatus("error");
      setMessage("This verification link is missing a token.");
      return;
    }

    api
      .get("/auth/verify-email", {
        params: { token },
        headers: { Accept: "application/json" },
      })
      .then((res) => {
        const data = res?.data || {};

        console.log("[verify-email] backend response:", {
          hasAccessToken: !!data.accessToken,
          hasRefreshToken: !!data.refreshToken,
          hasUser: !!data.user,
          message: data.message,
          success: data.success,
        });

        const msg = data.message || "Email verified successfully";
        setMessage(msg);
        setStatus("success");

        if (data.accessToken && data.user) {
          loginUser(data.accessToken, data.refreshToken, data.user);
          toast.success("You're signed in!");

          // Unified post-verification landing: everyone goes to /home.
          // Admin powers are exposed inline through the shared UI rather
          // than as a separate dashboard landing.
          const target = "/home";

          let n = 3;
          setCountdown(n);
          const tick = setInterval(() => {
            n -= 1;
            setCountdown(n);
            if (n <= 0) {
              clearInterval(tick);
              navigate(target, { replace: true });
            }
          }, 1000);
        } else {

          console.warn(
            "[verify-email] No auto-login tokens in response. " +
              "Restart auth-service so the new verifyEmail logic ships."
          );
          toast.info(msg);
        }
      })
      .catch((err) => {
        const data = err?.response?.data;
        const msg =
          (typeof data?.message === "string" && data.message) ||
          (typeof data?.error === "string" && data.error) ||
          "Verification failed. The link may be invalid or expired.";
        setStatus("error");
        setMessage(msg);
        toast.error(msg);
      });
  }, [token, navigate, loginUser]);

  return (
    <div className="min-h-screen bg-[#f5efe9] flex flex-col">
      <PageContainer className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 text-center">
          {status === "loading" && (
            <>
              <div className="mx-auto mb-5 h-12 w-12 rounded-full border-4 border-gray-200 border-t-[#D34F4E] animate-spin" />
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">
                Verifying your email
              </h2>
              <p className="text-sm text-gray-600">{message}</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="mx-auto mb-5 h-14 w-14 rounded-full bg-green-100 flex items-center justify-center">
                <svg
                  className="h-8 w-8 text-green-600"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">
                Your email has been successfully verified
              </h2>
              <p className="text-sm text-gray-600 mb-2">{message}</p>
              {countdown > 0 ? (
                <p className="text-xs text-gray-500">
                  Signing you in in {countdown}s…
                </p>
              ) : (
                <p className="text-xs text-gray-500">
                  You can continue to the app.
                </p>
              )}
              <Link
                to="/home"
                className="inline-block mt-5 px-5 py-2 rounded-lg bg-[#D34F4E] text-white font-semibold hover:opacity-90"
              >
                Go to home
              </Link>
            </>
          )}

          {status === "error" && (
            <>
              <div className="mx-auto mb-5 h-14 w-14 rounded-full bg-red-100 flex items-center justify-center">
                <svg
                  className="h-8 w-8 text-red-600"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">
                Verification failed
              </h2>
              <p className="text-sm text-gray-600 mb-5">{message}</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  to="/login"
                  className="px-5 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Back to login
                </Link>
                <Link
                  to="/register"
                  className="px-5 py-2 rounded-lg bg-[#D34F4E] text-white font-semibold hover:opacity-90"
                >
                  Register again
                </Link>
              </div>
            </>
          )}
        </div>
      </PageContainer>
    </div>
  );
};

export default VerifyEmailSuccess;
