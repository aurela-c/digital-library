import { useParams, Link, useLocation } from "react-router-dom";
import { useEffect, useMemo } from "react";
import { books } from "../data/books";
import HomeNavbar from "../components/HomeNavbar";
import Footer from "../components/Footer";
import PageContainer from "../components/layout/PageContainer";
import {
  bookTileCard,
  bookTileImage,
  bookTileTitle,
  bookTileAuthor,
} from "../components/layout/BookCardStyles";

export default function CategoryBooks() {
  const { category } = useParams();
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const normalizedCategory = category?.toLowerCase();

  const filteredBooks = useMemo(() => {
    return books.filter(
      (book) => book.category.toLowerCase() === normalizedCategory
    );
  }, [normalizedCategory]);

  const professorPicks = {
    literature: 3,
  };

  const professorBook = filteredBooks.find(
    (book) => book.id === professorPicks[normalizedCategory]
  );

  return (
    <>
      <div className="relative z-50">
        <HomeNavbar />
      </div>

      <div className="relative min-h-[200px] sm:min-h-[260px] md:h-[320px] flex items-center justify-center z-0">
        <img
          src={`/images/categories/${category}.png`}
          alt=""
          className="absolute w-full h-full object-cover"
        />

        <div className="absolute inset-0 bg-black/40" />

        <div className="relative z-10 backdrop-blur-md bg-white/10 border border-white/20 shadow-xl rounded-xl sm:rounded-2xl px-4 py-6 sm:px-8 sm:py-8 md:px-12 text-center mx-4 max-w-2xl w-full">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white capitalize break-words">
            {category} Books
          </h1>

          <p className="text-gray-200 mt-2 sm:mt-3 text-sm sm:text-base max-w-lg mx-auto">
            Explore a collection of books available in {category} and find
            titles that match your interests.
          </p>
        </div>
      </div>

      <div className="bg-[#f5efe9] py-8 sm:py-10 relative z-10">
        <PageContainer>
          {professorBook && (
            <div className="relative flex flex-col md:flex-row gap-6 md:gap-8 p-5 sm:p-8 rounded-2xl overflow-hidden shadow-xl mb-8 sm:mb-12">
              <div
                className="absolute inset-0 bg-cover bg-center blur-md scale-110"
                style={{ backgroundImage: `url(${professorBook.image})` }}
              />

              <div className="absolute inset-0 bg-black/40" />

              <div className="relative flex flex-col sm:flex-row gap-4 sm:gap-6 md:gap-8 items-center text-center sm:text-left">
                <Link
                  to={`/book/${professorBook.id}`}
                  className="shrink-0 w-36 sm:w-40 self-center sm:self-start"
                >
                  <img
                    src={professorBook.image}
                    alt=""
                    className="w-full aspect-[2/3] object-cover rounded-lg shadow-lg hover:scale-105 transition"
                  />
                </Link>

                <div className="text-white min-w-0 flex-1">
                  <h2 className="text-xs uppercase tracking-widest text-gray-200 mb-2">
                    Professor&apos;s Pick
                  </h2>

                  <h3 className="text-xl sm:text-2xl font-bold mb-2 line-clamp-2">
                    {professorBook.title}
                  </h3>

                  <p className="text-gray-200 font-medium mb-2 text-sm sm:text-base">
                    {professorBook.author}
                  </p>

                  <p className="text-gray-300 text-xs sm:text-sm line-clamp-4 sm:line-clamp-6">
                    {professorBook.description}
                  </p>
                </div>
              </div>
            </div>
          )}

          <h2 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6 capitalize">
            All {category} Books
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 lg:gap-6">
            {filteredBooks.map((book) => (
              <div key={book.id} className={bookTileCard}>
                <Link to={`/book/${book.id}`} className="block min-w-0">
                  <img
                    src={book.image}
                    alt=""
                    className={bookTileImage}
                  />

                  <h3 className={bookTileTitle}>{book.title}</h3>

                  <p className={bookTileAuthor}>{book.author}</p>
                </Link>
              </div>
            ))}
          </div>
        </PageContainer>
      </div>

      <Footer />
    </>
  );
}
