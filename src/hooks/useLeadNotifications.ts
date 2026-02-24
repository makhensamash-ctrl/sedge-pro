import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Shows toast notifications when leads assigned to the current user
 * are updated, moved, or receive new comments.
 */
export function useLeadNotifications(userId: string | undefined) {
  const leadsCache = useRef<Map<string, { stage_id: string; assigned_to: string | null }>>(new Map());
  const initialised = useRef(false);

  useEffect(() => {
    if (!userId) return;

    // Seed cache so we can diff changes
    const seed = async () => {
      const { data } = await supabase
        .from("leads")
        .select("id, stage_id, assigned_to");
      if (data) {
        const map = new Map<string, { stage_id: string; assigned_to: string | null }>();
        data.forEach((l) => map.set(l.id, { stage_id: l.stage_id, assigned_to: l.assigned_to }));
        leadsCache.current = map;
      }
      initialised.current = true;
    };
    seed();

    const channel = supabase
      .channel("lead-notifications")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "leads" },
        (payload) => {
          if (!initialised.current) return;
          const updated = payload.new as {
            id: string;
            client_name: string;
            stage_id: string;
            assigned_to: string | null;
          };

          const prev = leadsCache.current.get(updated.id);

          // Only notify if assigned to the current user
          if (updated.assigned_to !== userId) {
            // Check if they just got assigned to us
            if (prev?.assigned_to !== userId && updated.assigned_to === userId) {
              toast.info(`You were assigned to "${updated.client_name}"`);
            }
            leadsCache.current.set(updated.id, {
              stage_id: updated.stage_id,
              assigned_to: updated.assigned_to,
            });
            return;
          }

          // Detect what changed
          if (prev && prev.stage_id !== updated.stage_id) {
            toast.info(`"${updated.client_name}" was moved to a new stage`);
          } else if (prev && prev.assigned_to !== updated.assigned_to && updated.assigned_to === userId) {
            toast.info(`You were assigned to "${updated.client_name}"`);
          } else {
            toast.info(`"${updated.client_name}" was updated`);
          }

          leadsCache.current.set(updated.id, {
            stage_id: updated.stage_id,
            assigned_to: updated.assigned_to,
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "lead_comments" },
        async (payload) => {
          if (!initialised.current) return;
          const comment = payload.new as {
            lead_id: string;
            author_id: string;
          };

          // Don't notify for own comments
          if (comment.author_id === userId) return;

          // Check if this lead is assigned to us
          const cached = leadsCache.current.get(comment.lead_id);
          if (cached?.assigned_to !== userId) return;

          // Fetch lead name for the notification
          const { data: lead } = await supabase
            .from("leads")
            .select("client_name")
            .eq("id", comment.lead_id)
            .maybeSingle();

          toast.info(`New comment on "${lead?.client_name || "a lead"}"`);
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "leads" },
        (payload) => {
          const old = payload.old as { id: string; client_name?: string; assigned_to?: string | null };
          if (old.assigned_to === userId) {
            toast.warning(`Lead "${old.client_name || ""}" was deleted`);
          }
          leadsCache.current.delete(old.id);
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "leads" },
        (payload) => {
          const newLead = payload.new as {
            id: string;
            client_name: string;
            stage_id: string;
            assigned_to: string | null;
          };
          leadsCache.current.set(newLead.id, {
            stage_id: newLead.stage_id,
            assigned_to: newLead.assigned_to,
          });
          if (newLead.assigned_to === userId) {
            toast.info(`New lead "${newLead.client_name}" assigned to you`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);
}
