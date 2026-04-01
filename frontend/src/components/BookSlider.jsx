import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

const BookSlider = ({ books }) => {
  const settings = {
    infinite: true,
    slidesToShow: 6,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 2000,
    responsive: [
      { breakpoint: 1024, settings: { slidesToShow: 4 } },
      { breakpoint: 768, settings: { slidesToShow: 2 } },
      { breakpoint: 480, settings: { slidesToShow: 1 } },
    ],
  };

  return (
    <div className="mt-10 px-6">
      <h3 className="text-2xl font-bold mb-4">Trending Books</h3>
      <Slider {...settings}>
        {books.map((book, idx) => (
          <div key={idx} className="px-2">
            <img src={book.cover} alt={book.title} className="rounded-lg w-full h-56 object-cover" />
            <p className="text-center mt-2 font-semibold">{book.title}</p>
          </div>
        ))}
      </Slider>
    </div>
  );
};

export default BookSlider;