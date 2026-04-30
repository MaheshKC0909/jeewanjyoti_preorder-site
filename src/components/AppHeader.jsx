import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import jjlogo from "../assets/jjlogo.png";

export default function AppHeader() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handle = () => setIsScrolled(window.scrollY > 30);
    window.addEventListener('scroll', handle);
    handle();
    return () => window.removeEventListener('scroll', handle);
  }, []);

  const navItems = [
    { name: 'Lifestyle', href: '/#lifestyle' },
    { name: 'About', href: '/#about' },
    { name: 'Features', href: '/#features' },
    { name: 'Blogs', href: '/blogs' },
    { name: 'Pricing', href: '/#pricing' },
    { name: 'Contact', href: '/#contact' },
  ];

  // Scroll to a section on the current page
  const scrollToSection = (hash) => {
    const el = document.querySelector(hash);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  // When landing page loads with a scrollTo state, perform the scroll
  // after a brief delay so framer-motion animations have initialised
  useEffect(() => {
    if (location.pathname === '/' && location.state?.scrollTo) {
      const hash = location.state.scrollTo;
      const timer = setTimeout(() => scrollToSection(hash), 120);
      // Clear state so back-navigation doesn't re-trigger the scroll
      navigate('/', { replace: true, state: {} });
      return () => clearTimeout(timer);
    }
  }, [location]);

  const handleNavClick = (href, e) => {
    e.preventDefault();
    setIsMobileMenuOpen(false);

    if (href === location.pathname) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (href.startsWith('/#')) {
      const targetHash = href.substring(1); // e.g. "#pricing"
      if (location.pathname === '/') {
        // Already on home page — smooth scroll
        scrollToSection(targetHash);
      } else {
        // On another page — navigate to home with scroll target in state
        // so we can scroll AFTER the page has rendered (avoids framer-motion race)
        navigate('/', { state: { scrollTo: targetHash } });
      }
    } else {
      navigate(href);
    }
  };

  const handleLogoClick = (e) => {
    e.preventDefault();
    if (location.pathname !== '/') {
      navigate('/');
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const isBlogs = location.pathname === '/blogs';

  // Header background classes
  const headerBg = isBlogs
    ? isScrolled
      ? 'bg-white/95 backdrop-blur-xl shadow-lg border-b border-gray-200'
      : 'bg-white shadow-sm border-b border-gray-100'
    : isScrolled
      ? 'bg-slate-900/95 backdrop-blur-xl shadow-2xl border-b border-emerald-500/10'
      : 'bg-transparent';

  // Nav link classes
  const navLinkBase = isBlogs
    ? 'text-gray-600 hover:text-emerald-600'
    : 'text-slate-300 hover:text-emerald-400';

  // Mobile menu button classes
  const mobileButtonClass = isBlogs
    ? 'lg:hidden p-2 text-gray-600 hover:text-gray-900 rounded-xl transition-colors'
    : 'lg:hidden p-2 text-slate-300 hover:text-white rounded-xl transition-colors';

  return (
    <motion.header
      initial={{ y: -100 }} animate={{ y: 0 }} transition={{ duration: 0.6, ease: "easeOut" }}
      className={`fixed top-0 w-full z-50 transition-all duration-500 ${headerBg}`}
    >
      <nav className="px-6 py-3">
        <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <motion.div whileHover={{ scale: 1.03 }} className="cursor-pointer flex items-center gap-2 md:gap-3" onClick={handleLogoClick}>
            <img src={jjlogo} alt="JJ Logo" className="h-8 w-8 md:h-10 md:w-10 object-contain" />
            <h1 className="text-xl md:text-2xl font-bold text-blue-500 whitespace-nowrap truncate">DIGITAL CARE</h1>
          </motion.div>

          <div className="hidden lg:flex items-center gap-8">
            {navItems.map((item, i) => {
              const isActive = item.href === '/blogs' && isBlogs;
              return (
                <motion.a key={item.name} href={item.href} onClick={(e) => handleNavClick(item.href, e)}
                  initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                  className={`${isActive ? 'text-emerald-600 font-semibold' : navLinkBase} font-medium transition-colors duration-200 text-sm tracking-wide`}>{item.name}
                </motion.a>
              );
            })}
          </div>

          <div className="hidden lg:flex items-center gap-3">
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => window.location.assign('/login')}
              className={`px-5 py-2 text-sm font-semibold rounded-xl transition-all duration-200 ${
                isBlogs
                  ? 'text-emerald-600 border border-emerald-500/40 hover:bg-emerald-50'
                  : 'text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/10'
              }`}>Login</motion.button>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => window.location.assign('/register')}
              className="px-5 py-2 text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl transition-all duration-200">Join Us</motion.button>
          </div>

          <motion.button whileTap={{ scale: 0.9 }}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={mobileButtonClass}>
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </motion.button>
        </div>

        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className={`lg:hidden mt-4 rounded-2xl overflow-hidden border ${
                isBlogs
                  ? 'bg-white shadow-xl border-gray-200'
                  : 'bg-slate-800/90 backdrop-blur-xl border-emerald-500/10'
              }`}>
              <div className="py-4">
                {navItems.map((item) => (
                  <a key={item.name} href={item.href}
                    className={`block px-6 py-3 font-medium transition-all duration-200 ${
                      isBlogs
                        ? 'text-gray-700 hover:text-emerald-600 hover:bg-emerald-50'
                        : 'text-slate-300 hover:text-emerald-400 hover:bg-emerald-500/5'
                    }`}
                    onClick={(e) => handleNavClick(item.href, e)}>{item.name}</a>
                ))}
                <div className={`mt-4 pt-4 px-6 flex gap-3 border-t ${isBlogs ? 'border-gray-200' : 'border-slate-700/50'}`}>
                  <button onClick={() => window.location.assign('/login')}
                    className={`flex-1 py-2.5 text-sm font-semibold rounded-xl border ${
                      isBlogs
                        ? 'text-emerald-600 border-emerald-500/40 hover:bg-emerald-50'
                        : 'text-emerald-400 border-emerald-500/30'
                    }`}>Login</button>
                  <button onClick={() => window.location.assign('/register')}
                    className="flex-1 py-2.5 text-sm font-semibold bg-emerald-500 text-white rounded-xl">Join Us</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </nav>
    </motion.header>
  );
}
