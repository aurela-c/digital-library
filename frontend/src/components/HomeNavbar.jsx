import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FaUserCircle, FaBars, FaTimes, FaSearch } from "react-icons/fa";
import { books } from "../data/books";
import { getBooks } from "../services/api";
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
  const [catalog, setCatalog] = useState(books);
  const [menuOpen, setMenuOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const navigate = useNavigate();

  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    if (!localStorage.getItem("accessToken")) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await getBooks();
        const apiList = Array.isArray(res.data) ? res.data : [];
        if (cancelled || apiList.length === 0) return;

        const byId = new Map(books.map((b) => [String(b.id), b]));
        for (const b of apiList) {
          const id = String(b.id);
          if (!byId.has(id)) {
            byId.set(id, {
              id: b.id,
              title: b.title || "",
              author: b.author || "",
              category: b.category ?? b.categoryId ?? "",
            });
          }
        }
        setCatalog([...byId.values()]);
      } catch {
        /* static catalog only */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSearch = (e) => {
    e?.preventDefault?.();

    const q = query.trim().toLowerCase();
    if (!q) {
      toast.info("Type a book title or author to search.");
      return;
    }

    const foundBook = catalog.find((book) => {
      const title = String(book.title || "").toLowerCase();
      const author = String(book.author || "").toLowerCase();
      const category = String(book.category || "").toLowerCase();
      return title.includes(q) || author.includes(q) || category.includes(q);
    });

    if (foundBook) {
      navigate(`/book/${foundBook.id}`);
      setQuery("");
      closeMenu();
    } else {
      toast.info("No matching book found.");
    }
  };

  const navLink =
    "block rounded-xl px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-[#f5efe9] hover:text-[#D34F4E] md:inline md:rounded-none md:px-0 md:py-0 md:hover:bg-transparent";

  const desktopNavLink =
    "text-gray-700 hover:text-[#D34F4E] font-medium text-sm transition";

  const SearchField = ({ compact = false }) => (
    <form
      className="group relative w-full min-w-0"
      onSubmit={handleSearch}
      role="search"
    >
      <FaSearch
        className={`pointer-events-none absolute top-1/2 z-[1] -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-[#D34F4E] ${
          compact ? "left-3 text-xs" : "left-4 text-sm"
        }`}
        aria-hidden
      />
      <input
        type="text"
        enterKeyHint="search"
        autoComplete="off"
        placeholder={compact ? "Search…" : "Search by title or author…"}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className={
          compact
            ? "relative z-0 w-full rounded-xl border border-gray-200/80 bg-white py-2 pl-9 pr-11 text-sm text-gray-800 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-[#D34F4E]/40 focus:ring-2 focus:ring-[#D34F4E]/15"
            : "relative z-0 w-full rounded-2xl border border-gray-200/80 bg-white/90 py-2.5 pl-11 pr-24 text-sm text-gray-800 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-[#D34F4E]/40 focus:bg-white focus:ring-4 focus:ring-[#D34F4E]/10"
        }
        aria-label="Search books"
      />
      <button
        type="submit"
        className={
          compact
            ? "absolute right-1 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg bg-[#D34F4E] text-white shadow-sm transition hover:bg-[#c04544] active:scale-95"
            : "absolute right-1.5 top-1/2 z-10 flex h-8 -translate-y-1/2 items-center gap-1.5 rounded-xl bg-[#D34F4E] px-3.5 text-xs font-semibold text-white shadow-md shadow-[#D34F4E]/25 transition hover:bg-[#c04544] active:scale-[0.98]"
        }
        aria-label="Search"
      >
        <FaSearch className="text-[10px]" />
        {!compact && <span className="hidden sm:inline">Search</span>}
      </button>
    </form>
  );

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200/70 bg-[#f5efe9]/95 backdrop-blur-md">
      <PageContainer className="py-3">
        {/* Main bar: logo + search (mobile) + desktop nav + burger */}
        <div className="flex items-center gap-2 sm:gap-3 md:gap-6">
          <Link to="/home" className="shrink-0">
            <img
              src="/images/logo2.png"
              alt="Logo"
              className="h-9 w-auto object-contain sm:h-10 md:h-11"
            />
          </Link>

          {/* Mobile search — always beside logo, not in burger menu */}
          <div className="min-w-0 flex-1 md:hidden">
            <SearchField compact />
          </div>

          {/* Desktop navigation */}
          <div className="hidden items-center gap-6 md:flex">
            <Link to="/home" className={desktopNavLink}>
              Home
            </Link>

            <div
              className="relative"
              onMouseEnter={() => setCatOpen(true)}
              onMouseLeave={() => setCatOpen(false)}
            >
              <span className={`${desktopNavLink} cursor-pointer`}>
                Categories
              </span>

              {catOpen && (
                <div className="absolute left-0 top-full z-50 w-44 rounded-md border bg-white py-2 pt-1 shadow-lg">
                  {categoryLinks.map((cat) => (
                    <Link
                      key={cat}
                      to={`/categories/${cat}`}
                      className="block px-4 py-2 text-sm hover:bg-gray-50 hover:text-[#D34F4E]"
                    >
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <a href="#popular-now" className={desktopNavLink}>
              Trending
            </a>

            <Link to="/contact" className={desktopNavLink}>
              Contact Us
            </Link>
          </div>

          {/* Desktop search */}
          <div className="hidden max-w-lg flex-1 md:block">
            <SearchField />
          </div>

          <Link to="/profile" className="hidden shrink-0 md:block">
            <FaUserCircle className="text-3xl text-gray-700 transition hover:text-[#D34F4E]" />
          </Link>

          {/* Mobile: profile + burger */}
          <div className="flex shrink-0 items-center gap-1.5 md:hidden">
            <Link
              to="/profile"
              className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-700 transition hover:bg-white/80 hover:text-[#D34F4E]"
              aria-label="Profile"
            >
              <FaUserCircle className="text-2xl" />
            </Link>

            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              className={`flex h-10 w-10 items-center justify-center rounded-xl border transition active:scale-95 ${
                menuOpen
                  ? "border-[#D34F4E]/35 bg-[#D34F4E] text-white shadow-md shadow-[#D34F4E]/25"
                  : "border-gray-200/90 bg-white text-gray-700 shadow-sm hover:border-[#D34F4E]/25 hover:text-[#D34F4E]"
              }`}
            >
              {menuOpen ? (
                <FaTimes className="text-lg" />
              ) : (
                <FaBars className="text-lg" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu — navigation only (no search) */}
        <div
          className={`grid transition-all duration-300 ease-out md:hidden ${
            menuOpen
              ? "mt-3 grid-rows-[1fr] opacity-100"
              : "mt-0 grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden">
            <nav
              className="flex flex-col gap-0.5 rounded-2xl border border-gray-200/80 bg-white p-2 shadow-lg shadow-gray-200/50 ring-1 ring-black/[0.04]"
              aria-label="Mobile navigation"
            >
              <Link to="/home" onClick={closeMenu} className={navLink}>
                Home
              </Link>

              <p className="px-4 pb-1 pt-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                Categories
              </p>

              {categoryLinks.map((cat) => (
                <Link
                  key={cat}
                  to={`/categories/${cat}`}
                  onClick={closeMenu}
                  className={`${navLink} pl-6`}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </Link>
              ))}

              <div className="my-1 h-px bg-gray-100" />

              <a href="#popular-now" onClick={closeMenu} className={navLink}>
                Trending
              </a>

              <Link to="/contact" onClick={closeMenu} className={navLink}>
                Contact Us
              </Link>
            </nav>
          </div>
        </div>
      </PageContainer>
    </nav>
  );
};

export default HomeNavbar;
