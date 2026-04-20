import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

const events = [
  {
    id: 1,
    title: "Poetry Night",
    image: "/images/events/event1.png",
    description:
      "A magical evening dedicated to modern and classic poetry. Readers gather to share emotions through words.",
  },
  {
    id: 2,
    title: "Book Fair 2026",
    image: "/images/events/event2.1.png",
    description:
      "Explore hundreds of books, meet publishers, and discover new literary worlds in one place.",
  },
  {
    id: 3,
    title: "Author Meetup",
    image: "/images/events/event3.png",
    description:
      "Meet writers in person and hear the stories behind their most famous books and ideas.",
  },
  {
    id: 4,
    title: "Reading Marathon",
    image: "/images/events/event4.1.png",
    description:
      "A full-day reading challenge with book lovers sharing insights and favorite passages.",
  },
];

export default function Events() {
  const sliderRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % events.length);
    }, 3500);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (sliderRef.current) {
      sliderRef.current.scrollTo({
        left: activeIndex * 320,
        behavior: "smooth",
      });
    }
  }, [activeIndex]);

  const scrollLeft = () => {
    setActiveIndex((prev) => (prev - 1 + events.length) % events.length);
  };

  const scrollRight = () => {
    setActiveIndex((prev) => (prev + 1) % events.length);
  };

  return (
    <div className="relative bg-[#D34F4E] py-12 text-white w-full overflow-hidden">

      <h2 className="text-3xl font-bold text-center mb-10">
        Upcoming Events
      </h2>

  
      <button
        onClick={scrollLeft}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-white text-[#D34F4E] w-6 h-6 rounded-full shadow"
      >
         ←
      </button>

   
      <button
        onClick={scrollRight}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-white text-[#D34F4E] w-6 h-6 rounded-full shadow"
      >
         →
      </button>


      <div
        ref={sliderRef}
        className="flex gap-6 px-10 overflow-hidden scroll-smooth"
      >
        {events.map((event) => (
          <Link
            key={event.id}
            to={`/events/${event.id}`}
            className="relative min-w-[300px] h-[380px] overflow-hidden shadow-lg"
          >
            <img
              src={event.image}
              alt={event.title}
              className="w-full h-full object-cover"
            />

            <div className="absolute inset-0 bg-black/40" />

            <div className="absolute bottom-0 p-4 text-white">
              <h3 className="text-lg font-bold mb-1">
                {event.title}
              </h3>

              <p className="text-sm leading-tight">
                {event.description}
              </p>
            </div>
          </Link>
        ))}
      </div>

      <div className="flex justify-center gap-2 mt-8">
        {events.map((_, index) => (
          <button
            key={index}
            onClick={() => setActiveIndex(index)}
            className={`w-2.5 h-2.5 rounded-full transition ${
              activeIndex === index ? "bg-white" : "bg-white/40"
            }`}
          />
        ))}
      </div>

    </div>
  );
}