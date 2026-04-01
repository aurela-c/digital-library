import { useState } from "react";

const books = [
  {
    image: "/images/book1.jpg"
  },
  {
    image: "/images/book2.jpg"
  },
  {
    image: "/images/book3.jpg"
  },
  {
    image: "/images/book4.jpg"
  }
];

const BookSlider = () => {

  const [current, setCurrent] = useState(0);

  const nextBook = () => {
    setCurrent((prev) => (prev + 1) % books.length);
  };

  const prevBook = () => {
    setCurrent((prev) => (prev - 1 + books.length) % books.length);
  };

  return (
    <div className="flex items-center justify-center gap-10 mt-16">

      <button
        onClick={prevBook}
        className="bg-white shadow rounded-full w-10 h-10"
      >
        ←
      </button>

      <div className="text-center">

        <img
          src={books[current].image}
          alt={books[current].title}
          className="w-64 h-96 object-cover rounded-xl shadow-lg"
        />

        <h3 className="mt-3 font-semibold">
          {books[current].title}
        </h3>

        <p className="text-gray-500 text-sm">
          {books[current].author}
        </p>

      </div>

      <button
        onClick={nextBook}
        className="bg-white shadow rounded-full w-10 h-10"
      >
      </button>

    </div>
  );
};

export default BookSlider;