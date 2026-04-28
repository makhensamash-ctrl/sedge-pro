import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const VISITOR_KEY = "sedge_visitor_id";
const SESSION_KEY = "sedge_visit_logged";

function getOrCreateVisitorId(): string {
  let id = localStorage.getItem(VISITOR_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(VISITOR_KEY, id);
  }
  return id;
}

/**
 * Logs one visit per browser session (per tab lifetime).
 * Returning visitors keep the same visitor_id so we can distinguish
 * unique vs. total visits server-side.
 */
export function useVisitorTracking() {
  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) return;
    sessionStorage.setItem(SESSION_KEY, "1");

    const visitorId = getOrCreateVisitorId();
    supabase
      .from("site_visits")
      .insert({
        visitor_id: visitorId,
        user_agent: navigator.userAgent,
        referrer: document.referrer || null,
        path: window.location.pathname,
      })
      .then(({ error }) => {
        if (error) console.warn("Visit logging failed:", error.message);
      });
  }, []);
}
