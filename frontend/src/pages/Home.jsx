import React from "react";
import { useNavigate, Link } from "react-router-dom";
import HomeNavbar from "../components/HomeNavbar";
import Banner from "../components/Banner";
import PopularNow from "../components/PopularNow";
import Categories from "../components/Categories";
import Footer from "../components/Footer";
import Events from "../components/Events";


const Home = () => {
  const navigate = useNavigate();
  const name = localStorage.getItem("name") || "User";

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("name");
    navigate("/");
  };

  return (
    <div className="bg-[#f5efe9] min-h-screen  ">
      <HomeNavbar />
        <Banner />
        <div className="mt-12">
        <PopularNow />
      </div>
      <Categories />
      <Events />
      <Footer />

    </div>
  );
};

export default Home;