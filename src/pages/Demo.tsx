import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Building2, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  FileText, 
  HardHat, 
  HelpCircle, 
  MessageSquare, 
  Send, 
  Sparkles, 
  TrendingUp, 
  Users, 
  ArrowLeft,
  ChevronRight,
  AlertTriangle,
  Play,
  Plus,
  Compass,
  Briefcase
} from "lucide-react";
import { toast } from "sonner";

// Sample pre-loaded mock data
interface Task {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  progress: number;
  completed: boolean;
}

interface Project {
  id: string;
  name: string;
  location: string;
  manager: string;
  budget: string;
  spent: string;
  progress: number;
  rfiCount: number;
  completionDate: string;
  tasks: Task[];
}

const initialProjects: Project[] = [
  {
    id: "buro-eredo",
    name: "Buro Eredo Mixed-Use",
    location: "Cape Town, WC",
    manager: "Pieter van der Merwe (Sedge Specialist)",
    budget: "R42,500,000",
    spent: "R34,800,000",
    progress: 82,
    rfiCount: 1,
    completionDate: "12 Oct 2026",
    tasks: [
      { id: "be-1", name: "Site Clearance & Excavations", startDate: "May 1", endDate: "May 20", progress: 100, completed: true },
      { id: "be-2", name: "Foundation & Reinforced Piling", startDate: "May 21", endDate: "Jun 15", progress: 100, completed: true },
      { id: "be-3", name: "Concrete Structural Frame (Floor 1-14)", startDate: "Jun 16", endDate: "Aug 30", progress: 85, completed: false },
      { id: "be-4", name: "Exterior Cladding & Glass Fitting", startDate: "Sep 1", endDate: "Oct 10", progress: 10, completed: false },
    ]
  },
  {
    id: "greenfield-tower",
    name: "Greenfield Residential Tower",
    location: "Sandton, GP",
    manager: "Sipho Ncube (Sedge Specialist)",
    budget: "R88,200,000",
    spent: "R56,400,000",
    progress: 64,
    rfiCount: 3,
    completionDate: "15 Jan 2027",
    tasks: [
      { id: "gt-1", name: "Earthworks & Soil Compaction", startDate: "Jun 1", endDate: "Jun 20", progress: 100, completed: true },
      { id: "gt-2", name: "Substructure Concrete Pouring", startDate: "Jun 21", endDate: "Jul 25", progress: 100, completed: true },
      { id: "gt-3", name: "Main Superstructure & Brickwork", startDate: "Jul 26", endDate: "Nov 30", progress: 45, completed: false },
      { id: "gt-4", name: "Electrical & Plumbing First-Fix", startDate: "Dec 1", endDate: "Jan 10", progress: 0, completed: false },
    ]
  },
  {
    id: "riverside-estate",
    name: "Riverside Lifestyle Estate",
    location: "Stellenbosch, WC",
    manager: "Anika Botha (Sedge Specialist)",
    budget: "R124,000,000",
    spent: "R18,200,000",
    progress: 15,
    rfiCount: 0,
    completionDate: "30 Jun 2027",
    tasks: [
      { id: "re-1", name: "Permits & Environmental Approvals", startDate: "Jul 1", endDate: "Jul 20", progress: 100, completed: true },
      { id: "re-2", name: "Civil Roads & Pipeline Infrastructure", startDate: "Jul 21", endDate: "Sep 10", progress: 30, completed: false },
      { id: "re-3", name: "Residential Units Framing", startDate: "Sep 11", endDate: "Mar 15", progress: 0, completed: false },
      { id: "re-4", name: "High-End Interior Finishings", startDate: "Mar 16", endDate: "Jun 20", progress: 0, completed: false },
    ]
  }
];

