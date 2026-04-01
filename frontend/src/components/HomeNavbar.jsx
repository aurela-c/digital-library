import { Link } from "react-router-dom";
import { FaUserCircle } from "react-icons/fa";

const HomeNavbar = () => {
  return (
    <nav className="flex justify-between items-center px-10 py-5 bg-[#f5efe9]">
      <div className="container mx-auto flex items-center justify-between px-6 py-4">

         <div >
          <img src="/images/logo2.png" alt="Logo" className="h-12 w-auto" />
        </div>
       
        <div className="hidden md:flex space-x-6">
          <Link to="/" className="text-gray-700 hover:text-[#D34F4E] font-semibold">Home</Link>
          <Link to="/categories" className="text-gray-700 hover:text-[#D34F4E] font-semibold">Categories</Link>
          <Link to="/trending" className="text-gray-700 hover:text-[#D34F4E] font-semibold">Trending</Link>
          <Link to="/contact" className="text-gray-700 hover:text-[#D34F4E] font-semibold">Contact Us</Link>
        </div>

           <div className="flex items-center bg-gray-100 px-4 py-2 rounded-full w-96">

        <input
          type="text"
          placeholder="Search by author, title, name"
          className="bg-transparent outline-none flex-1 text-sm"
        />

        <span className="text-gray-500"></span>

      </div>

        <div>
          <FaUserCircle className="text-gray-700 text-3xl cursor-pointer hover:text-[#D34F4E]" />
        </div>
      </div>
    </nav>
  );
};

export default HomeNavbar;
