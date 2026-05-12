/** Shared Tailwind classes for book tiles in grids (PopularNow, CategoryBooks, etc.) */
export const bookTileCard =
  "bg-white shadow-md rounded-lg overflow-hidden p-2 sm:p-3 hover:shadow-lg transition flex flex-col h-full min-w-0";

export const bookTileImage =
  "w-full aspect-[3/4] object-cover rounded-md hover:scale-[1.02] transition";

export const bookTileTitle = "mt-2 font-semibold text-xs sm:text-sm line-clamp-2";

export const bookTileAuthor = "text-gray-500 text-[10px] sm:text-xs line-clamp-1";

export const bookBorrowBtn =
  "mt-auto w-full sm:w-auto text-center bg-[#D34F4E] text-white text-xs sm:text-sm font-medium px-3 sm:px-6 py-2 rounded-md hover:bg-black transition cursor-pointer shrink-0";
