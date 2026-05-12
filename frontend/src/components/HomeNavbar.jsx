import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaUserCircle, FaBars, FaTimes } from "react-icons/fa";
import { books } from "../data/books";
import PageContainer from "./layout/PageContainer";

const categoryLinks = [
  "literature",
  "technology",
  "business",
  "history",
  "science",
  "arts",
];

const HomeNavbar = () => {
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const closeMenu = () => setMenuOpen(false);

  const handleSearch = () => {
    if (!query.trim()) return;

    const foundBook = books.find(
      (book) =>
        book.title.toLowerCase().includes(query.toLowerCase()) ||
        book.author.toLowerCase().includes(query.toLowerCase())
    );

    if (foundBook) {
      navigate(`/book/${foundBook.id}`);
      closeMenu();
    } else {
      alert("Book not found");
    }
  };

  const navLinkClass =
    "block py-2.5 px-2 text-gray-700 hover:text-[#D34F4E] font-semibold text-sm sm:text-base border-b border-gray-100 last:border-0 md:border-0 md:inline md:py-0";

  return (
    <nav className="sticky top-0 z-50 bg-[#f5efe9]/95 backdrop-blur-sm border-b border-gray-200/80 shadow-sm">
      <PageContainer className="py-3 sm:py-4">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <div className="flex w-full md:w-auto flex-1 md:flex-initial items-center justify-between gap-3">
            <Link to="/home" className="shrink-0" onClick={closeMenu}>
              <img
                src="/images/logo2.png"
                alt="Logo"
                className="h-10 sm:h-12 w-auto max-h-12 object-contain"
              />
            </Link>

            <button
              type="button"
              className="md:hidden inline-flex items-center justify-center rounded-lg p-2 text-gray-700 hover:bg-white/80 border border-gray-200"
              aria-expanded={menuOpen}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMenuOpen((o) => !o)}
            >
              {menuOpen ? (
                <FaTimes className="text-xl" />
              ) : (
                <FaBars className="text-xl" />
              )}
            </button>
          </div>

          <div className="order-3 md:order-none w-full md:flex-1 md:min-w-0 md:max-w-md lg:max-w-xl">
            <div className="flex items-center bg-white px-3 sm:px-4 py-2 rounded-full border border-gray-200 shadow-sm w-full min-w-0">
              <input
                type="text"
                placeholder="Search by author or title"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="bg-transparent outline-none flex-1 text-sm min-w-0 placeholder:text-gray-400"
              />
              <button
                type="button"
                onClick={handleSearch}
                className="shrink-0 ml-2 text-xs sm:text-sm font-semibold text-[#D34F4E] hover:text-black"
              >
                Go
              </button>
            </div>
          </div>

          <div className="hidden md:flex items-center shrink-0">
            <Link
              to="/profile"
              className="text-gray-700 hover:text-[#D34F4E] p-1"
              aria-label="Profile"
            >
              <FaUserCircle className="text-3xl" />
            </Link>
          </div>
        </div>

        <div className="hidden md:flex flex-wrap items-center gap-x-6 gap-y-2 mt-3 pt-3 border-t border-gray-200/60">
          <Link
            to="/home"
            className="text-gray-700 hover:text-[#D34F4E] font-semibold text-sm"
          >
            Home
          </Link>

          <div className="relative group">
            <span className="text-gray-700 hover:text-[#D34F4E] font-semibold text-sm cursor-default">
              Categories
            </span>
            <div className="absolute top-full left-0 pt-1 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition z-30">
              <ul className="bg-white rounded-lg shadow-lg border border-gray-100 py-2">
                {categoryLinks.map((cat) => (
                  <li key={cat}>
                    <Link
                      to={`/categories/${cat}`}
                      className="block px-4 py-2 text-sm hover:bg-gray-50 hover:text-[#D34F4E]"
                    >
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <a
            href="#popular-now"
            className="text-gray-700 hover:text-[#D34F4E] font-semibold text-sm"
          >
            Trending
          </a>

          <Link
            to="/contact"
            className="text-gray-700 hover:text-[#D34F4E] font-semibold text-sm"
          >
            Contact Us
          </Link>
        </div>

        {menuOpen && (
          <div className="md:hidden mt-3 pt-3 border-t border-gray-200">
            <div className="flex flex-col rounded-xl bg-white border border-gray-100 shadow-md overflow-hidden">
              <Link to="/home" className={navLinkClass} onClick={closeMenu}>
                Home
              </Link>
              <span className="px-2 py-2 text-xs font-bold text-gray-400 uppercase tracking-wide">
                Categories
              </span>
              {categoryLinks.map((cat) => (
                <Link
                  key={cat}
                  to={`/categories/${cat}`}
                  className={navLinkClass}
                  onClick={closeMenu}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </Link>
              ))}
              <a
                href="#popular-now"
                className={navLinkClass}
                onClick={closeMenu}
              >
                Trending
              </a>
              <Link to="/contact" className={navLinkClass} onClick={closeMenu}>
                Contact Us
              </Link>
              <Link
                to="/profile"
                className="flex items-center gap-2 py-3 px-2 text-[#D34F4E] font-semibold border-t border-gray-100"
                onClick={closeMenu}
              >
                <FaUserCircle className="text-2xl" />
                Profile
              </Link>
            </div>
          </div>
        )}
      </PageContainer>
    </nav>
  );
};

export default HomeNavbar;
