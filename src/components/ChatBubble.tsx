import { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send, CheckCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

const quickOptions = [
  "I need more information",
  "I need assistance signing up",
  "I need to request a trial",
];

type Step = "options" | "details" | "submitting" | "done";

const ChatBubble = () => {
  const [open, setOpen] = useState(false);
  const [hasAutoOpened, setHasAutoOpened] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("options");
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const messagesRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: "smooth" });
  }, [step, selected]);

  const handleSelect = (option: string) => {
    setSelected(option);
    setStep("details");
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Name is required";
    if (!form.email.trim()) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errs.email = "Invalid email";
    if (!form.phone.trim()) errs.phone = "Phone is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setStep("submitting");
    try {
      await supabase.functions.invoke("create-lead", {
        body: {
          client_name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          source: "Website Chat",
          notes: selected || "",
        },
      });
    } catch {
      // Silently fail — lead capture is best-effort
    }
    setStep("done");
  };

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
            <div ref={messagesRef} className="p-4 h-72 overflow-y-auto bg-surface flex flex-col gap-3">
              <div className="bg-accent/10 text-foreground text-sm p-3 rounded-xl rounded-tl-none max-w-[85%]">
                👋 Hi there! How can we help you today?
              </div>

              {step === "options" && (
                <div className="flex flex-col gap-2 mt-1">
                  {quickOptions.map((option) => (
                    <button
                      key={option}
                      onClick={() => handleSelect(option)}
                      className="text-left text-sm px-4 py-2.5 rounded-xl border border-accent/30 bg-accent/5 text-foreground hover:bg-accent/15 hover:border-accent transition-colors"
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}

              {step !== "options" && selected && (
                <>
                  <div className="bg-primary/10 text-foreground text-sm p-3 rounded-xl rounded-tr-none max-w-[85%] self-end">
                    {selected}
                  </div>
                  <div className="bg-accent/10 text-foreground text-sm p-3 rounded-xl rounded-tl-none max-w-[85%]">
                    Great! Please share your details so we can get back to you:
                  </div>
                </>
              )}

              {step === "details" && (
                <div className="flex flex-col gap-2 mt-1">
                  <div>
                    <input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Full Name"
                      maxLength={100}
                      className="w-full px-3 py-2 rounded-lg bg-muted text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                    {errors.name && <p className="text-destructive text-xs mt-1">{errors.name}</p>}
                  </div>
                  <div>
                    <input
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="Email Address"
                      type="email"
                      maxLength={255}
                      className="w-full px-3 py-2 rounded-lg bg-muted text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                    {errors.email && <p className="text-destructive text-xs mt-1">{errors.email}</p>}
                  </div>
                  <div>
                    <input
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="Phone Number"
                      type="tel"
                      maxLength={20}
                      className="w-full px-3 py-2 rounded-lg bg-muted text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                    {errors.phone && <p className="text-destructive text-xs mt-1">{errors.phone}</p>}
                  </div>
                  <button
                    onClick={handleSubmit}
                    className="w-full py-2.5 rounded-xl bg-accent text-accent-foreground text-sm font-semibold hover:bg-green-dark transition-colors"
                  >
                    Submit
                  </button>
                </div>
              )}

              {step === "submitting" && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-accent" />
                </div>
              )}

              {step === "done" && (
                <div className="bg-accent/10 text-foreground text-sm p-3 rounded-xl rounded-tl-none max-w-[85%] flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                  <span>
                    Thank you, <strong>{form.name.trim()}</strong>! We'll contact you shortly at <strong>{form.email.trim()}</strong>.
                  </span>
                </div>
              )}
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
