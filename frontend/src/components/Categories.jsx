import React from "react";
import { Link } from "react-router-dom";

const categories = [
  "literature",
  "technology",
  "business",
  "history",
  "science",
  "arts",
];

export default function Categories() {
  return (
    <div className="mt-16 relative py-12 w-full overflow-hidden">

      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: "url('/images/categories/pldh.jpg')",
        }}
      />

      <div className="absolute inset-0 bg-black/50" />

      <div className="relative flex flex-col items-center px-6">

        <h2 className="text-3xl font-bold text-white mb-10 text-center">
          Explore Categories
        </h2>

        <div className="grid grid-cols-3 gap-5 max-w-2xl w-full">
          {categories.map((cat, index) => (
            <Link
              key={index}
              to={`/categories/${cat}`}
              className="
                bg-white/60
                text-gray-600
                font-semibold
                text-center
                py-5
                shadow-md
                cursor-pointer
                transition
                hover:shadow-[0_0_20px_rgba(255,255,255,0.35)]
                hover:scale-105
              "
            >
              {cat.toUpperCase()}
            </Link>
          ))}
        </div>

      </div>
    </div>
  );
}