import { useState, useEffect } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const quickOptions = [
  "I need more information",
  "I need assistance signing up",
  "I need to request a trial",
];

const ChatBubble = () => {
  const [open, setOpen] = useState(false);
  const [hasAutoOpened, setHasAutoOpened] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const section = document.getElementById("pricing");
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAutoOpened) {
          setOpen(true);
          setHasAutoOpened(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, [hasAutoOpened]);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="mb-4 w-80 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="bg-primary px-5 py-4 flex items-center justify-between">
              <div>
                <p className="text-primary-foreground font-semibold text-sm">SEDGE Pro Support</p>
                <p className="text-primary-foreground/60 text-xs">We typically reply instantly</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close chat">
                <X className="w-5 h-5 text-primary-foreground/70 hover:text-primary-foreground" />
              </button>
            </div>

            {/* Messages */}
            <div className="p-4 h-60 overflow-y-auto bg-surface flex flex-col gap-3">
              <div className="bg-accent/10 text-foreground text-sm p-3 rounded-xl rounded-tl-none max-w-[85%]">
                👋 Hi there! How can we help you today?
              </div>

              {!selected && (
                <div className="flex flex-col gap-2 mt-1">
                  {quickOptions.map((option) => (
                    <button
                      key={option}
                      onClick={() => setSelected(option)}
                      className="text-left text-sm px-4 py-2.5 rounded-xl border border-accent/30 bg-accent/5 text-foreground hover:bg-accent/15 hover:border-accent transition-colors"
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}

              {selected && (
                <>
                  <div className="bg-primary/10 text-foreground text-sm p-3 rounded-xl rounded-tr-none max-w-[85%] self-end">
                    {selected}
                  </div>
                  <div className="bg-accent/10 text-foreground text-sm p-3 rounded-xl rounded-tl-none max-w-[85%]">
                    Thanks for reaching out! A team member will be in touch shortly. You can also email us at <span className="font-semibold text-accent">info@sedgepro.co.za</span>.
                  </div>
                </>
              )}
            </div>

            {/* Input */}
            <div className="p-3 border-t border-border flex gap-2">
              <input
                className="flex-1 px-3 py-2 rounded-full bg-muted text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                placeholder="Type a message..."
              />
              <button className="w-9 h-9 rounded-full bg-accent flex items-center justify-center hover:bg-green-dark transition-colors">
                <Send className="w-4 h-4 text-accent-foreground" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setOpen(!open)}
        className="w-14 h-14 rounded-full bg-accent shadow-lg flex items-center justify-center hover:bg-green-dark transition-colors"
        aria-label="Chat now"
      >
        {open ? (
          <X className="w-6 h-6 text-accent-foreground" />
        ) : (
          <MessageCircle className="w-6 h-6 text-accent-foreground" />
        )}
      </button>
    </div>
  );
};

export default ChatBubble;
