import { useState } from "react";
import { books } from "../data/books";
import { useParams, Link } from "react-router-dom";
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

      await API.post("/borrow", {
        bookId: String(selectedBook.id),
      });

      alert("Book borrowed successfully!");
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Borrow failed");
    }
  };

  const descriptionParagraphs = selectedBook.description
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const metaRows = [
    [
      { label: "Release Date", value: selectedBook.year },
      { label: "Language", value: selectedBook.language },
      { label: "Format", value: "Paperback" },
    ],
    [
      { label: "Category", value: selectedBook.category || "Literature" },
      { label: "Pages", value: selectedBook.pages },
      { label: "Availability", value: "In library" },
    ],
  ];

  return (
    <div className="h-screen bg-[#f5efe9] flex overflow-hidden">

      {/* LEFT — cover + details side-by-side (fixed, no page scroll) */}
      <div className="flex-1 min-w-0 h-full overflow-hidden flex flex-col sm:flex-row items-start gap-6 lg:gap-10 px-6 sm:px-10 lg:px-14 py-8 lg:py-10">

        {/* Cover */}
        <div className="shrink-0 w-full sm:w-auto flex flex-col items-center sm:items-start">
          <div className="relative flex justify-center w-full">
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[115%] aspect-square rounded-full bg-[#ebe3d9] pointer-events-none"
              aria-hidden
            />
            <img
              src={selectedBook.image}
              alt={selectedBook.title}
              className="relative z-10 w-full max-w-[280px] sm:max-w-none sm:w-[280px] lg:w-[340px] xl:w-[360px] aspect-[3/4] object-cover shadow-[0_10px_32px_rgba(0,0,0,0.12)]"
            />
          </div>
        </div>

        {/* Details — beside cover */}
        <div className="flex-1 min-w-0 max-w-2xl lg:max-w-3xl h-full overflow-hidden flex flex-col">
          <Link
            to="/home"
            className="text-xs tracking-wide text-[#D34F4E] transition shrink-0"
          >
            ← Back to library
          </Link>

          <h1 className="mt-4 text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-gray-900 leading-snug tracking-tight shrink-0">
            {selectedBook.title}
          </h1>

          <p className="mt-2 text-xs font-medium tracking-[0.15em] text-gray-800 uppercase shrink-0">
            by {selectedBook.author}
          </p>

          <div className="mt-4 space-y-3 text-gray-700 leading-relaxed overflow-hidden flex-1 min-h-0">
            {descriptionParagraphs.map((paragraph, i) => (
              <p
                key={i}
                className={`text-sm lg:text-base leading-relaxed ${
                  i === 0 ? "font-serif italic text-gray-800" : "font-serif"
                }`}
              >
                {paragraph}
              </p>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-[#e0d5ca] grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 shrink-0">
            {metaRows.flat().map((item) => (
              <div key={item.label}>
                <p className="text-xs font-bold text-[#D34F4E]">{item.label}</p>
                <p className="mt-0.5 text-xs text-gray-600 capitalize">
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 shrink-0">
            <button
              type="button"
              onClick={handleBorrow}
              className="px-7 py-2.5 rounded-lg bg-[#D34F4E] text-white text-sm font-semibold tracking-wide shadow-sm hover:opacity-90 transition"
            >
              Borrow Book
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT — more books  */}
      <aside className="w-[180px] lg:w-[200px] xl:w-[220px] shrink-0 h-screen bg-[#f5efe9] border-l border-[#e0d5ca] flex flex-col overflow-hidden">
        <div className="px-4 pt-5 pb-2 shrink-0">
          <p className="text-[10px] font-semibold tracking-[0.18em] text-gray-500 uppercase">
            More books
          </p>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden py-2 px-2 pb-6">
          {books.map((book) => {
            const isActive = selectedBook?.id === book.id;

            return (
              <button
                key={book.id}
                type="button"
                onClick={() => setSelectedBook(book)}
                className={`
                  relative w-full flex items-center justify-center p-2 transition-colors
                  ${isActive ? "bg-[#e8ddd3]" : "hover:bg-[#ebe3d9]/80"}
                `}
                aria-label={book.title}
                aria-current={isActive ? "true" : undefined}
              >
                <div
                  className={`absolute left-0 top-0 bottom-0 w-[4px] ${
                    isActive ? "bg-[#D34F4E]" : "bg-transparent"
                  }`}
                />
                <img
                  src={book.image}
                  alt=""
                  className="w-[85%] max-w-[140px] aspect-[3/4] object-cover shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
                />
              </button>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
