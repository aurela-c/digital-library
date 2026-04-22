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
  const [profileImage, setProfileImage] = useState(
    localStorage.getItem(storageKey) || null
  );

  useEffect(() => {
    const fetchUser = async () => {
      if (!userId) return;

      try {
        const res = await fetch(
          `http://localhost:5000/api/auth/${userId}` 
        );

        const data = await res.json();
        setUser(data);

      } catch (err) {
        console.error(err);
      }
    };

    fetchUser();
  }, [userId]);

  useEffect(() => {
    fetchBorrowed();
  }, []);

  const fetchBorrowed = async () => {
    if (!userId) return;

    try {
      const res = await fetch(
        `http://localhost:5000/api/borrow/${userId}`
      );

      const data = await res.json();
      setBorrowedBooks(data);

    } catch (err) {
      console.error(err);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onloadend = () => {
      setProfileImage(reader.result);
      localStorage.setItem(storageKey, reader.result);
    };

    reader.readAsDataURL(file);
  };

  const handleReturn = async (borrowId) => {
    try {
      const res = await fetch(
        `http://localhost:5000/api/borrow/return/${borrowId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!res.ok) throw new Error("Return failed");

      fetchBorrowed();
    } catch (err) {
      console.error(err);
    }
  };

  const confirmReturn = (borrowId) => {
    setSelectedBorrowId(borrowId);
    setShowModal(true);
  };

  const today = new Date();

  const borrowed = borrowedBooks.filter(
    (b) => !b.return_date && (!b.due_date || new Date(b.due_date) >= today)
  );

  const overdue = borrowedBooks.filter(
    (b) => b.due_date && new Date(b.due_date) < today && !b.return_date
  );

  const returned = borrowedBooks.filter((b) => b.return_date);

  const getBooks = () => {
    if (activeTab === "borrowed") return borrowed;
    if (activeTab === "overdue") return overdue;
    if (activeTab === "returned") return returned;
  };

  const BookCard = ({ book }) => (
    <div className="bg-white rounded-xl shadow-md p-3 hover:shadow-lg transition">

      <img
        src={book.Book.image}
        className="w-full h-44 object-cover rounded-lg"
      />

      <div className="mt-3">
        <h3 className="font-semibold text-sm">{book.Book.title}</h3>
        <p className="text-gray-500 text-xs">{book.Book.author}</p>

        {book.due_date && (
          <p className="text-[11px] text-gray-400 mt-1">
            Due: {new Date(book.due_date).toLocaleDateString()}
          </p>
        )}

        {activeTab !== "returned" && !book.return_date && (
          <button
            onClick={() => confirmReturn(book.id)}
            className="mt-3 w-full bg-green-600 text-white py-2 rounded-lg text-xs hover:bg-green-700"
          >
            Return Book
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
        Return to Library
      </Link>

      <div className="grid md:grid-cols-4 gap-6">

        <div className="bg-white p-6 rounded-xl shadow-md text-center">

          <div className="relative w-24 h-24 mx-auto">

            {profileImage ? (
              <img
                src={profileImage}
                className="w-24 h-24 rounded-full object-cover border-2 border-[#D34F4E]"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-[#D34F4E] flex items-center justify-center text-white text-2xl font-bold">
                {user?.username?.charAt(0)}
              </div>
            )}

            <label className="absolute bottom-0 right-0 bg-white p-1 rounded-full cursor-pointer text-xs">
              📷
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>

          </div>
          <h2 className="mt-3 font-semibold text-gray-800">
            {user?.username || "Loading..."}
          </h2>

          <p className="text-gray-500 text-sm">Library Member</p>

    
          <div className="mt-6 text-sm space-y-2">
            <p> Borrowed: {borrowed.length}</p>
            <p> Overdue: {overdue.length}</p>
            <p> Returned: {returned.length}</p>
          </div>

        </div>

        <div className="md:col-span-3">

          <h1 className="text-3xl font-bold text-[#D34F4E] mb-6">
            My Library
          </h1>

          <div className="flex gap-3 mb-6">

            <button
              onClick={() => setActiveTab("borrowed")}
              className={`px-4 py-2 rounded-lg ${
                activeTab === "borrowed"
                  ? "bg-[#D34F4E] text-white"
                  : "bg-white"
              }`}
            >
              Shelf
            </button>

            <button
              onClick={() => setActiveTab("overdue")}
              className={`px-4 py-2 rounded-lg ${
                activeTab === "overdue"
                  ? "bg-[#D34F4E] text-white"
                  : "bg-white"
              }`}
            >
              Overdue
            </button>

            <button
              onClick={() => setActiveTab("returned")}
              className={`px-4 py-2 rounded-lg ${
                activeTab === "returned"
                  ? "bg-[#D34F4E] text-white"
                  : "bg-white"
              }`}
            >
              Returned
            </button>

          </div>

          {/* BOOKS */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
            {getBooks()?.map((item) => (
              <BookCard key={item.id} book={item} />
            ))}
          </div>

        </div>
      </div>
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">

          <div className="bg-white p-6 rounded-xl w-[90%] max-w-sm">

            <h2 className="text-lg font-semibold">Confirm Return</h2>

            <p className="text-gray-500 text-sm mt-2">
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
                className="flex-1 bg-green-600 text-white py-2 rounded-lg"
              >
                Return
              </button>

            </div>
          </div>

        </div>
      )}

    </div>
  );
};

export default Profile;