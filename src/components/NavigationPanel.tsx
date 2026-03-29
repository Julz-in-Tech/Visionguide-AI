import React from "react";
import { motion } from "motion/react";
import { Navigation, MapPin, AlertCircle, Mic, Globe } from "lucide-react";
import { SALanguage, LANGUAGES, TRANSLATIONS } from "../types";

interface NavigationPanelProps {
  instruction: string | null;
  destination: string;
  onDestinationChange: (dest: string) => void;
  lang: SALanguage;
  onLanguageChange: (lang: SALanguage) => void;
  isListening: boolean;
  onStartListening: () => void;
}

export const NavigationPanel: React.FC<NavigationPanelProps> = ({
  instruction,
  destination,
  onDestinationChange,
  lang,
  onLanguageChange,
  isListening,
  onStartListening,
}) => {
  const t = TRANSLATIONS[lang];

  return (
    <div className="flex flex-col gap-4 p-6 bg-[#151619] rounded-2xl border border-white/10 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Navigation className="w-5 h-5 text-[#00FF00]" />
          <span className="text-[10px] font-mono uppercase tracking-wider text-white/50">
            Navigation System
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#00FF00] animate-pulse" />
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#00FF00]">
            Live Active
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {/* Language Selector */}
        <div className="space-y-2">
          <label className="text-[10px] font-mono uppercase tracking-wider text-white/30 flex items-center gap-1">
            <Globe className="w-3 h-3" /> Language
          </label>
          <select
            value={lang}
            onChange={(e) => onLanguageChange(e.target.value as SALanguage)}
            className="w-full bg-black/40 border border-white/10 rounded-lg py-2 px-3 text-xs font-mono text-white focus:outline-none focus:border-[#00FF00]/50 transition-colors appearance-none cursor-pointer"
          >
            {Object.entries(LANGUAGES).map(([code, name]) => (
              <option key={code} value={code} className="bg-[#151619]">
                {name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-mono uppercase tracking-wider text-white/30">
            Destination
          </label>
          <div className="relative flex gap-2">
            <div className="relative flex-1">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="text"
                value={destination}
                onChange={(e) => onDestinationChange(e.target.value)}
                placeholder="e.g. McDonald's"
                className="w-full bg-black/40 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-sm font-mono text-white placeholder:text-white/20 focus:outline-none focus:border-[#00FF00]/50 transition-colors"
              />
            </div>
            <button
              onClick={onStartListening}
              className={`p-3 rounded-lg border transition-all ${
                isListening
                  ? "bg-[#00FF00] border-[#00FF00] text-black animate-pulse"
                  : "bg-black/40 border-white/10 text-white/50 hover:border-[#00FF00]/50"
              }`}
              title="Voice Assistant"
            >
              <Mic className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-mono uppercase tracking-wider text-white/30">
            Real-time Guidance
          </label>
          <motion.div
            initial={false}
            animate={{
              backgroundColor: instruction ? "rgba(0, 255, 0, 0.1)" : "rgba(255, 255, 255, 0.02)",
              borderColor: instruction ? "rgba(0, 255, 0, 0.3)" : "rgba(255, 255, 255, 0.1)",
            }}
            className="min-h-[100px] flex flex-col items-center justify-center p-6 rounded-xl border border-dashed text-center"
          >
            {instruction ? (
              <>
                <AlertCircle className="w-8 h-8 text-[#00FF00] mb-3" />
                <p className="text-lg font-mono font-medium text-white tracking-tight leading-tight">
                  {instruction}
                </p>
              </>
            ) : (
              <p className="text-sm font-mono text-white/30">
                {t.scanning}
              </p>
            )}
          </motion.div>
        </div>
      </div>

      <div className="pt-4 border-t border-white/5">
        <p className="text-[9px] font-mono text-white/20 leading-relaxed">
          SYSTEM NOTICE: Use with caution. This is an assistive tool and should not replace primary navigation aids like a white cane or guide dog.
        </p>
      </div>
    </div>
  );
};
