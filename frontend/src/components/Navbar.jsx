import { Link } from "react-router-dom";
import PageContainer from "./layout/PageContainer";

const Navbar = () => {
  return (
    <nav className="w-full bg-[#F9F3EB] border-b border-gray-200/80 shadow-sm">
      <PageContainer className="py-3 sm:py-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-4">
          <div className="flex flex-wrap justify-center md:justify-start gap-x-5 gap-y-2 text-gray-700 font-medium text-sm sm:text-base">
            <Link
              to="/"
              className="hover:text-[#D34F4E] py-1 transition"
            >
              Home
            </Link>
            <span className="text-gray-400 py-1 hidden md:inline cursor-default">
              About
            </span>
            <span className="text-gray-400 py-1 hidden md:inline cursor-default">
              Features
            </span>
            <span className="text-gray-400 py-1 hidden md:inline cursor-default">
              Contact
            </span>
          </div>

          <div className="flex justify-center md:absolute md:left-1/2 md:-translate-x-1/2 md:pointer-events-none">
            <Link to="/" className="md:pointer-events-auto">
              <img
                src="/images/logo2.png"
                alt="Logo"
                className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 object-contain"
              />
            </Link>
          </div>

          <div className="flex justify-center md:justify-end gap-3 sm:gap-4 items-center text-sm sm:text-base">
            <Link
              to="/login"
              className="text-gray-700 hover:text-[#D34F4E] min-h-[44px] inline-flex items-center px-2"
            >
              Log in
            </Link>
            <Link
              to="/register"
              className="bg-[#D34F4E] text-white px-4 sm:px-5 py-2 rounded-lg hover:bg-red-500 transition min-h-[44px] inline-flex items-center justify-center touch-manipulation"
            >
              Sign up
            </Link>
          </div>
        </div>
      </PageContainer>
    </nav>
  );
};

export default Navbar;
