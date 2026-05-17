import { Link } from "react-router-dom";
import PageContainer from "./layout/PageContainer";

const Navbar = () => {
  return (
    <nav className="w-full bg-[#F9F3EB]">
      <PageContainer className="py-3 sm:py-4">

        <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-4">

          {/* LEFT LINKS (INCLUDING MOBILE AUTH INLINE) */}
          <div className="flex flex-wrap justify-center md:justify-start items-center gap-4 sm:gap-6 text-gray-700 font-medium text-sm sm:text-base">

            <Link
              to="/"
              className="hover:text-[#D34F4E] hover:underline hover:underline-offset-4 transition"
            >
              Home
            </Link>

            <span className="hover:text-[#D34F4E] hover:underline hover:underline-offset-4 transition cursor-pointer">
              About
            </span>

            <span className="hover:text-[#D34F4E] hover:underline hover:underline-offset-4 transition cursor-pointer">
              Features
            </span>

            <span className="hover:text-[#D34F4E] hover:underline hover:underline-offset-4 transition cursor-pointer">
              Contact
            </span>

            {/* MOBILE AUTH INLINE (STILL SAME LINE, JUST STYLED) */}
            <Link
              to="/login"
              className="
                md:hidden
                text-gray-700
                px-3 py-1
                rounded-full
                border border-gray-300
                hover:text-[#D34F4E]
                hover:border-[#D34F4E]
                transition
              "
            >
              Log in
            </Link>

            <Link
              to="/register"
              className="
                md:hidden
                bg-[#D34F4E]
                text-white
                px-3 py-1
                rounded-full
                hover:bg-red-500
                transition
              "
            >
              Sign up
            </Link>

          </div>

          {/* LOGO (CENTERED DESKTOP + MOBILE SAME) */}
          <div className="flex justify-center">
            <Link to="/">
              <img
                src="/images/logo2.png"
                alt="Logo"
                className="w-12 h-12 sm:w-14 sm:h-14 object-contain"
              />
            </Link>
          </div>

          {/* DESKTOP AUTH ONLY (UNCHANGED) */}
          <div className="hidden md:flex items-center justify-end gap-4">

            <Link
              to="/login"
              className="text-gray-700 hover:text-[#D34F4E] hover:underline hover:underline-offset-4 transition"
            >
              Log in
            </Link>

            <Link
              to="/register"
              className="bg-[#D34F4E] text-white px-4 py-2 rounded-lg hover:bg-red-500 transition"
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