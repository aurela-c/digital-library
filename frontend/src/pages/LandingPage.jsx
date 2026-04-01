import Navbar from "../components/Navbar";
import LandingSlider from "../components/LandingSlider";
import { Link } from "react-router-dom";

const LandingPage = () => {
  return (
    <div className="bg-[#f5efe9] min-h-screen">
      <Navbar />

      <div className="text-center mt-5 px-6">
        <p className="text-gray-500">
          Discover stories, borrow knowledge, and let your reading journey begin.
        </p>

        <h1 className="text-4xl md:text-5xl font-bold mt-4">
          Thousands of Books.
          <span className="text-[#D34F4E]"> One Click Away</span>
        </h1>

        <Link
          to="/register"
          className="inline-block mt-6 bg-[#D34F4E] text-white px-8 py-3 rounded-full text-lg hover:bg-red-500"
        >
          Start now
        </Link>
      </div>

      <LandingSlider />
    </div>
  );
};

export default LandingPage;