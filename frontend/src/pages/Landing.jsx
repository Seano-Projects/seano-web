import { useState, useCallback } from "react";
import Banner from "../components/Section/Landing/Banner";
import SmoothFollower from "../components/Section/Landing/SmoothFollower";
import Navbar from "../components/Section/Landing/Layout/Navbar";
import Partner from "../components/Section/Landing/Partner";
import Feature from "../components/Section/Landing/Feature";
import Timeline from "../components/Section/Landing/Timeline";
import Publications from "../components/Section/Landing/Publications";
import Teams from "../components/Section/Landing/Teams";
import Footer from "../components/Section/Landing/Layout/Footer";
import LandingLoader, { loaderShown } from "../components/Section/Landing/LandingLoader";

const Landing = () => {
  // loaderShown is a module-level var: false on hard refresh, true after first show
  const [loaderDone, setLoaderDone] = useState(() => loaderShown);
  const handleLoaderDone = useCallback(() => setLoaderDone(true), []);

  return (
    <div className="font-openSans bg-black">
      {!loaderDone && <LandingLoader onDone={handleLoaderDone} />}
      {loaderDone && (
        <>
          <SmoothFollower />
          <Navbar />
          <Banner />
          <Partner />
          <Feature />
          <Timeline />
          <Publications />
          <Teams />
          <Footer />
        </>
      )}
    </div>
  );
};

export default Landing;
