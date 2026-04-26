import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

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
        const res = await fetch(
          `http://localhost:5000/api/v1/auth/${userId}`
        );

        if (!res.ok) throw new Error("User fetch failed");

        const data = await res.json();
        setUser(data);
      } catch (err) {
        console.error("USER ERROR:", err);
      }
    };

    const fetchBorrowed = async () => {
      try {
        const res = await fetch(
          `http://localhost:5000/api/v1/borrow/${userId}`
        );

        if (!res.ok) throw new Error("Borrow fetch failed");

        const data = await res.json();

        
        setBorrowedBooks(Array.isArray(data) ? data : []);
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
      await fetch(
        `http://localhost:5000/api/v1/borrow/return/${id}`,
        {
          method: "PUT",
        }
      );

      setBorrowedBooks((prev) =>
        prev.map((b) =>
          b.id === id
            ? { ...b, return_date: new Date(), status: "returned" }
            : b
        )
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

  const borrowed = Array.isArray(borrowedBooks)
    ? borrowedBooks.filter(
        (b) =>
          !b.return_date &&
          (!b.due_date || new Date(b.due_date) >= today)
      )
    : [];

  const overdue = Array.isArray(borrowedBooks)
    ? borrowedBooks.filter(
        (b) =>
          b.due_date &&
          new Date(b.due_date) < today &&
          !b.return_date
      )
    : [];

  const returned = Array.isArray(borrowedBooks)
    ? borrowedBooks.filter((b) => b.return_date)
    : [];

  const getBooks = () => {
    if (activeTab === "borrowed") return borrowed;
    if (activeTab === "overdue") return overdue;
    if (activeTab === "returned") return returned;
    return [];
  };

  const BookCard = ({ book }) => (
    <div className="relative group rounded-xl overflow-hidden shadow-lg hover:scale-[1.02] transition">

      <img
        src={book.Book?.image || "/placeholder.jpg"}
        className="w-full h-[320px] object-cover"
        alt="book"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>

      <div className="absolute bottom-0 p-3 text-white w-full">

        <h3 className="font-semibold text-sm">
          {book.Book?.title || "Unknown Title"}
        </h3>

        <p className="text-xs text-gray-300">
          {book.Book?.author || "Unknown Author"}
        </p>

        {book.due_date && (
          <p className="text-[11px] text-gray-300 mt-1">
            Due: {new Date(book.due_date).toLocaleDateString()}
          </p>
        )}

        {activeTab !== "returned" && !book.return_date && (
          <button
            onClick={() => confirmReturn(book.id)}
            className="mt-2 w-full bg-white text-black text-xs py-2 rounded-lg font-semibold hover:bg-green-500 hover:text-white transition"
          >
            Return
          </button>
        )}

      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f5efe9] p-6">

      <Link
        to="/home"
        className="inline-block mb-6 px-4 py-2 bg-[#D34F4E] text-white rounded-lg"
      >
        ← Return to Library
      </Link>

      <div className="grid md:grid-cols-4 gap-6">

        {/* PROFILE CARD */}
        <div className="bg-white p-6 rounded-2xl shadow-lg text-center h-fit">

          <div className="w-24 h-24 mx-auto rounded-full overflow-hidden border-2 border-[#D34F4E]">
            {profileImage ? (
              <img
                src={profileImage}
                className="w-full h-full object-cover"
                alt="profile"
              />
            ) : (
              <div className="w-full h-full bg-[#D34F4E] flex items-center justify-center text-white text-xl font-bold">
                {user?.username?.charAt(0) || "U"}
              </div>
            )}
          </div>

          <h2 className="mt-3 font-bold text-lg">
            {user?.username || "Loading..."}
          </h2>

          <p className="text-gray-500 text-sm">Library Member</p>

          <div className="mt-6 space-y-2 text-sm text-gray-600">
            <p>Borrowed: {borrowed.length}</p>
            <p>Overdue: {overdue.length}</p>
            <p>Returned: {returned.length}</p>
          </div>

        </div>

        {/* MAIN */}
        <div className="md:col-span-3">

          <h1 className="text-3xl font-bold text-[#D34F4E] mb-4">
            My Library
          </h1>

          <div className="flex gap-3 mb-6">

            {["borrowed", "overdue", "returned"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                  activeTab === tab
                    ? "bg-[#D34F4E] text-white"
                    : "bg-white"
                }`}
              >
                {tab}
              </button>
            ))}

          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {getBooks().map((item) => (
              <BookCard key={item.id} book={item} />
            ))}
          </div>

        </div>
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">

          <div className="bg-white p-6 rounded-xl w-[90%] max-w-sm">

            <h2 className="text-lg font-bold">Confirm Return</h2>
            <p className="text-sm text-gray-500 mt-2">
              Are you sure you want to return this book?
            </p>

            <div className="flex gap-3 mt-5">

              <button
                onClick={() => setShowModal(false)}
                className="flex-1 bg-gray-200 py-2 rounded-lg"
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  handleReturn(selectedBorrowId);
                  setShowModal(false);
                }}
                className="flex-1 bg-black text-white py-2 rounded-lg"
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