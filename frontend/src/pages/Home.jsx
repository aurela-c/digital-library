import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

const books = [
  { image: "/images/book1.jpg" },
  { image: "/images/book2.jpg" },
  { image: "/images/book3.jpg" },
  { image: "/images/book4.jpg" },
  { image: "/images/book5.jpg" },
  { image: "/images/book6.jpg" },
  { image: "/images/book7.jpg" }
];

const Home = () => {
  const navigate = useNavigate();
  const name = localStorage.getItem("name") || "User";

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("name");
    navigate("/login");
  };

 
  const [currentIndex, setCurrentIndex] = useState(0);
  const sliderRef = useRef(null);

  
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % books.length);
    }, 3000); 
    return () => clearInterval(interval);
  }, []);

  
  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + books.length) % books.length);
  };

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % books.length);
  };

  return (
    <div className="min-h-screen bg-[#f5efe9]">
      <Navbar />

     
      <div className="text-center mt-20 px-6">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Welcome, {name}!
        </h1>
        <p className="text-gray-700 mb-8">
          Discover, borrow, and enjoy your reading journey with us.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
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

     
      <div className="relative mx-auto w-full max-w-6xl overflow-hidden py-10">
        <div className="flex gap-6 transition-transform duration-500"
             style={{ transform: `translateX(-${currentIndex * 15}%)` }}
             ref={sliderRef}
        >
          {books.map((book, index) => (
            <div key={index} className="flex-none w-64 h-96 rounded-xl overflow-hidden shadow-lg">
              <img
                src={book.image}
                alt={`Book ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>

       
        <button
          onClick={prevSlide}
          className="absolute left-4 top-1/2 -translate-y-1/2 bg-white shadow rounded-full w-10 h-10 flex items-center justify-center"
        >
          ←
        </button>
        <button
          onClick={nextSlide}
          className="absolute right-4 top-1/2 -translate-y-1/2 bg-white shadow rounded-full w-10 h-10 flex items-center justify-center"
        >
          →
        </button>
      </div>
    </div>
  );
};

export default Home;