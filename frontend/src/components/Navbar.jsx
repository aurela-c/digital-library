import { Link } from "react-router-dom";

const Navbar = () => {
  return (
    <nav className="flex justify-between items-center px-10 py-5 bg-[#f5efe9]">
      
      <div className="flex gap-8 text-gray-700 font-medium">
        <a href="#" className="border-b-2 border-red-400">Home</a>
        <a href="#">About</a>
        <a href="#">Features</a>
        <a href="#">Contact</a>
      </div>

      <div className="text-2xl font-bold"></div>

      <div className="flex gap-4 items-center">
        <Link to="/login" className="text-gray-700">Log in</Link>

        <Link
          to="/register"
          className="bg-red-400 text-white px-4 py-2 rounded-lg hover:bg-red-500"
        >
          Sign up
        </Link>
      </div>

    </nav>
  );
};

export default Navbar;