import { useParams, Link } from "react-router-dom";
import { books } from "../data/books";
import HomeNavbar from "../components/HomeNavbar";
import Footer from "../components/Footer";

export default function CategoryBooks() {
  const { category } = useParams();

  const filteredBooks = books.filter(
    (book) => book.category.toLowerCase() === category.toLowerCase()
  );

  const featuredBook = filteredBooks[0];

  return (
    <>
      <HomeNavbar />

      <div className="relative h-[320px] flex items-center justify-center">

        <img
          src={`/images/categories/${category}.png`}
          className="absolute w-full h-full object-cover"
        />

        <div className="absolute inset-0 bg-black/40"></div>

        <div className="relative backdrop-blur-md bg-white/10 border border-white/20 shadow-xl rounded-2xl px-12 py-8 text-center">

          <h1 className="text-4xl font-bold text-white capitalize">
            {category} Books
          </h1>

          <p className="text-gray-200 mt-3 max-w-lg">
            Explore the best books in {category}. Discover knowledge, stories,
            and ideas from the world’s most influential authors.
          </p>

        </div>
      </div>

      <div className="bg-[#f5efe9] px-6 md:px-12 py-10">

        {featuredBook && (
          <div className="relative flex gap-8 p-8 rounded-2xl overflow-hidden shadow-xl mb-12">

            <div
              className="absolute inset-0 bg-cover bg-center blur-md scale-110"
              style={{ backgroundImage: `url(${featuredBook.image})` }}
            />

            <div className="absolute inset-0 bg-black/40" />

            <div className="relative flex gap-8 items-center">

              <Link to={`/book/${featuredBook.id}`}>
                <img
                  src={featuredBook.image}
                  alt={featuredBook.title}
                  className="w-40 h-60 object-cover rounded-lg shadow-lg hover:scale-105 transition"
                />
              </Link>

              <div className="text-white max-w-xl">

                <h2 className="text-sm uppercase tracking-widest text-gray-200 mb-2">
                  Professor's pic
                </h2>

                <h3 className="text-2xl font-bold mb-2">
                  {featuredBook.title}
                </h3>

                <p className="text-gray-200 font-medium mb-2">
                  {featuredBook.author}
                </p>

                <p className="text-gray-300 text-sm leading-relaxed">
                  {featuredBook.description}
                </p>

              </div>

            </div>
          </div>
        )}

        {/* BOOK GRID */}
        <h2 className="text-xl font-bold mb-6">
          All {category} Books
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6">

          {filteredBooks.map((book) => (
            <div
              key={book.id}
              className="bg-white shadow-md p-3 hover:shadow-lg transition"
            >

              <Link to={`/book/${book.id}`}>
                <img
                  src={book.image}
                  className="w-full h-52 object-cover hover:scale-105 transition"
                />

                <h3 className="mt-3 font-semibold text-sm">
                  {book.title}
                </h3>

                <p className="text-gray-500 text-xs">
                  {book.author}
                </p>
              </Link>

            </div>
          ))}

        </div>
      </div>

      <Footer />
    </>
  );
}