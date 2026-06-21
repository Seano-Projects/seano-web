import { useState, useCallback } from "react";
import Banner from "../components/Section/Landing/Banner";
import SmoothFollower from "../components/Section/Landing/SmoothFollower";
import Navbar from "../components/Section/Landing/Layout/Navbar";
import Partner from "../components/Section/Landing/Partner";
import Feature from "../components/Section/Landing/Feature";
import Timeline from "../components/Section/Landing/Timeline";
import Publications from "../components/Section/Landing/Publications";
import ScrollVelocity from "../components/Section/Landing/ScrollVelocity";
import Teams from "../components/Section/Landing/Teams";
import Contact from "../components/Section/Landing/Contact";
import Footer from "../components/Section/Landing/Layout/Footer";
import LandingLoader, { loaderShown } from "../components/Section/Landing/LandingLoader";

const Landing = () => {
  // loaderShown is a module-level var: false on hard refresh, true after first show
  const [loaderDone, setLoaderDone] = useState(() => loaderShown);
  const handleLoaderDone = useCallback(() => setLoaderDone(true), []);

  return (
    <div className="font-openSans bg-black">
      {!loaderDone && <LandingLoader onDone={handleLoaderDone} />}
      <>
          <SmoothFollower />
          <Navbar />
          <Banner />
          <Partner />
          <Feature />
          <Timeline />
          <Publications />
          <div className="relative py-10 sm:py-16 overflow-hidden"
            style={{
              WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)',
              maskImage: 'linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)',
            }}
          >
            <ScrollVelocity
              texts={['Sea Autonomous Observer', 'Sea Autonomous Observer']}
              velocity={60}
              className="font-openSans font-bold tracking-tight text-white/10 uppercase select-none"
              scrollerStyle={{ fontSize: 'clamp(2.5rem, 8vw, 6rem)', lineHeight: 1.1 }}
              numCopies={5}
            />
          </div>
          <Teams />
          <div className="relative py-10 sm:py-16 overflow-hidden"
            style={{
              WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)',
              maskImage: 'linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)',
            }}
          >
            <ScrollVelocity
              texts={['Sea Autonomous Observer', 'Sea Autonomous Observer']}
              velocity={60}
              className="font-openSans font-bold tracking-tight text-white/10 uppercase select-none"
              scrollerStyle={{ fontSize: 'clamp(2.5rem, 8vw, 6rem)', lineHeight: 1.1 }}
              numCopies={5}
            />
          </div>
          <Contact />
          <Footer />
        </>
    </div>
  );
};

export default Landing;
