import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SiteCard = {
  id: string;
  section: string;
  title: string;
  description: string;
  icon: string;
  position: number;
};

export function useSiteSetting<T = any>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(fallback);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase
      .from("site_settings")
      .select("value")
      .eq("key", key)
      .maybeSingle()
      .then(({ data }) => {
        if (mounted) {
          if (data?.value) setValue(data.value as T);
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [key]);

  return { value, loading };
}

export function useSiteCards(section: string) {
  const [cards, setCards] = useState<SiteCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase
      .from("site_cards")
      .select("*")
      .eq("section", section)
      .order("position", { ascending: true })
      .then(({ data }) => {
        if (mounted) {
          setCards((data as SiteCard[]) ?? []);
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [section]);

  return { cards, loading };
}
