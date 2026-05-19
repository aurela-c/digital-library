import React from "react";
import PageContainer from "./layout/PageContainer";

const Footer = () => {
  return (
    <footer className="bg-[#f5efe9] border-t border-gray-200 mt-auto">
      <PageContainer className="py-8 sm:py-10">
        <div className="flex flex-col md:flex-row md:justify-between gap-8 md:gap-6 lg:gap-10">
          <div className="text-center md:text-left">
            <h3 className="text-lg sm:text-xl font-bold text-[#D34F4E] mb-2">
              The Book Club
            </h3>

            <p className="text-gray-700 text-sm sm:text-base">
              Sheshi i Lidhjes <br />
              Prizren, Kosova
            </p>

            <p className="text-gray-700 mt-2 text-sm sm:text-base">
              Phone: +383 xxx xxx
            </p>
          </div>

          <div className="text-gray-700 text-center md:text-left">
            <h4 className="font-bold text-[#D34F4E] mb-2">Working Hours</h4>

            <p className="text-sm sm:text-base">
              Monday - Friday: <br />
              08:00 - 20:00
            </p>

            <p className="text-sm mt-2">
              Saturday: <br />
              08:00 - 14:00
            </p>

            <div className="mt-4">
              <p className="font-semibold mb-2">Follow us</p>

              <div className="flex gap-4 text-[#D34F4E] text-2xl justify-center md:justify-start">
                <a href="" className="hover:scale-110 transition p-1" aria-label="Facebook">
                  <i className="fab fa-facebook"></i>
                </a>

                <a href="" className="hover:scale-110 transition p-1" aria-label="Instagram">
                  <i className="fab fa-instagram"></i>
                </a>
              </div>
            </div>
          </div>

          <div className="text-center md:text-right">
            <h4 className="font-bold text-[#D34F4E] mb-3">You need help?</h4>

            <div className="space-y-2 text-gray-600 text-sm sm:text-base">
              <p className="hover:text-[#D34F4E] cursor-pointer">Contact Us</p>
              <p className="hover:text-[#D34F4E] cursor-pointer">About Us</p>
              <p className="hover:text-[#D34F4E] cursor-pointer">Privacy Policies</p>
            </div>
          </div>
        </div>
      </PageContainer>
    </footer>
  );
};

export default Footer;
