import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../services/api";
import PageContainer from "../components/layout/PageContainer";

const ResetRequest = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [serverMessage, setServerMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || loading) return;

    setLoading(true);
    try {
      const res = await api.post("/auth/forgot-password", { email });
      const msg =
        res?.data?.message ||
        "If an account exists for that email, a reset link has been sent.";
      setServerMessage(msg);
      setSent(true);
      toast.success(msg, { autoClose: 4000 });
    } catch (err) {
      const data = err?.response?.data;
      const msg =
        (typeof data?.message === "string" && data.message) ||
        (typeof data?.error === "string" && data.error) ||
        "Request failed";
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
            Forgot password
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            Enter your email and we will send you a reset link.
          </p>

          {sent && serverMessage && (
            <div className="mb-5 rounded-lg border border-green-200 bg-green-50 text-green-800 px-4 py-3 text-sm">
              {serverMessage}
            </div>
          )}

          <label className="block text-sm text-gray-600 mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 border rounded-lg mb-4 text-base min-h-[48px]"
            placeholder="you@example.com"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[48px] bg-[#D34F4E] text-white rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 touch-manipulation"
          >
            {loading ? "Sending…" : sent ? "Resend link" : "Send reset link"}
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

export default ResetRequest;
