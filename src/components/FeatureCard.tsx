import React from "react";
import { motion } from "motion/react";
import { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

interface FeatureCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  to: string;
  color?: string;
}

export const FeatureCard = ({ title, description, icon: Icon, to, color = "#00FF00" }: FeatureCardProps) => {
  return (
    <Link to={to} className="block w-full h-full">
      <motion.div
        whileHover={{ y: -5, scale: 1.02 }}
        className="group relative p-8 bg-[#151619] rounded-3xl border border-white/5 overflow-hidden transition-all hover:border-white/20 h-full"
      >
        {/* Background Glow */}
        <div
          className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[80px] opacity-0 group-hover:opacity-20 transition-opacity"
          style={{ backgroundColor: color }}
        />

        <div className="relative z-10 space-y-6">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center border border-white/10 bg-black/40"
            style={{ color }}
          >
            <Icon className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-bold text-white tracking-tight">{title}</h3>
            <p className="text-sm text-white/50 leading-relaxed">
              {description}
            </p>
          </div>

          <div className="inline-flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-widest text-white group-hover:text-[#00FF00] transition-colors">
            Launch Module
            <span className="w-4 h-px bg-white/20 group-hover:bg-[#00FF00] transition-all group-hover:w-8" />
          </div>
        </div>
      </motion.div>
    </Link>
  );
};
