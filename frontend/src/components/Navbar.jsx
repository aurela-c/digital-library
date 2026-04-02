import { Link } from "react-router-dom";

const Navbar = () => {
  return (
    <nav className="flex justify-between items-center px-10 py-5 bg-[#F9F3EB] ">
      
   <div className="flex gap-8 text-gray-700 font-medium">
  <Link
    to="/"
    className="relative pb-1 hover:border-b-4 hover:border-red-400 hover:rounded-sm ">
    Home
  </Link>
  <Link
    to="#"
    className="relative pb-1 hover:border-b-4 hover:border-red-400 hover:rounded-sm ">
    About
  </Link>
  <Link
    to="#"
    className="relative pb-1 hover:border-b-4 hover:border-red-400 hover:rounded-sm">
    Features
  </Link>
  <Link
    to="#"
    className="relative pb-1 hover:border-b-4 hover:border-red-400 hover:rounded-sm">
    Contact
  </Link>
</div>

<div className="flex justify-center md:w-1/2 relative md:pr-30">
  <img
    src="/images/logo2.png"
    alt="Logo"
    className="w-20 h-20 object-contain"
  />
</div>

      <div className="text-2xl font-bold"></div>

      <div className="flex gap-4 items-center">
        <Link to="/login" className="text-gray-700 hover:text-[#D34F4E]">Log in</Link>
        <Link
          to="/register"
          className="bg-[#D34F4E] text-white px-4 py-2 rounded-lg hover:bg-red-500"
        >
          Sign up
        </Link>
      </div>

    </nav>
  );
};

export default Navbar;