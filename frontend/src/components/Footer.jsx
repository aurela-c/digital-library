import { FaFacebook, FaInstagram, FaMapMarkerAlt, FaPhone, FaClock } from "react-icons/fa";
import { Link } from "react-router-dom";
import PageContainer from "./layout/PageContainer";
import { useIsAdmin } from "../utils/roles.js";

const Footer = () => {
  const isAdmin = useIsAdmin();
  const sectionCard =
    "rounded-2xl border border-gray-200/60 bg-white/50 p-5 sm:p-6 backdrop-blur-sm";

  const heading =
    "text-base font-bold tracking-tight text-[#D34F4E] sm:text-lg";

  const bodyText = "text-sm leading-relaxed text-gray-700 sm:text-base";

  const socialBtn =
    "flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#D34F4E] shadow-sm ring-1 ring-gray-200/80 transition hover:-translate-y-0.5 hover:bg-[#D34F4E] hover:text-white hover:shadow-md hover:ring-[#D34F4E]/30";

  const helpLink =
    "inline-block rounded-lg px-2 py-1.5 text-sm text-gray-600 transition hover:bg-[#D34F4E]/8 hover:text-[#D34F4E] sm:text-base";

  return (
    <footer className="mt-auto border-t border-gray-200/80 bg-[#f5efe9]">
      <div className="h-px bg-gradient-to-r from-transparent via-[#D34F4E]/25 to-transparent" />

      <PageContainer className="py-10 sm:py-12 lg:py-14">
        <div className="grid grid-cols-1 gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-3 lg:gap-10">
          <div className={`${sectionCard} text-center md:text-left`}>
            <h3 className={`${heading} mb-3`}>The Book Club</h3>

            <div className="mx-auto flex max-w-xs flex-col items-center gap-3 md:mx-0 md:items-start">
              <p className={`${bodyText} flex items-start gap-2.5 text-left`}>
                <FaMapMarkerAlt
                  className="mt-0.5 shrink-0 text-[#D34F4E]"
                  aria-hidden
                />
                <span>
                  Sheshi i Lidhjes <br />
                  Prizren, Kosova
                </span>
              </p>

              <p className={`${bodyText} flex items-center gap-2.5`}>
                <FaPhone className="shrink-0 text-[#D34F4E]" aria-hidden />
                <span>Phone: +383 xxx xxx</span>
              </p>
            </div>
          </div>

          <div className={`${sectionCard} text-center md:text-left`}>
            <h4 className={`${heading} mb-3 flex items-center justify-center gap-2 md:justify-start`}>
              <FaClock className="text-base text-[#D34F4E]/90" aria-hidden />
              Working Hours
            </h4>

            <div className="space-y-3">
              <p className={bodyText}>
                Monday - Friday: <br />
                08:00 - 20:00
              </p>

              <p className={bodyText}>
                Saturday: <br />
                08:00 - 14:00
              </p>
            </div>

            <div className="mt-6 border-t border-gray-200/70 pt-5">
              <p className="mb-3 text-sm font-semibold text-gray-800">Follow us</p>

              <div className="flex justify-center gap-3 md:justify-start">
                <a href="" className={socialBtn} aria-label="Facebook">
                  <FaFacebook className="text-lg" />
                </a>

                <a href="" className={socialBtn} aria-label="Instagram">
                  <FaInstagram className="text-lg" />
                </a>
              </div>
            </div>
          </div>

          <div
            className={`${sectionCard} text-center md:col-span-2 md:text-left lg:col-span-1 lg:text-right`}
          >
            <h4 className={`${heading} mb-4`}>You need help?</h4>

            <nav
              className="flex flex-col items-center gap-1 md:items-start lg:items-end"
              aria-label="Footer help links"
            >
              {/* Hidden for admins — they manage support from /admin. */}
              {!isAdmin && (
                <Link to="/contact" className={helpLink}>
                  Contact Us
                </Link>
              )}
              <p className={helpLink}>About Us</p>
              <p className={helpLink}>Privacy Policies</p>
            </nav>
          </div>
        </div>
      </PageContainer>
    </footer>
  );
};

export default Footer;
