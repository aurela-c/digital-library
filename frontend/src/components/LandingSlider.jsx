import { useState, useEffect } from "react";

const books = [
  { image: "/images/book1.jpg" },
  { image: "/images/book2.jpg" },
  { image: "/images/book3.jpg" },
  { image: "/images/book4.jpg" }
];

const LandingSlider = () => {
  const [current, setCurrent] = useState(0);

  const nextBook = () => {
    setCurrent((prev) => (prev + 1) % books.length);
  };

  const prevBook = () => {
    setCurrent((prev) => (prev - 1 + books.length) % books.length);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      nextBook();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mt-8 flex flex-col md:flex-row items-center justify-center gap-6 md:gap-8 px-4">

      {/* Left Image (hidden on small screens for cleaner UI) */}
      <div className="hidden md:block relative w-64 lg:w-80 h-80 lg:h-96">
        <img
          src="/images/foto1.png"
          alt="Book 1"
          className="w-full h-full object-cover rounded"
        />
      </div>

      <div className="flex items-center gap-4 sm:gap-6">

        <button
          onClick={prevBook}
          className="bg-white shadow rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center"
        >
          ←
        </button>

        <img
          src={books[current].image}
          alt={`Book ${current + 1}`}
          className="w-40 sm:w-52 md:w-56 h-60 sm:h-72 md:h-80 object-cover rounded-xl shadow-lg transition duration-500"
        />

        <button
          onClick={nextBook}
          className="bg-white shadow rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center"
        >
          →
        </button>
      </div>

      <div className="hidden md:block relative w-64 lg:w-80 h-80 lg:h-96">
        <img
          src="/images/foto3.png"
          alt="Book 2"
          className="w-full h-full object-cover rounded"
        />
      </div>

    </div>
  );
};

export default LandingSlider;