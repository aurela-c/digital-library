import React from "react";
import { Link } from "react-router-dom";
import PageContainer from "./layout/PageContainer";

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
    <section className="mt-12 sm:mt-16 relative py-10 sm:py-12 w-full overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: "url('/images/categories/pldh.jpg')",
        }}
      />

      <div className="absolute inset-0 bg-black/50" />

      <PageContainer className="relative py-4">
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6 sm:mb-10 text-center px-2">
          Explore Categories
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 md:gap-5 max-w-3xl mx-auto w-full">
          {categories.map((cat, index) => (
            <Link
              key={index}
              to={`/categories/${cat}`}
              className="
                bg-white/60
                text-gray-700
                font-semibold
                text-center
                text-xs sm:text-sm
                py-4 sm:py-5
                px-2
                rounded-lg
                shadow-md
                cursor-pointer
                transition
                hover:shadow-[0_0_20px_rgba(255,255,255,0.35)]
                hover:scale-[1.02]
                active:scale-[0.98]
                min-h-[52px] flex items-center justify-center
              "
            >
              {cat.toUpperCase()}
            </Link>
          ))}
        </div>
      </PageContainer>
    </section>
  );
}
