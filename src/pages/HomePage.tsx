import { motion } from "motion/react";
import { Eye, Mic, Globe, ArrowRight, ShieldCheck, Zap, Heart, Languages, ChevronDown } from "lucide-react";
import { FeatureCard } from "../components/FeatureCard";
import { Button } from "../components/Button";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { SALanguage, LANGUAGES, TRANSLATIONS } from "../types";
import { translateText } from "../services/geminiService";
import { useSpeech } from "../hooks/useSpeech";

export default function HomePage() {
  const [lang, setLang] = useState<SALanguage>("en-ZA");
  const { speak } = useSpeech();
  const t = TRANSLATIONS[lang];

  const features = [
    {
      title: lang === "en-ZA" ? "Visual Assistance" : "Uncedo lokuBonwayo",
      description: lang === "en-ZA" 
        ? "Real-time object detection and navigation for visually impaired users."
        : "Ukufunyanwa kwezinto ngexesha lokwenyani kunye nokuhamba kwabasebenzisi abangaboniyo.",
      icon: Eye,
      to: "/vision",
      color: "#00FF00"
    },
    {
      title: lang === "en-ZA" ? "Speech & Hearing" : "Intetho kunye nokuva",
      description: lang === "en-ZA"
        ? "Advanced sign language interpretation and real-time speech-to-text conversion."
        : "Utoliko lolwimi lwezandla oluhambele phambili kunye nenguqulelo yentetho-ukuya-umbhalo.",
      icon: Mic,
      to: "/speech-hearing",
      color: "#FF00FF"
    },
    {
      title: lang === "en-ZA" ? "Eye Control" : "Ulawulo lweAmehlo",
      description: lang === "en-ZA"
        ? "Hands-free navigation using eye-tracking and blink detection."
        : "Ukuhamba ngaphandle kwezandla usebenzisa ukulandelela amehlo kunye nokufunyanwa kokuqhwanyaza.",
      icon: Globe,
      to: "/eye-control",
      color: "#00FFFF"
    }
  ];

  useEffect(() => {
    if (lang !== "en-ZA") {
      speak(`Language changed to ${LANGUAGES[lang]}`);
      translateText("Welcome to SignBridge. Empowering everyone through AI.", lang).then(translated => {
        setTimeout(() => speak(translated, lang), 1500);
      });
    }
  }, [lang, speak]);

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white selection:bg-[#00FF00]/30">
      {/* Header with Language Selector */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0c]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="text-2xl font-black tracking-tighter uppercase">
            Sign<span className="text-[#00FF00]">Bridge</span>
          </Link>

          <div className="relative group">
            <Button 
              variant="outline" 
              size="sm"
              className="bg-white/5 border-white/10 text-white/60 hover:text-white"
            >
              <Languages className="w-4 h-4 mr-2" />
              {LANGUAGES[lang]}
              <ChevronDown className="w-3 h-3 ml-2" />
            </Button>
            <div className="absolute top-full right-0 mt-2 w-48 bg-[#151619] border border-white/10 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all">
              {(Object.keys(LANGUAGES) as SALanguage[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`w-full text-left px-4 py-3 text-xs font-mono uppercase tracking-wider hover:bg-white/5 transition-colors ${
                    lang === l ? "text-[#00FF00]" : "text-white/60"
                  }`}
                >
                  {LANGUAGES[l]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 px-6 overflow-hidden">
        {/* Background Glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#00FF00]/10 rounded-full blur-[120px] -z-10" />
        
        <div className="max-w-7xl mx-auto text-center space-y-12">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-6"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono font-bold uppercase tracking-widest text-[#00FF00]">
              <ShieldCheck className="w-3 h-3" />
              Next-Gen Accessibility Engine
            </div>
            
            <h1 className="text-5xl md:text-8xl font-black tracking-tighter uppercase leading-[0.9]">
              {lang === "en-ZA" ? "Empowering" : "Ukuxhobisa"} <span className="text-transparent bg-clip-text bg-gradient-to-b from-[#00FF00] to-[#00AA00]">{lang === "en-ZA" ? "Everyone" : "Wonke umntu"}</span> <br />
              {lang === "en-ZA" ? "Through AI." : "Nge-AI."}
            </h1>
            
            <p className="max-w-2xl mx-auto text-lg text-white/50 font-medium leading-relaxed">
              {lang === "en-ZA" 
                ? "SignBridge is a professional-grade accessibility suite designed to bridge the gap between technology and human potential."
                : "I-SignBridge yisuti yokufikeleleka kwinqanaba lobuchwephesha eyenzelwe ukuvala umsantsa phakathi kwetekhnoloji kunye namandla omntu."}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="flex flex-wrap items-center justify-center gap-4"
          >
            <Link to="/vision">
              <Button size="lg" className="gap-3">
                Get Started <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/about">
              <Button variant="secondary" size="lg">
                Explore Mission
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-end justify-between mb-12 gap-6">
          <div className="space-y-4">
            <h2 className="text-4xl font-bold tracking-tight">Core Modules</h2>
            <p className="text-white/40 max-w-md">
              Specialized accessibility tools powered by hardware-accelerated neural networks.
            </p>
          </div>
          <Link to="/features" className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#00FF00] hover:underline">
            View All Features
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
            >
              <FeatureCard {...feature} />
            </motion.div>
          ))}
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-20 px-6 border-t border-white/5 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
          {[
            { icon: Zap, title: "Real-Time Inference", desc: "Low-latency processing directly in your browser for instant feedback." },
            { icon: ShieldCheck, title: "Privacy First", desc: "All data stays on your device. No cloud uploads, no tracking." },
            { icon: Heart, title: "Inclusive Design", desc: "Built with feedback from the accessibility community." },
          ].map((item) => (
            <div key={item.title} className="flex gap-6">
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                <item.icon className="w-6 h-6 text-[#00FF00]" />
              </div>
              <div className="space-y-2">
                <h4 className="font-bold text-white">{item.title}</h4>
                <p className="text-sm text-white/40 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
