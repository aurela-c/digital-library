import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import PageContainer from "./layout/PageContainer";

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
    const el = sliderRef.current?.children?.[activeIndex];
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
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
    <section className="relative bg-[#D34F4E] py-10 sm:py-12 text-white w-full overflow-hidden">
      <PageContainer>
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-6 sm:mb-10 px-2">
          Upcoming Events
        </h2>
      </PageContainer>

      <div className="relative">
        <button
          type="button"
          onClick={scrollLeft}
          className="absolute left-1 sm:left-2 md:left-4 top-1/2 -translate-y-1/2 z-20 bg-white text-[#D34F4E] w-9 h-9 sm:w-10 sm:h-10 rounded-full shadow flex items-center justify-center touch-manipulation"
          aria-label="Previous event"
        >
          ←
        </button>

        <button
          type="button"
          onClick={scrollRight}
          className="absolute right-1 sm:right-2 md:right-4 top-1/2 -translate-y-1/2 z-20 bg-white text-[#D34F4E] w-9 h-9 sm:w-10 sm:h-10 rounded-full shadow flex items-center justify-center touch-manipulation"
          aria-label="Next event"
        >
          →
        </button>

        <div
          ref={sliderRef}
          className="flex gap-4 sm:gap-6 px-2 sm:px-4 md:px-8 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {events.map((event) => (
            <Link
              key={event.id}
              to={`/events/${event.id}`}
              className="relative shrink-0 w-[min(88vw,320px)] sm:w-72 snap-center min-h-[300px] sm:min-h-[340px] max-h-[420px] rounded-xl overflow-hidden shadow-lg"
            >
              <img
                src={event.image}
                alt={event.title}
                className="w-full h-full min-h-[300px] object-cover"
              />

              <div className="absolute inset-0 bg-black/40" />

              <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 text-white">
                <h3 className="text-base sm:text-lg font-bold mb-1 line-clamp-2">
                  {event.title}
                </h3>

                <p className="text-xs sm:text-sm leading-snug line-clamp-4 sm:line-clamp-5">
                  {event.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="flex justify-center gap-2 mt-6 sm:mt-8 flex-wrap px-4">
        {events.map((_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => setActiveIndex(index)}
            className={`w-2.5 h-2.5 rounded-full transition touch-manipulation ${
              activeIndex === index ? "bg-white" : "bg-white/40"
            }`}
            aria-label={`Go to event ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
