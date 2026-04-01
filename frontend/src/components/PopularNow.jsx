import React from "react";

const books = [
  {
    id: 1,
    title: "1984",
    author: "George Orwell",
    image: "/images/book1.jpg",
  },
  {
    id: 2,
    title: "Agua Viva",
    author: "Clarice Lispector",
    image: "/images/book8.jpg",
  },
  {
    id: 3,
    title: "Gianni's Room",
    author: "James Baldwin",
    image: "/images/book9.jpg",
  },
  {
    id: 4,
    title: "Norwegian Wood",
    author: "Haruki Murakami",
    image: "/images/book11.jpg",
  },
  {
    id: 5,
    title: "Colson Whitehead",
    author: "The Nickel Boys",
    image: "/images/book5.jpg",
  },
  {
    id: 6,
    title: "Begin Again",
    author: "Jenny Lynne Morrison",
    image: "/images/book6.jpg",
  },
];

function PopularNow() {
  return (
    <div className="mt-10">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-[#D34F4E]">Popular Now</h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6">
        {books.map((book) => (
          <div
            key={book.id}
            className="bg-white rounded-xl shadow-md p-3 hover:shadow-lg transition"
          >
            <img
              src={book.image}
              alt={book.title}
              className="w-full h-52 object-cover rounded-md"
            />
            <h3 className="mt-3 font-semibold text-sm">{book.title}</h3>
            <p className="text-gray-500 text-xs">{book.author}</p>
            <div className="inline-flex  bg-[#D34F4E] mt-2 text-white text-sm font-medium px-8 rounded-sm  hover:bg-black">Borrow</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PopularNow;