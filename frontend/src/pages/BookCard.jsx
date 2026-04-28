import { useState } from "react";
import { books } from "../data/books";
import { useParams } from "react-router-dom";
import API from "../services/api";

export default function BookCard() {
  const { id } = useParams();

  const [selectedBook, setSelectedBook] = useState(() => {
    return books.find((b) => b.id === Number(id)) || books[0];
  });

  const handleBorrow = async () => {
    try {
      const userId = localStorage.getItem("userId");

      if (!userId) {
        alert("You must be logged in to borrow a book.");
        return;
      }

      const res = await API.post("/borrow", {
      userId: Number(userId),
      bookId: selectedBook.id,
    });

    alert(res.data.message || "Book borrowed successfully!");

  } catch (err) {
    console.error("BORROW ERROR:", err.response?.data || err.message);
    alert(err.response?.data?.error || "Borrow failed");
  }
};

  if (!selectedBook) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5efe9]">
        <p className="text-gray-600">Loading book...</p>
      </div>
    );
  }

  return (
    <div className="bg-[#f5efe9] min-h-screen flex">
      
      <div className="flex flex-1 justify-center items-start p-16 gap-16">

        <div className="w-[305px] flex-shrink-0">
          <img
            src={selectedBook.image}
            alt={selectedBook.title}
            className="w-full shadow-[25px_10px_70px_rgba(0,0,0,0.3)] rounded-lg"
          />
        </div>

        <div className="max-w-lg leading-relaxed">
          <h1 className="text-4xl font-bold mb-2">
            {selectedBook.title}
          </h1>

          <p className="text-gray-700 font-bold mb-6">
            by {selectedBook.author}
          </p>

          <p className="text-gray-700 leading-relaxed mb-8 italic whitespace-pre-line">
            {selectedBook.description}
          </p>

          <div className="flex gap-6 mb-10 text-sm text-gray-700 font-medium">
            <div>
              <span className="font-bold text-[#D34F4E]">Year:</span> {selectedBook.year}
            </div>

            <div>
              <span className="font-bold text-[#D34F4E]">Language:</span> {selectedBook.language}
            </div>

            <div>
              <span className="font-bold text-[#D34F4E]">Pages:</span> {selectedBook.pages}
            </div>
          </div>

          <button
            onClick={handleBorrow}
            className="bg-[#D34F4E] text-white px-8 py-3 rounded-lg font-semibold hover:opacity-90 transition"
          >
            Borrow Book
          </button>
        </div>
      </div>

      <div className="w-[300px] h-screen overflow-y-auto bg-white shadow-md">
        {books.map((book) => (
          <div
            key={book.id}
            onClick={() => setSelectedBook(book)}
            className={`
                bg-[#f5efe9]
                p-3
                cursor-pointer
                transition
                border-l-4
                ${
                  selectedBook?.id === book.id
                    ? "border-[#D34F4E] bg-gray-100"
                    : "border-transparent"
                }
                hover:bg-gray-100
              `}
          >
            <img
              src={book.image}
              alt={book.title}
              className="w-full h-40 object-contain"
            />
          </div>
        ))}
      </div>

    </div>
  );
}