const Banner = () => {
  return (
    <div className="px-4 md:px-10 mb-10">
      <div
        className="p-10 flex flex-col md:flex-row items-center justify-between shadow-md
                   bg-cover bg-center h-60 "
        style={{ backgroundImage: "url('/images/banner8.png')" }}
      >
        <div className="text-center md:text-left text-[#D34F4E]">
          <h2 className="text-3xl font-bold mb-3">
            Build Your Library
          </h2>

          <p className="mb-6 text-gray-700">
            Now The Book Club also available online!
          </p>

          <button className="bg-[#D34F4E] text-white px-6 py-2 rounded-lg hover:bg-black transition">
            View All
          </button>
        </div>
      </div>
    </div>
  );
};

export default Banner;