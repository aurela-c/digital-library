import PageContainer from "./layout/PageContainer";

const Banner = () => {
  return (
    <section className="mb-6 sm:mb-10">
      <PageContainer>
        <div
          className="rounded-xl sm:rounded-2xl px-4 py-8 sm:p-8 md:p-10 flex items-center justify-center shadow-md bg-cover bg-center min-h-[200px] sm:min-h-[240px] md:h-64 lg:h-72"
          style={{ backgroundImage: "url('/images/banner0.jfif')" }}
        >
          <div className="text-center text-[#D34F4E] max-w-lg mx-auto px-2">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2 sm:mb-3">
              Build Your Library
            </h2>

            <p className="mb-4 sm:mb-6 text-gray-700 text-sm sm:text-base">
              Now The Book Club also available online!
            </p>

            <a
              href="#popular-now"
              className="inline-block min-h-[44px] min-w-[120px] leading-[44px] px-6 bg-[#D34F4E] text-white rounded-lg hover:bg-black transition text-sm sm:text-base font-semibold touch-manipulation"
            >
              View All
            </a>
          </div>
        </div>
      </PageContainer>
    </section>
  );
};

export default Banner;
