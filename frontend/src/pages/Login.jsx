import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { login } from "../services/api";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await login({ email, password });

      const { token, user } = res.data;
      localStorage.setItem("token", token);
      localStorage.setItem("userId", user.id);
      localStorage.setItem("name", user.name);
      localStorage.setItem("role", user.role); 

      alert("Login successful!");

    
      if (user.role === "ROLE_ADMIN") {
        navigate("/admin");
      } else {
        navigate("/home");
      }

    } catch (err) {
      console.error(err);

      const msg =
        err.response?.data?.error ||
        "Login failed";

      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5efe9] flex items-center justify-center px-4">

      <div className="w-full max-w-3xl min-h-[500px] bg-white shadow-md flex overflow-hidden">

        {/* LEFT IMAGE */}
        <div className="hidden md:flex relative w-1/2 overflow-hidden">
          <img
            src="/images/LoginPhoto.jpg"
            alt="Background"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/30"></div>

          <div className="relative z-10 flex flex-col justify-center items-start p-10 text-white mt-6">
            <h1 className="text-4xl md:text-3xl font-serif">
              Welcome <br /> to The Book Club
            </h1>
          </div>
        </div>

        {/* RIGHT FORM */}
        <div className="w-full md:w-1/2 relative flex flex-col justify-center px-10 py-12">

          <Link
            to="/"
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            &times;
          </Link>

          <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
            Log in to your account
          </h2>

          <form className="space-y-5" onSubmit={handleLogin}>

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

            {/* SUBMIT */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-2 rounded-full text-white transition text-sm
                ${loading ? "bg-gray-400" : "bg-red-400 hover:bg-red-500"}
              `}
            >
              {loading ? "Logging in..." : "Sign in"}
            </button>

            <p className="text-xs text-center text-gray-500">
              Don’t have an account?{" "}
              <Link to="/register" className="text-red-400 hover:underline">
                Create one
              </Link>
            </p>

          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;