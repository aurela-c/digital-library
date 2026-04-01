import { Link } from "react-router-dom";
import { FaUserCircle } from "react-icons/fa";

const HomeNavbar = () => {
  return (
    <nav className="bg-white shadow-md fixed w-full z-50">
      <div className="container mx-auto flex items-center justify-between px-6 py-4">
       
        <div className="hidden md:flex space-x-6">
          <Link to="/" className="text-gray-700 hover:text-red-400 font-semibold">Home</Link>
          <Link to="/categories" className="text-gray-700 hover:text-red-400 font-semibold">Categories</Link>
          <Link to="/trending" className="text-gray-700 hover:text-red-400 font-semibold">Trending</Link>
          <Link to="/contact" className="text-gray-700 hover:text-red-400 font-semibold">Contact Us</Link>
        </div>

        {
        <div className="absolute left-1/2 transform -translate-x-1/2">
          <img src="/images/logo2.png" alt="Logo" className="h-12 w-auto" />
        </div>

        }
        <div>
          <FaUserCircle className="text-gray-700 text-3xl cursor-pointer hover:text-red-400" />
        </div>
      </div>
    </nav>
  );
};

export default HomeNavbar;