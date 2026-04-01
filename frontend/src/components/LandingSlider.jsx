import { useState } from "react";

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

  return (
 <div className="mt-7 flex items-center justify-center gap-8">
  <div className="relative w-90 h-100"> 
    <img
      src="/images/foto1.png"
      alt="Book 1"
      className="w-full h-full object-cover rounded"
    />
  </div>
  <button
    onClick={prevBook}
    className="bg-white shadow rounded-full w-10 h-10 flex items-center justify-center"
  >
    ←
  </button>
  <img
    src={books[current].image}
    alt={`Book ${current + 1}`}
    className="w-54 h-86 object-cover rounded-xl shadow-lg"
  />
  <button
    onClick={nextBook}
    className="bg-white shadow rounded-full w-10 h-10 flex items-center justify-center"
  >
    →
  </button>
  <div className="relative w-90 h-100"> 
    <img
      src="/images/foto1.png"
      alt="Book 1"
      className="w-full h-full object-cover rounded"
    />
  </div>
</div>
  );
};

export default LandingSlider;