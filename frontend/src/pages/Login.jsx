import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { login } from "../services/api";


const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

      try {
      const res = await login({ email, password });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("userId", res.data.user.id);
      localStorage.setItem("name", res.data.user.name);

      alert("Login successful!");
      navigate("/home");

    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Login failed");
    }
  }

  return (
    <div className="min-h-screen bg-[#f5efe9] flex items-center justify-center px-4">

      <div className="w-full max-w-3xl min-h-[500px] bg-white shadow-md flex overflow-hidden">

        <div className="hidden md:flex relative w-1/2 overflow-hidden">
          <img
            src="/images/LoginPhoto.jpg"
            alt="Background"
            className="absolute inset-0 w-full h-full object-cover"
          />

          <div className="absolute inset-0 bg-black/30"></div>

          <div className="relative z-10 flex flex-col justify-center items-start p-10 text-white mt-6">
            <h1 className="text-4xl md:text-3xl font-medium leading-tight tracking-tight font-serif">
              Welcome <br /> to The Book Club
            </h1>
          </div>
        </div>

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
                placeholder="example@email.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <label className="text-gray-600">Password</label>
                <span className="text-gray-400 italic cursor-pointer hover:underline">
                  Forgot?
                </span>
              </div>

              <input
                type="password"
                required
                placeholder="••••••••"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-3 mt-6">

  <button
    type="submit"
    className="w-full py-2 rounded-full bg-red-400 text-white hover:bg-red-500 transition text-sm"
  >
    Sign in
  </button>

  <p className="text-xs text-center text-gray-500">
    Don’t have an account?{" "}
    <Link
      to="/register"
      className="text-red-400 font-medium hover:underline"
    >
      Create one
    </Link>
  </p>

</div>
          </form>

        </div>
      </div>
    </div>
  );
};

export default Login;