import { useState, useEffect } from "react";
import { HiX } from "react-icons/hi";
import logoSeano from "../../../../assets/logo_seano.webp";
import { useTranslation } from "../../../../hooks/useTranslation";

const Navbar = () => {
  const { t } = useTranslation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("");

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const sectionIds = ["about", "publications", "team", "contact"];

    const onScroll = () => {
      const scrollMid = window.scrollY + window.innerHeight * 0.35;
      let current = "";
      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (el && el.offsetTop <= scrollMid) current = id;
      }
      setActiveSection(current);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const navLinks = [
    { name: t("landing.navbar.about"),        href: "#about" },
    { name: t("landing.navbar.publications"), href: "#publications" },
    { name: t("landing.navbar.team"),         href: "#team" },
    { name: t("landing.navbar.contact"),      href: "#contact" },
  ];

  return (
    <>
      <div
        className={`w-full py-4 z-50 fixed top-0 left-0 right-0 transition-all duration-300 ${
          isScrolled ? "bg-black/50 backdrop-blur-md" : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1 group cursor-pointer">
              <img
                src={logoSeano}
                width={40}
                alt="Seano Logo"
                className="transition-transform duration-500 ease-in-out group-hover:scale-110 group-hover:rotate-3"
              />
              <h1 className="text-2xl font-semibold italic bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent transition-all duration-300 ease-in-out">
                Seano
              </h1>
            </div>

            <nav className="hidden md:block">
              <ul className="flex items-center gap-8">
                {navLinks.map((link) => {
                  const isActive = activeSection === link.href.replace("#", "");
                  return (
                    <li key={link.href}>
                      <a
                        href={link.href}
                        className={`font-medium transition-all duration-300 ease-in-out relative pb-1 after:absolute after:bottom-0 after:left-0 after:h-0.5 after:bg-linear-to-r after:from-primary after:to-secondary after:transition-all after:duration-500 after:ease-in-out hover:after:w-full ${
                          isActive
                            ? "text-primary after:w-full"
                            : "text-gray-200 hover:text-primary after:w-0"
                        }`}
                      >
                        {link.name}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div className="hidden md:flex items-center gap-3">
              <a
                href="/auth/login"
                className="relative px-6 py-2.5 text-white rounded-full font-medium shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-500 ease-in-out inline-block overflow-hidden bg-linear-to-r from-primary via-secondary to-primary bg-size-[200%_100%] bg-left hover:bg-right"
              >
                {t("landing.navbar.getItNow")}
              </a>
            </div>

            <button
              onClick={toggleMenu}
              className="md:hidden p-2 rounded-lg hover:bg-gray-800 transition-all duration-300 ease-in-out z-50 relative"
              aria-label="Toggle Menu"
            >
              <div className="w-6 h-6 flex flex-col justify-center gap-1.5">
                <span
                  className={`block w-full h-0.5 bg-gray-200 transition-all duration-300 ${
                    isMenuOpen ? "rotate-45 translate-y-2" : ""
                  }`}
                ></span>
                <span
                  className={`block w-full h-0.5 bg-gray-200 transition-all duration-300 ${
                    isMenuOpen ? "opacity-0" : ""
                  }`}
                ></span>
                <span
                  className={`block w-full h-0.5 bg-gray-200 transition-all duration-300 ${
                    isMenuOpen ? "-rotate-45 -translate-y-2" : ""
                  }`}
                ></span>
              </div>
            </button>
          </div>
        </div>
      </div>

      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 md:hidden ${
          isMenuOpen ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
        onClick={() => setIsMenuOpen(false)}
      ></div>

      <div
        className={`fixed top-0 right-0 h-full w-[80%] max-w-xs bg-[#0a0a0a]/95 backdrop-blur-xl z-50 transform transition-transform duration-300 ease-in-out md:hidden border-l border-white/10 ${
          isMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-1">
              <img src={logoSeano} width={32} alt="Seano Logo" />
              <h1 className="text-xl font-semibold italic bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent">
                Seano
              </h1>
            </div>
            <button
              onClick={() => setIsMenuOpen(false)}
              className="p-2 rounded-full hover:bg-white/10 transition-colors duration-300 group"
              aria-label="Close Menu"
            >
              <HiX className="w-6 h-6 text-gray-200 group-hover:text-primary transition-colors duration-300" />
            </button>
          </div>

          <nav className="flex-1">
            <ul className="flex flex-col gap-6">
              {navLinks.map((link, index) => {
                const isActive = activeSection === link.href.replace("#", "");
                return (
                  <li
                    key={link.href}
                    style={{ transitionDelay: `${index * 50}ms` }}
                    className={`transform transition-all duration-500 ${
                      isMenuOpen
                        ? "translate-x-0 opacity-100"
                        : "translate-x-10 opacity-0"
                    }`}
                  >
                    <a
                      href={link.href}
                      onClick={() => setIsMenuOpen(false)}
                      className={`text-lg font-medium transition-colors duration-300 block ${
                        isActive ? "text-primary" : "text-gray-200 hover:text-primary"
                      }`}
                    >
                      {link.name}
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div
            className={`mt-auto transform transition-all duration-500 delay-300 ${
              isMenuOpen
                ? "translate-y-0 opacity-100"
                : "translate-y-10 opacity-0"
            }`}
          >
            <a
              href="/auth/login"
              onClick={() => setIsMenuOpen(false)}
              className="w-full block text-center px-6 py-3 text-white rounded-full font-medium shadow-lg hover:shadow-xl transition-all duration-300 bg-linear-to-r from-primary via-secondary to-primary bg-size-[200%_100%] animate-gradient"
            >
              {t("landing.navbar.getItNow")}
            </a>
          </div>
        </div>
      </div>
    </>
  );
};

export default Navbar;
