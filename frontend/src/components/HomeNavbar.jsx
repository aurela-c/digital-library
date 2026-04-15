import { Link } from "react-router-dom";
import { FaUserCircle } from "react-icons/fa";

const HomeNavbar = () => {
  return (
    <nav className="flex justify-between items-center px-10 py-5 bg-[#f5efe9]">
      <div className="container mx-auto flex items-center justify-between px-6 py-4">

        <div>
          <img src="/images/logo2.png" alt="Logo" className="h-12 w-auto" />
        </div>

        <div className="hidden md:flex space-x-6 items-center">
          <Link to="/home" className="text-gray-700 hover:text-[#D34F4E] font-semibold">
            Home
          </Link>

          <div className="relative group">
            <div className="text-gray-700 hover:text-[#D34F4E] font-semibold cursor-pointer">
              Categories
            </div>
            <div className="absolute top-full left-0  w-48 bg-white rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition duration-300">
              <ul className="flex flex-col py-2">
                <li>
                  <Link to="/categories/technology" className="block px-4 py-2 hover:bg-gray-100 hover:text-[#D34F4E]">
                    Technology
                  </Link>
                </li>
                <li>
                  <Link to="/categories/literature" className="block px-4 py-2 hover:bg-gray-100 hover:text-[#D34F4E]">
                    Literature
                  </Link>
                </li>
                <li>
                  <Link to="/categories/academic" className="block px-4 py-2 hover:bg-gray-100 hover:text-[#D34F4E]">
                    Academic
                  </Link>
                </li>
                <li>
                  <Link to="/categories/business" className="block px-4 py-2 hover:bg-gray-100 hover:text-[#D34F4E]">
                    Business
                  </Link>
                </li>
                <li>
                  <Link to="/categories/history" className="block px-4 py-2 hover:bg-gray-100 hover:text-[#D34F4E]">
                    History
                  </Link>
                </li>
                <li>
                  <Link to="/categories/arts" className="block px-4 py-2 hover:bg-gray-100 hover:text-[#D34F4E]">
                    Arts
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <Link to="/trending" className="text-gray-700 hover:text-[#D34F4E] font-semibold">
            Trending
          </Link>

          <Link to="/contact" className="text-gray-700 hover:text-[#D34F4E] font-semibold">
            Contact Us
          </Link>
        </div>

        <div className="flex items-center bg-white px-4 py-2 rounded-full w-96">
          <input
            type="text"
            placeholder="Search by author, title, name"
            className="bg-transparent outline-none flex-1 text-sm"
          />
        </div>

        <Link to="/profile">
          <div>
            <FaUserCircle className="text-gray-700 text-3xl cursor-pointer hover:text-[#D34F4E]" />
          </div>
        </Link>

      </div>
    </nav>
  );
};

export default HomeNavbar;