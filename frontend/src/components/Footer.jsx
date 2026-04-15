import React from "react";

const Footer = () => {
  return (
    <footer className="bg-[#f5efe9] mt-20 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-8 py-10 flex justify-between">

        <div>
          <h3 className="text-xl font-bold text-[#D34F4E] mb-2">
            The Book Club
          </h3>

          <p className="text-gray-600">
            221B Library Street <br />
            Prizren, Kosov
          </p>

          <p className="text-gray-600 mt-2">
            Phone: +383 xxx xxx
          </p>
        </div>

        {/* RIGHT SIDE */}
        <div className="text-right">
          <h4 className="font-semibold text-gray-800 mb-3">
            You need help?
          </h4>

          <div className="space-y-2 text-gray-600">
            <p className="hover:text-[#D34F4E] cursor-pointer">Contact Us</p>
            <p className="hover:text-[#D34F4E] cursor-pointer">About Us</p>
            <p className="hover:text-[#D34F4E] cursor-pointer">Privacy Policies</p>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;