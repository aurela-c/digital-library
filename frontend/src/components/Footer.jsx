import React from "react";

const Footer = () => {
  return (
    <footer className="bg-[#f5efe9]  border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-8 py-10 flex justify-between items-start">

        
        <div>
          <h3 className="text-xl font-bold text-[#D34F4E] mb-2">
            The Book Club
          </h3>

          <p className="text-gray-600">
            xxx rruga rruga <br />
            Prizren, Kosovo
          </p>

          <p className="text-gray-600 mt-2">
            Phone: +383 xxx xxx
          </p>
        </div>
        <div className="text-gray-700">
          
          <h4 className="font-bold text-[#D34F4E] mb-2">Working Hours</h4>

          <p className="text-sm">
            Monday - Friday: <br />
            08:00 - 20:00
          </p>

          <p className="text-sm mt-2">
            Saturday: <br />
            08:00 - 14:00
          </p>

        
          <div className="mt-4">
            <p className="font-semibold mb-2">Follow us</p>

            <div className="flex gap-4 text-[#D34F4E] text-xl">
              <a href="#" className="hover:scale-110 transition">
                <i className="fab fa-facebook"></i>
              </a>

              <a href="#" className="hover:scale-110 transition">
                <i className="fab fa-instagram"></i>
              </a>
            </div>
          </div>

        </div>

        <div className="text-right">
          <h4 className="font-bold text-[#D34F4E] mb-3">
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