import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Eye, Menu, X, Globe, Mic, Info } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Home", path: "/" },
    { name: "Features", path: "/features" },
    { name: "About", path: "/about" },
  ];

  return (
    <nav 
      className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 ${
        scrolled ? "bg-black/60 backdrop-blur-xl border-b border-white/5 py-3" : "bg-transparent py-6"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-[#00FF00] flex items-center justify-center transition-transform group-hover:scale-110">
            <Eye className="w-6 h-6 text-black" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-mono font-black tracking-tighter uppercase leading-none">
              VisionGuide<span className="text-[#00FF00]">AI</span>
            </span>
            <span className="text-[8px] font-mono text-white/40 uppercase tracking-widest">
              Accessibility Engine
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`text-[10px] font-mono font-bold uppercase tracking-widest transition-colors ${
                location.pathname === link.path ? "text-[#00FF00]" : "text-white/60 hover:text-white"
              }`}
            >
              {link.name}
            </Link>
          ))}
          <Link to="/vision" className="px-5 py-2 rounded-lg bg-white/5 border border-white/10 text-[10px] font-mono font-bold uppercase tracking-widest hover:bg-white/10 transition-colors">
            Launch App
          </Link>
        </div>

        {/* Mobile Toggle */}
        <button 
          className="md:hidden p-2 text-white/60 hover:text-white"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-full left-0 right-0 bg-[#0a0a0c] border-b border-white/5 p-6 md:hidden"
          >
            <div className="flex flex-col gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsOpen(false)}
                  className="text-sm font-mono font-bold uppercase tracking-widest text-white/60"
                >
                  {link.name}
                </Link>
              ))}
              <Link 
                to="/vision" 
                onClick={() => setIsOpen(false)}
                className="w-full py-4 rounded-xl bg-[#00FF00] text-black text-center font-mono font-bold uppercase tracking-widest"
              >
                Launch App
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};
