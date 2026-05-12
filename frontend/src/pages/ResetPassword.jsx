import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../services/api";
import PageContainer from "../components/layout/PageContainer";

const ResetPassword = () => {
  const { token } = useParams();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const reset = async () => {
    setLoading(true);
    try {
      await api.post(`/auth/reset/${token}`, { password });
      alert("Password changed");
      window.location.href = "/login";
    } catch (e) {
      alert(e.response?.data?.error || "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5efe9] flex flex-col">
      <PageContainer className="flex-1 flex items-center justify-center py-10 px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">
            New Password
          </h2>
          <p className="text-sm text-gray-600 mb-6">Choose a new password.</p>
          <label className="block text-sm text-gray-600 mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 border rounded-lg mb-4 text-base min-h-[48px]"
          />
          <button
            type="button"
            disabled={loading}
            onClick={reset}
            className="w-full min-h-[48px] bg-[#D34F4E] text-white rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 touch-manipulation"
          >
            {loading ? "Saving…" : "Reset"}
          </button>
          <Link
            to="/login"
            className="block text-center text-sm text-[#D34F4E] mt-4 hover:underline"
          >
            Back to login
          </Link>
        </div>
      </PageContainer>
    </div>
  );
};

export default ResetPassword;
