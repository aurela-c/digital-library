import React from "react";

const Categories = () => {
  const categories = [
    "Literature",
    "Technology",
    "Business",
    "History",
    "Science",
    "Arts",
  ];

  return (
    <div className="mt-16">
      <h2 className="text-2xl font-bold text-[#D34F4E] mb-6">
        Explore Categories
      </h2>

      <div className="grid grid-cols-2 gap-6 h-[340px]">

        <div className="bg-white shadow-md overflow-hidden h-full ">
          <img
            className="w-full h-full object-cover"
            src="/images/image1.jpg"
            alt="Poster"
          />
        </div>
        <div className="grid grid-cols-3 gap-6 h-full">
          {categories.map((cat, index) => (
            <div
              key={index}
              className="
                bg-white
                shadow-md
                flex
                items-center
                justify-center
                text-center
                font-semibold
                text-gray-700
                cursor-pointer
                hover:shadow-xl
                hover:scale-105
                transition
              "
            >
              {cat}
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default Categories;