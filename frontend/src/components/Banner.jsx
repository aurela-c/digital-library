const Banner = () => {
  return (
    <div
      className="rounded-2xl p-10 flex flex-col md:flex-row items-center justify-between mb-10 shadow-md
                 bg-cover bg-center h-60"
      style={{ backgroundImage: "url('')" }}
    >
      <div className="text-center md:text-left text-white">
        <h2 className="text-3xl font-bold mb-3">
          Build Your Library
        </h2>

        <p className="mb-6">
          Now The Book Club also available online!
        </p>

        <button className="bg-[#D34F4E] text-white px-6 py-2 rounded-lg hover:bg-black transition">
          View All
        </button>
      </div>

    </div>
  );
};

export default Banner;