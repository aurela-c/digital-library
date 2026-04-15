import React from "react";
import { Link } from "react-router-dom";
import { books } from "../data/books";

function PopularNow() {
  const handleBorrow = async (book) => {
    const userId = localStorage.getItem("userId");

    if (!userId) {
      alert("Please log in to borrow books.");
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/api/borrow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, bookId: book.id }),
      });

      const data = await res.json();

      if (res.ok) {
        alert(`You borrowed "${book.title}"!`);
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to borrow book.");
    }
  };

  return (
    <div className="mt-10">
      <h2 className="text-2xl font-bold text-[#D34F4E] mb-6">
        Popular Now
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6">
        {books.map((book) => (
          <div
            key={book.id}
            className="bg-white  shadow-md p-3 hover:shadow-lg transition"
          >
            <Link to={`/book/${book.id}`}>
              <img
                src={book.image}
                alt={book.title}
                className="w-full h-52 object-cover  hover:scale-105 transition"
              />

              <h3 className="mt-3 font-semibold text-sm">
                {book.title}
              </h3>

              <p className="text-gray-500 text-xs">
                {book.author}
              </p>
            </Link>

            <div
              onClick={() => handleBorrow(book)}
              className="inline-flex bg-[#D34F4E] mt-2 text-white text-sm font-medium px-8 rounded-sm hover:bg-black transition cursor-pointer"
            >
              Borrow
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PopularNow;