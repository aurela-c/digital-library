import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../services/api";
import PageContainer from "../components/layout/PageContainer";

const Profile = () => {
  const [user, setUser] = useState(null);
  const [borrowedBooks, setBorrowedBooks] = useState([]);
  const [activeTab, setActiveTab] = useState("borrowed");

  const [showModal, setShowModal] = useState(false);
  const [selectedBorrowId, setSelectedBorrowId] = useState(null);

  const userId = localStorage.getItem("userId");

  const storageKey = `profileImage_${userId}`;
  const [profileImage] = useState(
    localStorage.getItem(storageKey) || null
  );

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await API.get(`/auth/${userId}`);
        setUser(res.data);
      } catch (err) {
        console.error("USER ERROR:", err);
      }
    };

    const fetchBorrowed = async () => {
      try {
        const res = await API.get(`/borrow/${userId}`);
        setBorrowedBooks(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("BORROW ERROR:", err);
        setBorrowedBooks([]);
      }
    };

    if (userId) {
      fetchUser();
      fetchBorrowed();
    }
  }, [userId]);

  const handleReturn = async (id) => {
    try {
      await API.put(`/borrow/return/${id}`);
      const now = new Date().toISOString();
      setBorrowedBooks((prev) =>
        prev.map((b) => {
          if (String(b.id) !== String(id)) return b;
          return {
            ...b,
            returnDate: now,
            return_date: now,
            status: "RETURNED",
          };
        })
      );
    } catch (err) {
      console.error("RETURN ERROR:", err);
    }
  };

  const confirmReturn = (id) => {
    setSelectedBorrowId(id);
    setShowModal(true);
  };

  const today = new Date();

  const returnDateOf = (b) => b.returnDate ?? b.return_date;
  const dueDateOf = (b) => b.dueDate ?? b.due_date;

  const borrowed = Array.isArray(borrowedBooks)
    ? borrowedBooks.filter((b) => {
        const rd = returnDateOf(b);
        const dd = dueDateOf(b);
        return !rd && (!dd || new Date(dd) >= today);
      })
    : [];

  const overdue = Array.isArray(borrowedBooks)
    ? borrowedBooks.filter((b) => {
        const dd = dueDateOf(b);
        return dd && new Date(dd) < today && !returnDateOf(b);
      })
    : [];

  const returned = Array.isArray(borrowedBooks)
    ? borrowedBooks.filter((b) => !!returnDateOf(b))
    : [];

  const getBooks = () => {
    if (activeTab === "borrowed") return borrowed;
    if (activeTab === "overdue") return overdue;
    if (activeTab === "returned") return returned;
    return [];
  };

  const BorrowCard = ({ book }) => {
    const title =
      book.bookTitle || book.Book?.title || "Unknown Title";
    const author =
      book.bookAuthor || book.Book?.author || "Unknown Author";
    const image =
      book.bookImage || book.Book?.image || "/placeholder.jpg";
    const due = book.dueDate ?? book.due_date;
    const returnedAt = book.returnDate ?? book.return_date;

    return (
      <div className="relative rounded-xl overflow-hidden shadow-lg min-w-0">
        <div className="relative w-full aspect-[3/4]">
          <img
            src={image}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

          <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3 text-white">
            <h3 className="font-semibold text-xs sm:text-sm line-clamp-2">
              {title}
            </h3>

            <p className="text-[10px] sm:text-xs text-gray-300 line-clamp-1">
              {author}
            </p>

            {due && (
              <p className="text-[10px] text-gray-300 mt-0.5">
                Due: {new Date(due).toLocaleDateString()}
              </p>
            )}

            {activeTab !== "returned" && !returnedAt && (
              <button
                type="button"
                onClick={() => confirmReturn(book.id)}
                className="mt-2 w-full min-h-[40px] bg-white text-black text-xs py-2 rounded-lg font-semibold hover:bg-green-500 hover:text-white transition touch-manipulation"
              >
                Return
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f5efe9] w-full overflow-x-hidden">
      <PageContainer className="py-4 sm:py-6 lg:py-8">
        <Link
          to="/home"
          className="inline-flex items-center gap-2 mb-4 sm:mb-6 px-4 py-2.5 min-h-[44px] bg-[#D34F4E] text-white text-sm font-medium rounded-lg hover:opacity-90 transition touch-manipulation"
        >
          ← Return to Library
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          {/* PROFILE CARD */}
          <aside className="lg:col-span-4 xl:col-span-3">
            <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-lg text-center max-w-md mx-auto lg:max-w-none lg:mx-0 lg:sticky lg:top-24">
              <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-full overflow-hidden border-2 border-[#D34F4E] shrink-0">
                {profileImage ? (
                  <img
                    src={profileImage}
                    className="w-full h-full object-cover"
                    alt="profile"
                  />
                ) : (
                  <div className="w-full h-full bg-[#D34F4E] flex items-center justify-center text-white text-lg sm:text-xl font-bold">
                    {user?.username?.charAt(0) || "U"}
                  </div>
                )}
              </div>

              <h2 className="mt-3 font-bold text-base sm:text-lg break-words px-1">
                {user?.username || "Loading..."}
              </h2>

              <p className="text-gray-500 text-sm">Library Member</p>

              <div className="mt-5 sm:mt-6 space-y-2 text-xs sm:text-sm text-gray-600 text-left max-w-xs mx-auto">
                <p>Borrowed: {borrowed.length}</p>
                <p>Overdue: {overdue.length}</p>
                <p>Returned: {returned.length}</p>
              </div>
            </div>
          </aside>

          {/* MAIN */}
          <main className="lg:col-span-8 xl:col-span-9 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#D34F4E] mb-3 sm:mb-4">
              My Library
            </h1>

            <div className="flex flex-wrap gap-2 sm:gap-3 mb-5 sm:mb-6">
              {["borrowed", "overdue", "returned"].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`min-h-[44px] px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition capitalize touch-manipulation ${
                    activeTab === tab
                      ? "bg-[#D34F4E] text-white shadow"
                      : "bg-white text-gray-700 border border-gray-200 hover:border-[#D34F4E]/50"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
              {getBooks().map((item) => (
                <BorrowCard key={item.id} book={item} />
              ))}
            </div>

            {getBooks().length === 0 && (
              <p className="text-gray-500 text-sm mt-6 text-center sm:text-left">
                No books in this tab yet.
              </p>
            )}
          </main>
        </div>
      </PageContainer>

      {showModal && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
          <div
            className="bg-white p-5 sm:p-6 rounded-xl w-full max-w-sm shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="return-title"
          >
            <h2 id="return-title" className="text-lg font-bold">
              Confirm Return
            </h2>
            <p className="text-sm text-gray-500 mt-2">
              Are you sure you want to return this book?
            </p>

            <div className="flex flex-col-reverse sm:flex-row gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 min-h-[44px] bg-gray-200 py-2 rounded-lg font-medium touch-manipulation"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => {
                  handleReturn(selectedBorrowId);
                  setShowModal(false);
                }}
                className="flex-1 min-h-[44px] bg-black text-white py-2 rounded-lg font-medium touch-manipulation"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
