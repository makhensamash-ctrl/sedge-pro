import { useState } from "react";
import { motion } from "framer-motion";
import heroImage from "@/assets/hero-image.jpg";
import VideoModal from "@/components/VideoModal";
import { useSiteSetting } from "@/hooks/useSiteContent";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";

type VideoSettings = {
  project_video_id?: string;
  project_video_label?: string;
  business_video_id?: string;
  business_video_label?: string;
};

type HeroSettings = {
  title_prefix: string;
  title_accent: string;
  subtitle: string;
  cta_label: string;
};

const DEFAULT_VIDEOS: VideoSettings = {
  project_video_id: "dQw4w9WgXcQ",
  project_video_label: "Watch Project Performance video",
  business_video_id: "dQw4w9WgXcQ",
  business_video_label: "Watch Business Performance demo",
};

const DEFAULT_HERO: HeroSettings = {
  title_prefix: "Better Project Decisions. Better Outcomes.",
  title_accent: "In Real Time.",
  subtitle:
    "The only platform that combines powerful construction management software with on-demand expert support — so your team can focus on the build, not the busywork.",
  cta_label: "View Pre-launch Promotion",
};

const HeroSection = () => {
  const { value: videos } = useSiteSetting<VideoSettings>("videos", DEFAULT_VIDEOS);
  const { value: hero } = useSiteSetting<HeroSettings>("hero", DEFAULT_HERO);
  const [activeVideo, setActiveVideo] = useState<{ id: string; title: string } | null>(null);

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);



  return (
    <section
      id="home"
      className="relative lg:min-h-[90vh] flex items-center px-8 py-16 mt-8 overflow-hidden bg-primary"
    >
      {/* Background image with overlay */}
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="Construction management platform with expert support"
          className="w-full h-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/80 via-primary/60 to-primary/30" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="max-w-xl"
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-primary-foreground mb-6">
              {hero.title_prefix}{" "}
              <span className="text-accent">{hero.title_accent}</span>
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/80 mb-8 leading-relaxed whitespace-pre-line">
              {hero.subtitle} 
            </p>
              <hr className="border-t border-white/20 my-8" />
            <div className="flex  gap-4 w-full max-w-2xl">
             
            

              {/* View Pre-launch Promotion button */}
            
              <a
                href="#prelaunch-promotion"
                 className="bg-[#5BB624] hover:bg-[#3F8A14] active:scale-95 text-white text-xs font-bold px-5 py-3.5 rounded-full flex items-center justify-center gap-1.5 shadow-lg shadow-[#5BB624]/20 transition-all shrink-0 cursor-pointer"
              >
                {hero.cta_label}
              </a>
                 <a
                href="#demo-form"
                 className="border border-[#5BB624] hover:bg-[#3F8A14] active:scale-95 text-white text-xs font-bold px-5 py-3.5 rounded-full flex items-center justify-center gap-1.5 shadow-lg shadow-[#5BB624]/20 transition-all shrink-0 cursor-pointer"
              >
                {'Access Demo'}
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="hidden lg:block"
          >
            <img
              src={heroImage}
              alt="Software dashboard and expert support team"
              className="rounded-2xl shadow-2xl w-full"
            />
          </motion.div>
        </div>
      </div>

      <VideoModal
        videoId={activeVideo?.id ?? null}
        title={activeVideo?.title}
        onClose={() => setActiveVideo(null)}
      />
    </section>
  );
};

export default HeroSection;
