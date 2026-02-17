import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const CookieConsent = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem("cookie-consent");
    if (!accepted) {
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const accept = () => {
    localStorage.setItem("cookie-consent", "true");
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-0 left-0 right-0 z-50 p-4"
        >
          <div className="container mx-auto max-w-4xl bg-card border border-border rounded-2xl shadow-xl p-5 flex flex-col sm:flex-row items-center gap-4">
            <p className="text-sm text-foreground/80 flex-1">
              We use cookies to improve your experience. By continuing to visit this site you agree to our use of cookies.{" "}
              <a href="#" className="text-accent underline">Learn more</a>.
            </p>
            <div className="flex gap-3 shrink-0">
              <button
                onClick={accept}
                className="bg-accent text-accent-foreground px-6 py-2 rounded-full text-sm font-semibold hover:bg-green-dark transition-colors"
              >
                Accept
              </button>
              <button
                onClick={() => setVisible(false)}
                className="border border-border text-foreground/70 px-6 py-2 rounded-full text-sm font-medium hover:bg-muted transition-colors"
              >
                Decline
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CookieConsent;
