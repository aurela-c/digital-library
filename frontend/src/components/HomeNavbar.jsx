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
  const [catOpen, setCatOpen] = useState(false); 
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

  const navLink =
    "text-gray-700 hover:text-[#D34F4E] font-medium text-sm transition";

  return (
    <nav className="sticky top-0 z-50 bg-[#f5efe9]/95 backdrop-blur-md border-b border-gray-200/70">
      <PageContainer className="py-3">

        <div className="flex items-center justify-between gap-6">

          <Link to="/home" className="shrink-0">
            <img
              src="/images/logo2.png"
              alt="Logo"
              className="h-10 sm:h-11 w-auto object-contain"
            />
          </Link>

          <div className="hidden md:flex items-center gap-6">

            <Link to="/home" className={navLink}>Home</Link>

            <div
              className="relative"
              onMouseEnter={() => setCatOpen(true)}
              onMouseLeave={() => setCatOpen(false)}
            >
              <span className={`${navLink} cursor-pointer`}>
                Categories
              </span>

              {catOpen && (
                <div className="absolute left-0 top-full pt-1 bg-white shadow-lg border rounded-md py-2 w-44 z-50">
                  {categoryLinks.map((cat) => (
                    <Link
                      key={cat}
                      to={`/categories/${cat}`}
                      className="block px-4 py-2 text-sm hover:text-[#D34F4E] hover:bg-gray-50"
                    >
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <a href="#popular-now" className={navLink}>
              Trending
            </a>

            <Link to="/contact" className={navLink}>
              Contact Us
            </Link>
          </div>

          <div className="flex-1 max-w-md hidden md:block">
            <input
              type="text"
              placeholder="Search..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="w-full bg-white px-4 py-2 rounded-full border border-gray-200 outline-none text-sm placeholder-gray-400"
            />
          </div>


          <Link to="/profile" className="hidden md:block">
            <FaUserCircle className="text-3xl text-gray-700 hover:text-[#D34F4E]" />
          </Link>


          <button
            className="md:hidden text-2xl text-gray-700"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden mt-3 flex flex-col gap-3 bg-white border rounded-lg p-4">
            <Link to="/home" onClick={closeMenu} className={navLink}>Home</Link>

            <span className="text-xs font-bold text-gray-400">
              Categories
            </span>

            {categoryLinks.map((cat) => (
              <Link
                key={cat}
                to={`/categories/${cat}`}
                onClick={closeMenu}
                className={navLink}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </Link>
            ))}

            <a href="#popular-now" onClick={closeMenu} className={navLink}>
              Trending
            </a>

            <Link to="/contact" onClick={closeMenu} className={navLink}>
              Contact Us
            </Link>

            <Link to="/profile" onClick={closeMenu} className={navLink}>
              Profile
            </Link>
          </div>
        )}
      </PageContainer>
    </nav>
  );
};

export default HomeNavbar;