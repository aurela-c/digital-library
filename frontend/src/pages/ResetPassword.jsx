import { useState } from "react";
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../services/api";
import PageContainer from "../components/layout/PageContainer";

const ResetPassword = () => {
  // Token may arrive as a path param (`/reset-password/:token`) OR a query string
  // (`/reset-password?token=...`) depending on how the user got here.
  const params = useParams();
  const [search] = useSearchParams();
  const token = params.token || search.get("token") || "";

  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (!token) {
      toast.error("Reset link is missing a token");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      // Spec endpoint: token in the body.
      const res = await api.post("/auth/reset-password", { token, password });
      const msg = res?.data?.message || "Password reset successful";
      toast.success(msg);
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      const data = err?.response?.data;
      const msg =
        (typeof data?.message === "string" && data.message) ||
        (typeof data?.error === "string" && data.error) ||
        "Reset failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5efe9] flex flex-col">
      <PageContainer className="flex-1 flex items-center justify-center py-10 px-4">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6 sm:p-8"
        >
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">
            Choose a new password
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            Enter and confirm your new password below.
          </p>

          <label className="block text-sm text-gray-600 mb-1">New password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="w-full px-4 py-3 border rounded-lg mb-4 text-base min-h-[48px]"
          />

          <label className="block text-sm text-gray-600 mb-1">Confirm password</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={8}
            className="w-full px-4 py-3 border rounded-lg mb-4 text-base min-h-[48px]"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[48px] bg-[#D34F4E] text-white rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 touch-manipulation"
          >
            {loading ? "Saving…" : "Reset password"}
          </button>

          <Link
            to="/login"
            className="block text-center text-sm text-[#D34F4E] mt-4 hover:underline"
          >
            Back to login
          </Link>
        </form>
      </PageContainer>
    </div>
  );
};

export default ResetPassword;
