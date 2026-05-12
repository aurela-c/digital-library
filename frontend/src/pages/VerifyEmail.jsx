import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../services/api";
import PageContainer from "../components/layout/PageContainer";

const VerifyEmail = () => {
  const { token } = useParams();
  const [status, setStatus] = useState("Verifying…");

  useEffect(() => {
    api
      .get(`/auth/verify/${token}`)
      .then(() => {
        setStatus("Email verified!");
        alert("Email verified!");
        window.location.href = "/login";
      })
      .catch(() => {
        setStatus("Verification failed. Link may be invalid or expired.");
      });
  }, [token]);

  return (
    <div className="min-h-screen bg-[#f5efe9] flex flex-col">
      <PageContainer className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md text-center bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-3">
            Email verification
          </h2>
          <p className="text-gray-600 text-sm sm:text-base">{status}</p>
          <Link
            to="/login"
            className="inline-block mt-6 text-[#D34F4E] font-semibold hover:underline"
          >
            Go to login
          </Link>
        </div>
      </PageContainer>
    </div>
  );
};

export default VerifyEmail;