const Demo = () => {
  const [searchParams] = useSearchParams();
  const welcome = searchParams.get("welcome");
  
  const [email, setEmail] = useState<string>("guest@sedgepro.co.za");
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("buro-eredo");
  const [chatMessages, setChatMessages] = useState<Array<{ sender: "user" | "expert"; text: string; time: string }>>([
    { sender: "expert", text: "Welcome to Sedge Pro! I am your dedicated Operations Specialist. I keep your workspace up-to-date by inputting site logs and resolving RFIs.", time: "09:00" },
    { sender: "expert", text: "I've loaded your 3 active Gauteng & Western Cape projects with real timeline benchmarks. Give it a spin!", time: "09:01" }
  ]);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // Read email from localStorage if available
  useEffect(() => {
    const savedEmail = localStorage.getItem("sedge_lead_email");
    if (savedEmail) {
      setEmail(savedEmail);
    }

    if (welcome === "1") {
      toast.success("Demo workspace successfully configured and loaded!");
    }
  }, [welcome]);

  const activeProject = projects.find(p => p.id === selectedProjectId) || projects[0];

  // Helper to handle RFS / milestone completeness toggle
  const toggleTask = (taskId: string) => {
    const updatedProjects = projects.map(p => {
      if (p.id !== selectedProjectId) return p;

      const updatedTasks = p.tasks.map(t => {
        if (t.id !== taskId) return t;
        const newCompleted = !t.completed;
        return {
          ...t,
          completed: newCompleted,
          progress: newCompleted ? 100 : 0
        };
      });

      // Recalculate average progress based on completed tasks
      const completedCount = updatedTasks.filter(t => t.completed).length;
      const calculatedProgress = Math.round((completedCount / updatedTasks.length) * 100);

      return {
        ...p,
        tasks: updatedTasks,
        progress: calculatedProgress
      };
    });

    setProjects(updatedProjects);
    toast.success("Progress updated dynamically! Sedge dashboard recalculated metrics.", {
      icon: <TrendingUp className="w-4 h-4 text-[#5BB624]" />
    });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const userText = newMessage.trim();
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Add user message
    setChatMessages(prev => [...prev, { sender: "user", text: userText, time: timeStr }]);
    setNewMessage("");
    setIsTyping(true);

    // Simulate expert answer
    setTimeout(() => {
      setIsTyping(false);
      let expertText = "";
      
      const lower = userText.toLowerCase();
      if (lower.includes("price") || lower.includes("cost") || lower.includes("discount")) {
        expertText = "Since you signed up through our pre-launch portal, you qualify for 40% off our software + expert services bundle. That's R3,000/month instead of R5,000. Would you like me to reserve a slot?";
      } else if (lower.includes("rfi") || lower.includes("question") || lower.includes("pending")) {
        expertText = `I see there are ${activeProject.rfiCount} open RFIs on ${activeProject.name}. I am checking in with our site supervisor to resolve these. I'll post the updated signed paperwork here shortly.`;
      } else if (lower.includes("task") || lower.includes("gantt") || lower.includes("milestone")) {
        expertText = `You can toggle project milestones on the Gantt widget to simulate task completions. Sedge Pro recalculates the completion rate automatically.`;
      } else {
        expertText = `Got it! I am on standby to log these notes for ${activeProject.name}. As a Sedge Specialist, my role is to process your WhatsApp reports and update this platform, keeping your builders in sync.`;
      }

      setChatMessages(prev => [...prev, { sender: "expert", text: expertText, time: timeStr }]);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#061A33] text-white flex flex-col font-sans">
      
      {/* Blueprint Grid Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none" 
      />

      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#0B2545] to-[#0A203C] border-b border-white/10 px-6 py-4 flex flex-wrap gap-4 items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-slate-400 hover:text-white transition-colors p-1.5 hover:bg-white/5 rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="bg-[#5BB624] text-white p-2 rounded-xl">
              <HardHat className="w-6 h-6" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-white block">Sedge <span className="text-[#5BB624]">Pro</span></span>
              <span className="text-[10px] text-slate-400 font-mono tracking-wider">WORKSPACE PREVIEW</span>
            </div>
          </div>
        </div>

        {welcome && (
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="hidden md:flex items-center gap-2.5 bg-[#5BB624]/10 border border-[#5BB624]/30 px-4 py-1.5 rounded-full text-xs font-semibold text-[#5BB624]"
          >
            <Sparkles className="w-4 h-4 animate-spin-slow" />
            Founding Member Slot Locked in for: {email}
          </motion.div>
        )}

        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1 rounded-full text-xs text-slate-300">
            <span className="w-2 h-2 rounded-full bg-[#5BB624] animate-pulse" />
            Demo Mode Active
          </div>
          <Link
            to="/#prelaunch-promotion"
            className="bg-[#5BB624] hover:bg-[#3F8A14] active:scale-95 text-white text-xs font-extrabold px-4 py-2 rounded-full transition-all shadow-lg shadow-[#5BB624]/10"
          >
            Claim discount
          </Link>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_360px] overflow-hidden">
        
        {/* Left Column: Interactive Project Suite */}
        <div className="p-6 md:p-8 overflow-y-auto space-y-6">
          
          {/* Dashboard Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Project Portfolio</h1>
              <p className="text-xs md:text-sm text-slate-400 mt-1">
                Select a project below to interact with real-time operational checklists, budget sheets, and milestone timelines.
              </p>
            </div>
            
            {/* Project Quick Tab Switcher */}
            <div className="flex bg-[#0B2545]/60 border border-white/10 p-1.5 rounded-2xl gap-1 shrink-0 overflow-x-auto">
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedProjectId(p.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    selectedProjectId === p.id 
                      ? "bg-[#5BB624] text-white shadow-md shadow-[#5BB624]/10"
                      : "hover:bg-white/5 text-slate-300 hover:text-white"
                  }`}
                >
                  {p.name.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Project Detailed Hero Card */}
          <div className="bg-gradient-to-br from-[#0B2545] to-[#081C35] rounded-3xl border border-white/10 p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-[#5BB624]/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-6 items-start relative z-10">
              <div>
                <span className="bg-white/5 border border-white/10 text-xs px-2.5 py-1 rounded-full text-slate-300 font-semibold mb-3 inline-block">
                  {activeProject.location}
                </span>
                <h2 className="text-xl md:text-2xl font-bold mb-2">{activeProject.name}</h2>
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Users className="w-3.5 h-3.5 text-[#5BB624]" />
                  <span>Operations Specialist: </span>
                  <span className="text-white font-semibold">{activeProject.manager}</span>
                </div>
              </div>

              {/* Progress Ring Summary */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">COMPLETION</span>
                  <span className="text-2xl font-extrabold text-[#5BB624] block mt-0.5">{activeProject.progress}%</span>
                </div>
                <div className="w-14 h-14 relative flex items-center justify-center shrink-0">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
                    <motion.circle 
                      cx="28" 
                      cy="28" 
                      r="22" 
                      fill="none" 
                      stroke="#5BB624" 
                      strokeWidth="4" 
                      strokeDasharray={138}
                      strokeDashoffset={138 - (138 * activeProject.progress) / 100}
                      animate={{ strokeDashoffset: 138 - (138 * activeProject.progress) / 100 }}
                      transition={{ duration: 0.5 }}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute text-[8px] font-bold">RATE</span>
                </div>
              </div>
            </div>

            {/* Micro Dashboard KPI Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/10">
              <div className="bg-[#061A33]/70 border border-white/5 rounded-2xl p-4">
                <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  Total Budget
                </div>
                <span className="text-base font-extrabold text-white mt-1 block">{activeProject.budget}</span>
              </div>

              <div className="bg-[#061A33]/70 border border-white/5 rounded-2xl p-4">
                <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold">
                  <TrendingUp className="w-4 h-4 text-sky-400" />
                  Spent To Date
                </div>
                <span className="text-base font-extrabold text-white mt-1 block">{activeProject.spent}</span>
              </div>

              <div className="bg-[#061A33]/70 border border-white/5 rounded-2xl p-4">
                <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold">
                  <Clock className="w-4 h-4 text-amber-400" />
                  Target Delivery
                </div>
                <span className="text-sm font-extrabold text-slate-200 mt-1.5 block leading-none">{activeProject.completionDate}</span>
              </div>

              <div className="bg-[#061A33]/70 border border-white/5 rounded-2xl p-4">
                <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold">
                  <MessageSquare className="w-4 h-4 text-amber-500" />
                  Expert RFIs
                </div>
                <span className={`text-base font-extrabold mt-1 block ${activeProject.rfiCount > 0 ? "text-amber-500" : "text-slate-300"}`}>
                  {activeProject.rfiCount} Pending
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Gantt Widget & Checklists */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Milestones Card */}
            <div className="bg-[#0B2545]/40 border border-white/10 rounded-3xl p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-base flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-[#5BB624]" />
                    Phase Milestones
                  </h3>
                  <span className="text-[10px] bg-slate-800 text-slate-400 font-mono px-2 py-0.5 rounded uppercase font-bold select-none">
                    Toggle Complete
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                  Mark phases complete as they happen on-site. Your Sedge Expert verifies these milestones using your shared WhatsApp site logs!
                </p>

                <div className="space-y-3">
                  {activeProject.tasks.map((task) => (
                    <button
                      key={task.id}
                      onClick={() => toggleTask(task.id)}
                      className={`w-full flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all hover:bg-white/5 cursor-pointer ${
                        task.completed 
                          ? "bg-[#5BB624]/5 border-[#5BB624]/30 text-white" 
                          : "bg-white/5 border-white/5 text-slate-300 hover:border-white/10"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                          task.completed 
                            ? "bg-[#5BB624] border-[#5BB624] text-white" 
                            : "border-slate-500"
                        }`}>
                          {task.completed && <CheckCircle2 className="w-3.5 h-3.5 fill-white stroke-[#5BB624]" />}
                        </div>
                        <div>
                          <span className={`text-xs font-bold block ${task.completed ? "line-through text-slate-400" : ""}`}>
                            {task.name}
                          </span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">Timeline: {task.startDate} - {task.endDate}</span>
                        </div>
                      </div>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                        task.completed ? "bg-[#5BB624]/20 text-[#5BB624]" : "bg-white/5 text-slate-400"
                      }`}>
                        {task.completed ? "Done" : `${task.progress}%`}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-slate-400 bg-white/5 -mx-6 -mb-6 p-4 rounded-b-3xl">
                <span>Verified with satellite & log tracking</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Sync Active
                </span>
              </div>
            </div>

            {/* Gantt Graph Visual Widget */}
            <div className="bg-[#0B2545]/40 border border-white/10 rounded-3xl p-6 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2 mb-4">
                  <Calendar className="w-5 h-5 text-sky-400" />
                  Timeline Schedule
                </h3>
                <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                  Interactive Gantt projection map. Your specialist updates this graph daily based on morning log calls.
                </p>

                <div className="space-y-4">
                  {activeProject.tasks.map((task, idx) => {
                    const widthPercent = idx === 0 ? "w-full" : idx === 1 ? "w-11/12" : idx === 2 ? "w-2/3" : "w-1/4";
                    const alignClass = idx === 0 ? "ml-0" : idx === 1 ? "ml-4" : idx === 2 ? "ml-12" : "ml-20";

                    return (
                      <div key={task.id} className="space-y-1.5">
                        <div className="flex justify-between text-[10px] font-bold text-slate-400">
                          <span>{task.name}</span>
                          <span>{task.completed ? "100%" : `${task.progress}%`}</span>
                        </div>
                        <div className="w-full bg-white/5 h-4 rounded-full overflow-hidden relative">
                          <motion.div
                            className={`h-full rounded-full ${
                              task.completed 
                                ? "bg-gradient-to-r from-[#5BB624] to-[#4FA11F]" 
                                : "bg-gradient-to-r from-sky-500 to-indigo-600"
                            } ${widthPercent} ${alignClass}`}
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: 1 }}
                            style={{ originX: 0 }}
                            transition={{ duration: 0.6 }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-8 p-3.5 bg-sky-500/10 border border-sky-500/20 rounded-2xl flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-white">Weather delay alert active</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Heavy rainfall forecasted for Cape Town. Timeline has automatically adjusted safety margins.</p>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Right Sidebar: Sedge Live Support Operations Hub */}
        <div className="bg-[#0B2545] border-t lg:border-t-0 lg:border-l border-white/10 flex flex-col overflow-hidden h-[500px] lg:h-auto">
          
          {/* Sidebar Header */}
          <div className="p-4 border-b border-white/10 bg-[#061A33]/50 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="bg-[#5BB624] text-white p-1.5 rounded-lg">
                  <Users className="w-4 h-4" />
                </div>
                <span className="w-2.5 h-2.5 rounded-full bg-[#5BB624] border-2 border-[#0B2545] absolute -bottom-0.5 -right-0.5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white block">Sedge Support Desk</h4>
                <span className="text-[9px] text-[#5BB624] font-semibold flex items-center gap-1">
                  Dedicated specialist connected
                </span>
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 px-2 py-0.5 rounded text-[8px] text-slate-400 font-mono">
              Live Hub
            </div>
          </div>

          {/* Expert Intro Box */}
          <div className="bg-[#061A33]/20 p-4 border-b border-white/5 shrink-0">
            <div className="bg-[#5BB624]/10 border border-[#5BB624]/20 p-3 rounded-2xl flex gap-3 items-start">
              <HelpCircle className="w-4 h-4 text-[#5BB624] shrink-0 mt-0.5" />
              <div>
                <h5 className="text-[11px] font-bold text-white">Ask your Sedge Specialist:</h5>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                  Ask about "discount pricing", ask for "RFI updates", or "how to update a task". Pieter will reply instantly.
                </p>
              </div>
            </div>
          </div>

          {/* Message List */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 flex flex-col justify-end">
            <div className="space-y-4">
              {chatMessages.map((msg, index) => (
                <div 
                  key={index} 
                  className={`flex flex-col max-w-[85%] ${
                    msg.sender === "user" ? "ml-auto items-end" : "mr-auto items-start"
                  }`}
                >
                  <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-[#5BB624] text-white rounded-br-none"
                      : "bg-[#061A33] border border-white/10 text-slate-200 rounded-bl-none"
                  }`}>
                    {msg.text}
                  </div>
                  <span className="text-[9px] text-slate-400 mt-1 px-1">{msg.time}</span>
                </div>
              ))}

              {isTyping && (
                <div className="flex flex-col max-w-[80%] mr-auto items-start">
                  <div className="bg-[#061A33] border border-white/10 text-slate-400 px-3 py-2.5 rounded-2xl rounded-bl-none flex items-center gap-1 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Form Input */}
          <div className="p-4 border-t border-white/10 bg-[#061A33]/50 shrink-0">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Ask about 'discount pricing'..."
                className="flex-1 bg-[#061A33] border border-white/10 rounded-full px-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#5BB624]"
              />
              <button
                type="submit"
                className="bg-[#5BB624] hover:bg-[#3F8A14] active:scale-95 text-white p-2.5 rounded-full flex items-center justify-center transition-all shrink-0 cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

        </div>

      </div>

    </div>
  );
};

export default Demo;
