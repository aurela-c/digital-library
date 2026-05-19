import { Link } from "react-router-dom";
import { books } from "../data/books";
import API from "../services/api";
import PageContainer from "./layout/PageContainer";
import {
  bookTileCard,
  bookTileImage,
  bookTileTitle,
  bookTileAuthor,
  bookBorrowBtn,
} from "./layout/BookCardStyles";

function PopularNow() {
  const featuredBooks = books.filter((book) => book.featured);

  const handleBorrow = async (book) => {
    const userId = localStorage.getItem("userId");

    if (!userId) {
      alert("Please log in to borrow books.");
      return;
    }

    try {
      await API.post("/borrow", {
        bookId: String(book.id),
      });
      alert(`You borrowed "${book.title}"!`);
    } catch (err) {
      console.error(err);
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        "Failed to borrow book.";
      alert(msg);
    }
  };

  return (
    <section id="popular-now" className="mt-8 sm:mt-10">
      <PageContainer>
        <h2 className="text-xl sm:text-2xl font-bold text-[#D34F4E] mb-4 sm:mb-6">
          Popular Now
        </h2>

        {/* ONLY CHANGE: max 5 columns */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">

          {featuredBooks.slice(0, 5).map((book) => (
            <div key={book.id} className={bookTileCard}>
              <Link to={`/book/${book.id}`} className="block min-w-0">
                <img
                  src={book.image}
                  alt={book.title}
                  className={bookTileImage}
                />

                <h3 className={bookTileTitle}>{book.title}</h3>

                <p className={bookTileAuthor}>{book.author}</p>
              </Link>

              <button
                type="button"
                onClick={() => handleBorrow(book)}
                className={bookBorrowBtn}
              >
                Borrow
              </button>
            </div>
          ))}

        </div>
      </PageContainer>
    </section>
  );
}

export default PopularNow;