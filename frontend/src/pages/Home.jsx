import React from "react";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const navigate = useNavigate();
  const name = localStorage.getItem("name") || "User";

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("name");
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-10 rounded-3xl shadow-xl max-w-lg w-full text-center">
        <h1 className="text-4xl font-bold mb-4">Welcome, {name}!</h1>
        <p className="text-gray-700 mb-8">
          Discover, borrow, and enjoy your reading journey with us.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button className="bg-blue-500 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-600 transition-colors">
            Browse Books
          </button>
          <button
            onClick={handleLogout}
            className="bg-gray-300 text-gray-800 py-3 px-6 rounded-lg font-semibold hover:bg-gray-400 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default Home;