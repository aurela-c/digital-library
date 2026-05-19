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
 {
  id: 5,
  title: "Women in Tech Summit",
  image: "/images/events/event7.png",
  description:
    "An inspiring event where women in technology share experiences, career journeys, and insights about innovation, leadership, and the future of tech.",
},
  {
    id: 6,
    title: "Open Mic & Book Signing",
    image: "/images/events/event8.png",
    description:
      "Local writers share short readings, then stay to sign copies and chat with readers in a relaxed setting.",
  },
];

const GAP_PX = 24;

function getPerView(width) {
  if (width >= 1024) return Math.min(4, events.length);
  if (width >= 640) return Math.min(2, events.length);
  return 1;
}

export default function Events() {
  const viewportRef = useRef(null);
  const dragState = useRef({ startX: 0, dragging: false, moved: false });
  const [activeIndex, setActiveIndex] = useState(0);
  const [perView, setPerView] = useState(4);
  const [slideStep, setSlideStep] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const maxSlide = Math.max(0, events.length - perView);
  const allVisible = maxSlide === 0;

  useEffect(() => {
    const updateLayout = () => {
      const pv = getPerView(window.innerWidth);
      setPerView(pv);

      const viewport = viewportRef.current;
      if (!viewport) return;

      const cardWidth =
        (viewport.offsetWidth - GAP_PX * (pv - 1)) / pv;
      setSlideStep(cardWidth + GAP_PX);
    };

    updateLayout();
    window.addEventListener("resize", updateLayout);
    return () => window.removeEventListener("resize", updateLayout);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (isDragging) return;
      setActiveIndex((prev) => {
        if (allVisible) {
          return (prev + 1) % events.length;
        }
        return prev >= maxSlide ? 0 : prev + 1;
      });
    }, 3500);

    return () => clearInterval(interval);
  }, [allVisible, maxSlide, isDragging]);

  useEffect(() => {
    if (!allVisible && activeIndex > maxSlide) {
      setActiveIndex(maxSlide);
    }
  }, [allVisible, activeIndex, maxSlide]);

  const goPrev = () => {
    if (allVisible) {
      setActiveIndex((prev) => (prev - 1 + events.length) % events.length);
      return;
    }
    setActiveIndex((prev) => (prev <= 0 ? maxSlide : prev - 1));
  };

  const goNext = () => {
    if (allVisible) {
      setActiveIndex((prev) => (prev + 1) % events.length);
      return;
    }
    setActiveIndex((prev) => (prev >= maxSlide ? 0 : prev + 1));
  };

  const dotCount = allVisible ? events.length : maxSlide + 1;

  const clampDragOffset = (offset) => {
    if (allVisible || slideStep <= 0) return offset;
    const minX = -maxSlide * slideStep;
    const maxX = 0;
    const proposed = -activeIndex * slideStep + offset;
    if (proposed > maxX) return offset + (maxX - proposed);
    if (proposed < minX) return offset + (minX - proposed);
    return offset;
  };

  const handlePointerDown = (e) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    dragState.current = { startX: e.clientX, dragging: true, moved: false };
    setIsDragging(true);
    setDragOffset(0);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!dragState.current.dragging) return;
    const delta = e.clientX - dragState.current.startX;
    if (Math.abs(delta) > 6) dragState.current.moved = true;
    setDragOffset(clampDragOffset(delta));
  };

  const finishDrag = (clientX) => {
    if (!dragState.current.dragging) return;
    const delta = clientX - dragState.current.startX;
    const threshold = Math.max(40, slideStep * 0.15);

    if (Math.abs(delta) >= threshold) {
      if (delta < 0) goNext();
      else goPrev();
    }

    dragState.current.dragging = false;
    setIsDragging(false);
    setDragOffset(0);
  };

  const handlePointerUp = (e) => {
    finishDrag(e.clientX);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
  };

  const handleLinkClick = (e) => {
    if (dragState.current.moved) {
      e.preventDefault();
      dragState.current.moved = false;
    }
  };

  const trackTransform = allVisible
    ? `translateX(${dragOffset}px)`
    : `translateX(${-activeIndex * slideStep + dragOffset}px)`;

  return (
    <section className="relative bg-[#D34F4E] py-10 sm:py-12 text-white w-full overflow-hidden">
      <PageContainer>
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8">
          Upcoming Events
        </h2>
      </PageContainer>

      <button
        type="button"
        onClick={goPrev}
        aria-label="Previous event"
        className="absolute left-2 sm:left-4 top-[58%] -translate-y-1/2 bg-white text-[#D34F4E] w-10 h-10 rounded-full shadow z-20 hover:opacity-90 transition"
      >
        ←
      </button>

      <button
        type="button"
        onClick={goNext}
        aria-label="Next event"
        className="absolute right-2 sm:right-4 top-[58%] -translate-y-1/2 bg-white text-[#D34F4E] w-10 h-10 rounded-full shadow z-20 hover:opacity-90 transition"
      >
        →
      </button>

      <div
        ref={viewportRef}
        className="overflow-hidden w-full max-w-[1400px] mx-auto px-12 sm:px-16 lg:px-20 touch-pan-y cursor-grab active:cursor-grabbing select-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={(e) => {
          if (dragState.current.dragging) finishDrag(e.clientX);
        }}
      >
        <div
          className={`flex gap-6 will-change-transform ${
            isDragging ? "" : "transition-transform duration-500 ease-in-out"
          }`}
          style={{ transform: trackTransform }}
        >
          {events.map((event, i) => {
            const isHighlighted = allVisible
              ? activeIndex === i
              : i >= activeIndex && i < activeIndex + perView;

            return (
              <div
                key={event.id}
                className="shrink-0 flex justify-center"
                style={{
                  flex: `0 0 calc((100% - ${(perView - 1) * GAP_PX}px) / ${perView})`,
                }}
              >
                <Link
                  to={`/events/${event.id}`}
                  onClick={handleLinkClick}
                  draggable={false}
                  className={`relative block w-full max-w-[320px] h-[360px] rounded-xl overflow-hidden shadow-lg transition-transform duration-300 ${
                    isHighlighted && allVisible
                      ? "ring-2 ring-white scale-[1.02]"
                      : ""
                  }`}
                >
                  <img
                    src={event.image}
                    alt={event.title}
                    className="w-full h-full object-cover"
                  />

                  <div className="absolute inset-0 bg-black/40" />

                  <div className="absolute bottom-0 p-4">
                    <h3 className="text-lg font-bold">{event.title}</h3>
                    <p className="text-sm opacity-90 line-clamp-3">
                      {event.description}
                    </p>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-center gap-2 mt-6">
        {Array.from({ length: dotCount }).map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActiveIndex(i)}
            aria-label={
              allVisible
                ? `Highlight event ${i + 1}`
                : `Go to slide ${i + 1}`
            }
            aria-current={activeIndex === i ? "true" : undefined}
            className={`w-2.5 h-2.5 rounded-full transition ${
              activeIndex === i ? "bg-white" : "bg-white/40 hover:bg-white/60"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
