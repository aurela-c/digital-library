import React, { useRef } from "react";
import { Link } from "react-router-dom";

const events = [
  {
    id: 1,
    title: "Poetry Night",
    image: "/images/event1.jpg",
    description:
      "A magical evening dedicated to modern and classic poetry. Readers gather to share emotions through words and rhythm in a warm atmosphere.",
  },
  {
    id: 2,
    title: "Book Fair 2026",
    image: "/images/event2.jpg",
    description:
      "Explore hundreds of books from different genres and authors. Meet publishers, discover new stories, and enjoy a creative literary space.",
  },
  {
    id: 3,
    title: "Author Meetup",
    image: "/images/event3.jpg",
    description:
      "Connect directly with writers and hear the stories behind their books. A unique opportunity for inspiration and conversation.",
  },
  {
    id: 4,
    title: "Reading Marathon",
    image: "/images/event4.jpg",
    description:
      "Join a full-day reading challenge with fellow book lovers. Share insights, discover new genres, and celebrate reading together.",
  },
];

export default function Events() {
  const sliderRef = useRef(null);

  const scrollLeft = () => {
    sliderRef.current.scrollBy({ left: -300, behavior: "smooth" });
  };

  const scrollRight = () => {
    sliderRef.current.scrollBy({ left: 300, behavior: "smooth" });
  };

  return (
    <div className="bg-[#D34F4E] py-16 mt-20 text-white relative">

   
      <h2 className="text-3xl font-bold text-center mb-10">
         Events
      </h2>

      <button
        onClick={scrollLeft}
        className="absolute left-4 top-1/2 text-3xl font-bold bg-white text-[#D34F4E] w-10 h-10 rounded-full"
      >
        ‹
      </button>

  
      <button
        onClick={scrollRight}
        className="absolute right-4 top-1/2 text-3xl font-bold bg-white text-[#D34F4E] w-10 h-10 rounded-full"
      >
        ›
      </button>

     
      <div
        ref={sliderRef}
        className="flex gap-6 overflow-x-auto scroll-smooth px-16 no-scrollbar"
      >
        {events.map((event) => (
          <Link
            key={event.id}
            to={`/events/${event.id}`}
            className="min-w-[300px] bg-white text-black rounded-lg overflow-hidden shadow-lg hover:scale-105 transition"
          >
            <img
              src={event.image}
              alt={event.title}
              className="w-full h-48 object-cover"
            />

            <div className="p-4">
              <h3 className="text-lg font-bold mb-2">
                {event.title}
              </h3>

              <p className="text-sm text-gray-700 leading-relaxed">
                {event.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}