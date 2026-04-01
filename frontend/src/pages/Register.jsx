import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";

const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:5000/register", { name, email, password });
      alert("Registered successfully!");
      navigate("/login");
    } catch (err) {
      alert(err.response?.data?.error || "Registration failed");
    }
  };

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

        
        <div className="w-full md:w-1/2  relative flex flex-col justify-center px-10 py-12">
        <Link
                   to="/"
                   className="absolute top-4 right-4 z-50 text-gray-400 hover:text-gray-600 text-2xl font-bold">
                    &times;
                    </Link>
          <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
            Create your account
          </h2>

          <form className="space-y-5" onSubmit={handleRegister}>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Name</label>
              <input
                type="text"
                placeholder="Your Name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Email</label>
              <input
                type="email"
                placeholder="example@email.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between mt-4">
              <button
                type="submit"
                className="px-6 py-2 rounded-full bg-red-400 text-white hover:bg-red-500 text-sm"
              >
                Register
              </button>

              <button>
                <Link
                  to="/login"
                  className="px-5 py-2 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm"
                >
                  Already have an account?
                </Link>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;