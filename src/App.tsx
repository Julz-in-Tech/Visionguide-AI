import { Routes, Route, useLocation } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import HomePage from "./pages/HomePage";
import VisionAssistant from "./pages/VisionAssistant";
import SpeechHearing from "./pages/SpeechHearing";
import EyeControl from "./pages/EyeControl";
import AboutPage from "./pages/AboutPage";
import GlobalEyeTracking from "./components/GlobalEyeTracking";
import { useEffect } from "react";

export default function App() {
  const { pathname } = useLocation();

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white selection:bg-[#00FF00]/30">
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/vision" element={<VisionAssistant />} />
        <Route path="/speech-hearing" element={<SpeechHearing />} />
        <Route path="/eye-control" element={<EyeControl />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/features" element={<HomePage />} />
      </Routes>

      {/* Global eye tracking — available on ALL pages */}
      <GlobalEyeTracking />
    </div>
  );
}
