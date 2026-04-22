import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaUserCircle } from "react-icons/fa";
import { books } from "../data/books";

const HomeNavbar = () => {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = () => {
    if (!query.trim()) return;

    const foundBook = books.find(
      (book) =>
        book.title.toLowerCase().includes(query.toLowerCase()) ||
        book.author.toLowerCase().includes(query.toLowerCase())
    );

    if (foundBook) {
      navigate(`/book/${foundBook.id}`);
    } else {
      alert("Book not found");
    }
  };

  return (
    <nav className="flex justify-between items-center px-10 py-5 bg-[#f5efe9]">
      <div className="container mx-auto flex items-center justify-between px-6 py-4">

        <img src="/images/logo2.png" alt="Logo" className="h-12 w-auto" />

        <div className="hidden md:flex space-x-6 items-center">
          <Link to="/home" className="text-gray-700 hover:text-[#D34F4E] font-semibold">
            Home
          </Link>

          <div className="relative group">
            <div className="text-gray-700 hover:text-[#D34F4E] font-semibold cursor-pointer">
              Categories
            </div>

            <div className="absolute top-full left-0 w-48 bg-white rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition duration-300">
              <ul className="flex flex-col py-2">
                {[
                  "literature",
                  "technology",
                  "business",
                  "history",
                  "science",
                  "arts",
                ].map((cat) => (
                  <li key={cat}>
                    <Link
                      to={`/categories/${cat}`}
                      className="block px-4 py-2 hover:bg-gray-100 hover:text-[#D34F4E]"
                    >
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <a href="#popular-now" className="text-gray-700 hover:text-[#D34F4E] font-semibold">
            Trending
          </a>

          <Link to="/contact" className="text-gray-700 hover:text-[#D34F4E] font-semibold">
            Contact Us
          </Link>
        </div>

        <div className="flex items-center bg-white px-4 py-2 rounded-full w-96">
          <input
            type="text"
            placeholder="Search by author, title"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="bg-transparent outline-none flex-1 text-sm"
          />
        </div>


        <Link to="/profile">
          <FaUserCircle className="text-gray-700 text-3xl hover:text-[#D34F4E]" />
        </Link>

      </div>
    </nav>
  );
};

export default HomeNavbar;