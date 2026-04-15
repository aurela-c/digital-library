import React, { useEffect, useState } from "react";

const Profile = () => {
  const [borrowedBooks, setBorrowedBooks] = useState([]);

  useEffect(() => {
  const fetchBorrowed = async () => {
    const userId = localStorage.getItem("userId");
    if (!userId) return;

    try {
      const res = await fetch(`http://localhost:5000/api/borrow/${userId}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setBorrowedBooks(data);
    } catch (err) {
      console.error(err);
    }
  };

  fetchBorrowed();
}, []);

  return (
    <div className="min-h-screen bg-[#f5efe9] p-6">
      <h1 className="text-3xl font-bold text-[#D34F4E] mb-6">My Profile</h1>
      <p className="text-gray-500">Here you will see your borrowed books.</p>
      <div className="w-full h-[1px] bg-gray-300 mb-6"></div>

      {borrowedBooks.length === 0 ? (
        <p className="text-gray-500">You haven’t borrowed any books yet.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
         {borrowedBooks.map((item) => (
          <div key={item.id} className="bg-white rounded-xl shadow-md p-3">
            <img
            src={item.Book.image} 
            alt={item.Book.title}
            className="w-full h-40 object-cover rounded-md"/>
            <h3 className="mt-2 font-semibold text-sm">{item.Book.title}</h3>
            <p className="text-gray-500 text-xs">{item.Book.author}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Profile;