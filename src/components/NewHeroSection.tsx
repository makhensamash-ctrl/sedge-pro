import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Check, 
  ArrowRight, 
  Wrench, 
  Users, 
  Briefcase, 
  Building2, 
  TrendingUp, 
  HardHat, 
  Bell, 
  LayoutDashboard,
  Calendar,
  AlertCircle,
  Milestone
} from "lucide-react";
import supportTeamImg from "@/assets/support-team.png";

const NewHeroSection = () => {
  const [activeProjects, setActiveProjects] = useState(1);
  const [activeToast, setActiveToast] = useState(false);

  // Counter animation on mount
  useEffect(() => {
    const duration = 1500; // 1.5 seconds
    const target = 12;
    const stepTime = Math.abs(Math.floor(duration / target));
    
    let current = 1;
    const timer = setInterval(() => {
      current += 1;
      setActiveProjects(current);
      if (current >= target) {
        clearInterval(timer);
      }
    }, stepTime);
    
    return () => clearInterval(timer);
  }, []);

  // Periodic notification toast animation inside mock dashboard
  useEffect(() => {
    const toastInterval = setInterval(() => {
      setActiveToast(true);
      // Hide after 4 seconds
      const timeout = setTimeout(() => {
        setActiveToast(false);
      }, 4000);
      return () => clearTimeout(timeout);
    }, 8000);

    return () => clearInterval(toastInterval);
  }, []);

  return (
    <section
      id="new-hero"
      className="relative min-h-screen py-24 flex items-center overflow-hidden bg-gradient-to-b from-[#0B2545] to-[#061A33] text-white"
    >
      {/* Blueprint grid texture background */}
      <div 
        className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:40px_40px]" 
        style={{ maskImage: "radial-gradient(ellipse at center, black, transparent 80%)", WebkitMaskImage: "radial-gradient(ellipse at center, black, transparent 80%)" }}
      />
      
      {/* Background spotlights */}
      <div className="absolute top-1/4 right-0 w-96 h-96 bg-[#5BB624]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-80 h-80 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-12 lg:gap-16 items-center">
          
          {/* Left Column - Copy + Form */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col text-left"
          >
            {/* Pre-launch Badge */}
            <div className="inline-flex mr-auto mb-6 items-center gap-2 bg-[#E8F5DD]/10 border border-[#5BB624]/30 rounded-full px-4 py-1.5 text-sm font-semibold text-[#5BB624] tracking-wide">
              <span className="w-2 h-2 rounded-full bg-[#5BB624] animate-pulse" />
              Pre-launch • Founding members get 40% off
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-[1.1] mb-6">
              Better Project Decisions.<br />
              Better Outcomes.<br />
              <span className="text-[#5BB624] block mt-1">In Real Time.</span>
            </h1>

            {/* Subheadline */}
            <p className="text-base sm:text-lg text-slate-300 max-w-xl mb-8 leading-relaxed">
              The only platform that combines powerful construction management software with on-demand expert support — so your team can focus on the build, not the busywork.
            </p>

       

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8 w-full sm:w-auto">
              <a
                href="/demo?welcome=1"
                className="bg-[#5BB624] hover:bg-[#3F8A14] active:scale-95 text-white text-sm font-bold px-8 py-3.5 rounded-full flex items-center justify-center gap-2 shadow-lg shadow-[#5BB624]/20 transition-all cursor-pointer text-center"
              >
                Try the interactive demo
                <ArrowRight className="w-4 h-4" />
              </a>
              <button
                onClick={() => {
                  const el = document.getElementById("home");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
                className="bg-transparent border-2 border-white/85 hover:bg-white/10 text-white text-sm font-bold px-8 py-3.5 rounded-full flex items-center justify-center gap-2 transition-all cursor-pointer text-center"
              >
                Join the pre-launch list
              </button>
            </div>

            {/* Checkmarks row */}
            <div className="flex flex-wrap gap-x-6 gap-y-2 mb-10 text-xs text-slate-300">
              <div className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-[#5BB624]" />
                Founding pricing locked in
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-[#5BB624]" />
                Demo workspace in 30 seconds
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-[#5BB624]" />
                No credit card required
              </div>
            </div>

       
          </motion.div>

          {/* Right Column - Product + People Layered Composite */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative flex items-center justify-center w-full lg:max-w-xl"
          >
            {/* Spotlight Green Glow behind laptop */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-[#5BB624]/20 rounded-full blur-[80px] z-0" />

            {/* Outer Layered Container */}
            <div className="relative w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl z-10 aspect-[4/3] bg-[#061A33]">
              
              {/* Layer 1: Blurred Support Team Background */}
              <img
                src={supportTeamImg}
                alt="Sedge Pro expert operations and support team"
                className="absolute inset-0 w-full h-full object-cover opacity-35 filter blur-[2px] transition-transform hover:scale-105 z-10"
                style={{ transitionDuration: "10s" }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#061A33] via-[#061A33]/70 to-[#0B2545]/40 z-20" />

              {/* Layer 2: Dashboard Mockup floating inside Chrome frame */}
              <div className="absolute bottom-6 left-6 right-6 top-16 bg-[#0B2545]/90 backdrop-blur-sm rounded-xl border border-white/10 shadow-2xl overflow-hidden flex flex-col z-30 transform hover:-translate-y-1 transition-transform duration-500">
                
                {/* Window Chrome Header */}
                <div className="bg-[#061A33]/80 border-b border-white/10 px-4 py-2.5 flex items-center justify-between shrink-0">
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
                  </div>
                  <div className="bg-[#0B2545] border border-white/10 px-6 py-0.5 rounded text-[10px] text-slate-400 select-none font-mono">
                    app.sedgepro.co.za/projects
                  </div>
                  <div className="inline-flex items-center gap-1 bg-[#5BB624]/20 border border-[#5BB624]/40 text-[#5BB624] text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#5BB624] animate-ping" />
                    Live
                  </div>
                </div>

                {/* Dashboard Inner Body */}
                <div className="flex-1 p-4 overflow-y-auto space-y-4">
                  {/* Portfolio title */}
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">Portfolio Overview</h4>
                      <p className="text-[9px] text-slate-400 mt-0.5">Western Cape Region • Managed by Sedge Expert Team</p>
                    </div>
                    <div className="flex gap-1">
                      <span className="bg-[#5BB624]/20 text-[#5BB624] text-[9px] font-bold px-2 py-0.5 rounded">30d</span>
                      <span className="bg-white/5 text-slate-400 text-[9px] font-bold px-2 py-0.5 rounded">90d</span>
                    </div>
                  </div>

                  {/* KPI Row */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-[#061A33] border border-white/5 rounded-lg p-2.5">
                      <span className="text-[9px] text-slate-400 block font-medium">ACTIVE PROJECTS</span>
                      <span className="text-base font-extrabold text-white mt-0.5 block">{activeProjects}</span>
                      <span className="text-[8px] text-[#5BB624] font-semibold mt-0.5 block">▲ +2 this month</span>
                    </div>
                    <div className="bg-[#061A33] border border-white/5 rounded-lg p-2.5">
                      <span className="text-[9px] text-slate-400 block font-medium">ON SCHEDULE</span>
                      <span className="text-base font-extrabold text-[#5BB624] mt-0.5 block">83%</span>
                      <span className="text-[8px] text-[#5BB624] font-semibold mt-0.5 block">▲ +6 pts vs Q1</span>
                    </div>
                    <div className="bg-[#061A33] border border-white/5 rounded-lg p-2.5">
                      <span className="text-[9px] text-slate-400 block font-medium">BUDGET VARIANCE</span>
                      <span className="text-base font-extrabold text-[#5BB624] mt-0.5 block">-2.1%</span>
                      <span className="text-[8px] text-[#5BB624] font-semibold mt-0.5 block">▼ under target</span>
                    </div>
                  </div>

                  {/* SVG Chart area */}
                  <div className="bg-[#061A33] border border-white/5 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[9px] text-slate-400 font-bold block">PROJECT COMPLETION RATE</span>
                      <span className="text-[9px] text-white font-extrabold block">76% avg</span>
                    </div>
                    {/* SVG Line chart representing growth curve */}
                    <div className="relative w-full h-14 mt-1">
                      <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 30">
                        <defs>
                          <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#5BB624" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#5BB624" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        {/* Area shading below curve */}
                        <path
                          d="M 0 30 C 20 28, 40 22, 60 16 C 80 12, 90 6, 100 2 L 100 30 Z"
                          fill="url(#chartGlow)"
                        />
                        {/* Dynamic animated line path */}
                        <motion.path
                          d="M 0 30 C 20 28, 40 22, 60 16 C 80 12, 90 6, 100 2"
                          fill="none"
                          stroke="#5BB624"
                          strokeWidth="2"
                          strokeLinecap="round"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 1.8, ease: "easeOut" }}
                        />
                        {/* Pulsing indicator marker at end of curve */}
                        <circle cx="100" cy="2" r="2" fill="#5BB624" />
                        <circle cx="100" cy="2" r="5" fill="none" stroke="#5BB624" strokeWidth="1" className="animate-ping" />
                      </svg>
                    </div>
                  </div>

                  {/* Project List Snippets */}
                  <div className="space-y-1.5">
                    <div className="bg-[#061A33] border border-white/5 rounded-lg px-3 py-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#5BB624]" />
                        <span className="text-[10px] font-bold text-white">Buro Eredo Mixed-Use</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-16 bg-white/10 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-[#5BB624] h-full" style={{ width: "82%" }} />
                        </div>
                        <span className="text-[9px] font-bold text-[#5BB624]">82%</span>
                      </div>
                    </div>

                    <div className="bg-[#061A33] border border-white/5 rounded-lg px-3 py-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        <span className="text-[10px] font-bold text-white">Greenfield Tower</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-16 bg-white/10 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-amber-500 h-full" style={{ width: "64%" }} />
                        </div>
                        <span className="text-[9px] font-bold text-amber-500">64%</span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Layer 3: Floating Success Notification Toast */}
              <AnimatePresence>
                {activeToast && (
                  <motion.div
                    initial={{ opacity: 0, x: -30, y: 15 }}
                    animate={{ opacity: 1, x: 0, y: 15 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 100, damping: 15 }}
                    className="absolute bottom-16 left-10 z-40 bg-slate-900 border border-[#5BB624] text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2.5 max-w-[280px]"
                  >
                    <div className="bg-[#5BB624] text-white rounded-full p-1 shrink-0">
                      <Milestone className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#5BB624] animate-pulse" />
                        <span className="text-[9px] font-bold uppercase tracking-wider text-[#5BB624]">Milestone Alert</span>
                      </div>
                      <p className="text-[10px] font-bold text-white mt-0.5">Floor 14 slab cast completed</p>
                      <p className="text-[8px] text-slate-400 mt-0.5">Verified by Sedge Site Manager • Buro Eredo</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
};

export default NewHeroSection;
