import { useState } from "react";
import { books } from "../data/books";
import { useParams, Link } from "react-router-dom";
import API from "../services/api";
import PageContainer from "../components/layout/PageContainer";

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

      await API.post("/borrow", {
        bookId: String(selectedBook.id),
      });

      alert("Book borrowed successfully!");
    } catch (err) {
      console.error("BORROW ERROR:", err.response?.data || err.message);
      alert(err.response?.data?.error || "Borrow failed");
    }
  };

  if (!selectedBook) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5efe9] px-4">
        <p className="text-gray-600">Loading book...</p>
      </div>
    );
  }

  return (
    <div className="bg-[#f5efe9] min-h-screen flex flex-col xl:flex-row w-full max-w-[100vw] overflow-x-hidden">
      {/* Main detail */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 lg:gap-10 xl:gap-12 p-4 sm:p-6 lg:p-8 xl:p-10 items-start justify-center min-w-0">
        <div className="w-full max-w-[280px] sm:max-w-xs mx-auto lg:mx-0 shrink-0">
          <img
            src={selectedBook.image}
            alt={selectedBook.title}
            className="w-full rounded-lg shadow-[8px_8px_40px_rgba(0,0,0,0.2)] object-cover aspect-[2/3]"
          />
        </div>

        <div className="w-full min-w-0 max-w-2xl flex-1 leading-relaxed">
          <Link
            to="/home"
            className="inline-block text-sm text-[#D34F4E] hover:underline mb-4"
          >
            ← Back to library
          </Link>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 break-words">
            {selectedBook.title}
          </h1>

          <p className="text-gray-700 font-bold mb-4 sm:mb-6 text-sm sm:text-base">
            by {selectedBook.author}
          </p>

          <p className="text-gray-700 leading-relaxed mb-6 sm:mb-8 italic whitespace-pre-line text-sm sm:text-base">
            {selectedBook.description}
          </p>

          <div className="flex flex-wrap gap-4 sm:gap-6 mb-8 sm:mb-10 text-xs sm:text-sm text-gray-700 font-medium">
            <div>
              <span className="font-bold text-[#D34F4E]">Year:</span>{" "}
              {selectedBook.year}
            </div>
            <div>
              <span className="font-bold text-[#D34F4E]">Language:</span>{" "}
              {selectedBook.language}
            </div>
            <div>
              <span className="font-bold text-[#D34F4E]">Pages:</span>{" "}
              {selectedBook.pages}
            </div>
          </div>

          <button
            type="button"
            onClick={handleBorrow}
            className="w-full sm:w-auto min-h-[44px] px-6 sm:px-8 py-3 rounded-lg bg-[#D34F4E] text-white font-semibold hover:opacity-90 transition touch-manipulation"
          >
            Borrow Book
          </button>
        </div>
      </div>

      {/* Related / picker strip */}
      <aside className="w-full xl:w-72 shrink-0 border-t xl:border-t-0 xl:border-l border-gray-200 bg-white xl:min-h-screen xl:max-h-screen flex flex-col">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 pt-4 pb-2 xl:pt-6">
          More books
        </p>
        <div className="flex flex-row xl:flex-col gap-2 sm:gap-3 overflow-x-auto xl:overflow-y-auto overscroll-x-contain px-3 sm:px-4 pb-4 xl:pb-6 xl:px-4 max-xl:max-h-56 xl:max-h-[calc(100vh-8rem)]">
          {books.map((book) => (
            <button
              type="button"
              key={book.id}
              onClick={() => setSelectedBook(book)}
              className={`
                shrink-0 w-28 sm:w-32 xl:w-full rounded-lg overflow-hidden border-2 transition text-left
                ${
                  selectedBook?.id === book.id
                    ? "border-[#D34F4E] ring-2 ring-[#D34F4E]/20 bg-[#f5efe9]"
                    : "border-transparent hover:border-gray-200 bg-[#f5efe9]"
                }
              `}
            >
              <img
                src={book.image}
                alt=""
                className="w-full aspect-[3/4] object-contain bg-white"
              />
              <span className="block px-1.5 py-1 text-[10px] sm:text-xs font-medium line-clamp-2 text-gray-800">
                {book.title}
              </span>
            </button>
          ))}
        </div>
      </aside>
    </div>
  );
}
