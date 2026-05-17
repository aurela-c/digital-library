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
    <div className="mt-10 flex items-center justify-center px-4">

      <div className="flex items-center justify-center gap-3 sm:gap-5 md:gap-8 w-full">

        {/* Left side image */}
        <div className="hidden md:block relative w-64 lg:w-80 h-80 lg:h-96">
          <img
            src="/images/foto1.png"
            alt="Book 1"
            className="w-full h-full object-cover rounded"
          />
        </div>

        {/* Slider */}
        <div className="flex items-center gap-3 sm:gap-5 md:gap-6">

          <button
            onClick={prevBook}
            className="bg-white shadow rounded-full w-10 h-10 flex items-center justify-center hover:scale-105 transition"
          >
            ←
          </button>

          {/* MAIN IMAGE (responsive big upgrade) */}
          <img
            src={books[current].image}
            alt={`Book ${current + 1}`}
            className="
              object-cover rounded-xl shadow-lg transition duration-500

              w-[75vw] h-[55vh]   /* 👈 MOBILE: BIG FULL FOCUS */
              max-w-[420px] max-h-[520px]

              sm:w-72 sm:h-96
              md:w-56 md:h-80
              lg:w-64 lg:h-96
            "
          />

          <button
            onClick={nextBook}
            className="bg-white shadow rounded-full w-10 h-10 flex items-center justify-center hover:scale-105 transition"
          >
            →
          </button>

        </div>

        {/* Right side image */}
        <div className="hidden md:block relative w-64 lg:w-80 h-80 lg:h-96">
          <img
            src="/images/foto3.png"
            alt="Book 2"
            className="w-full h-full object-cover rounded"
          />
        </div>

      </div>
    </div>
  );
};

export default LandingSlider;