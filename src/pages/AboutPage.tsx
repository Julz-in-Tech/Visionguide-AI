import { motion } from "motion/react";
import { ShieldCheck, Zap, Heart, ArrowLeft, Globe, Users, Code } from "lucide-react";
import { Link } from "react-router-dom";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white selection:bg-[#00FF00]/30 pt-32 pb-20 px-6">
      <div className="max-w-4xl mx-auto space-y-16">
        <Link to="/" className="inline-flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-widest text-white/40 hover:text-[#00FF00] transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Terminal
        </Link>

        <div className="space-y-6">
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase leading-[0.9]">
            Our <span className="text-[#00FF00]">Mission</span>.
          </h1>
          <p className="text-xl text-white/50 max-w-2xl leading-relaxed">
            VisionGuide AI is dedicated to creating a more inclusive world by leveraging the power of artificial intelligence to assist people with disabilities.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
              <Globe className="w-6 h-6 text-[#00FF00]" />
            </div>
            <h3 className="text-xl font-bold">Global Accessibility</h3>
            <p className="text-white/40 leading-relaxed">
              We believe that technology should be accessible to everyone, regardless of their physical abilities. Our goal is to break down barriers and empower individuals.
            </p>
          </div>

          <div className="space-y-4">
            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
              <Users className="w-6 h-6 text-[#00FF00]" />
            </div>
            <h3 className="text-xl font-bold">Community Driven</h3>
            <p className="text-white/40 leading-relaxed">
              Our tools are built with direct feedback from the accessibility community, ensuring that we address real-world challenges effectively.
            </p>
          </div>

          <div className="space-y-4">
            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
              <Code className="w-6 h-6 text-[#00FF00]" />
            </div>
            <h3 className="text-xl font-bold">Open Innovation</h3>
            <p className="text-white/40 leading-relaxed">
              We use cutting-edge AI models like TensorFlow.js to provide real-time, on-device processing, prioritizing user privacy and performance.
            </p>
          </div>

          <div className="space-y-4">
            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
              <Heart className="w-6 h-6 text-[#00FF00]" />
            </div>
            <h3 className="text-xl font-bold">Human Centric</h3>
            <p className="text-white/40 leading-relaxed">
              At the core of our technology is a commitment to human dignity and independence. We design for people, not just for devices.
            </p>
          </div>
        </div>

        <div className="p-12 bg-white/[0.02] border border-white/5 rounded-[40px] space-y-8">
          <h2 className="text-2xl font-bold">The VisionGuide Story</h2>
          <div className="space-y-4 text-white/50 leading-relaxed">
            <p>
              VisionGuide AI started as a research project focused on real-time object detection for the visually impaired. We recognized that the same underlying technology could be adapted to help users with speech, hearing, and motor impairments.
            </p>
            <p>
              Today, we are building a comprehensive accessibility suite that works directly in the browser, making advanced assistive technology available to anyone with a webcam and an internet connection.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
