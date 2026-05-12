import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { register } from "../services/api";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await register({ name, email, password });

      toast.success("Registered successfully!");

      setTimeout(() => {
        navigate("/login");
      }, 1200);
    } catch (err) {
      console.error(err);

      const data = err.response?.data;
      const msg =
        typeof data?.error === "string"
          ? data.error
          : data?.error != null
            ? JSON.stringify(data.error)
            : err.message || "Registration failed";

      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] bg-[#f5efe9] flex items-center justify-center px-3 sm:px-4 py-8 overflow-x-hidden">

      <div className="w-full max-w-3xl min-h-0 bg-white shadow-md rounded-xl sm:rounded-none flex flex-col md:flex-row overflow-hidden">

        <div className="hidden md:flex relative w-full md:w-1/2 overflow-hidden">
          <img
            src="/images/LoginPhoto.jpg"
            alt="Background"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/30"></div>

          <div className="relative z-10 flex flex-col justify-center items-start p-6 md:p-10 text-white mt-6">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-serif">
              Welcome <br /> to The Book Club
            </h1>
          </div>
        </div>

        <div className="w-full md:w-1/2 relative flex flex-col justify-center px-6 md:px-10 py-10 md:py-12">

          <Link
            to="/"
            className="absolute top-3 right-3 md:top-4 md:right-4 text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            &times;
          </Link>

          <h2 className="text-xl md:text-2xl font-bold text-center mb-6 text-gray-800">
            Create your account
          </h2>

          <form className="space-y-5" onSubmit={handleRegister}>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Name</label>
              <input
                type="text"
                required
                className="w-full px-4 py-2 border rounded-lg"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Email</label>
              <input
                type="email"
                required
                className="w-full px-4 py-2 border rounded-lg"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Password</label>
              <input
                type="password"
                required
                className="w-full px-4 py-2 border rounded-lg"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[48px] py-3 rounded-full bg-red-400 text-white hover:bg-red-500 transition disabled:opacity-50 text-sm sm:text-base font-semibold touch-manipulation"
            >
              {loading ? "Registering..." : "Register"}
            </button>

            <p className="text-xs text-center text-gray-500">
              Already have an account?{" "}
              <Link to="/login" className="text-red-400 hover:underline">
                Sign in
              </Link>
            </p>

          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;
