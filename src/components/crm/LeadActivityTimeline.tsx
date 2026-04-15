import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  PlusCircle,
  ArrowRight,
  UserPlus,
  UserMinus,
  MessageSquare,
  CheckSquare,
  Square,
  Pencil,
} from "lucide-react";

interface ActivityLog {
  id: string;
  lead_id: string;
  action: string;
  description: string | null;
  performed_by: string | null;
  created_at: string;
  performer_name?: string;
}

const ACTION_CONFIG: Record<string, { icon: typeof PlusCircle; color: string; label: string }> = {
  created: { icon: PlusCircle, color: "text-green-500", label: "Created" },
  stage_changed: { icon: ArrowRight, color: "text-blue-500", label: "Stage Changed" },
  assigned: { icon: UserPlus, color: "text-purple-500", label: "Assigned" },
  unassigned: { icon: UserMinus, color: "text-orange-500", label: "Unassigned" },
  comment_added: { icon: MessageSquare, color: "text-cyan-500", label: "Comment" },
  checklist_checked: { icon: CheckSquare, color: "text-emerald-500", label: "Checked" },
  checklist_unchecked: { icon: Square, color: "text-yellow-500", label: "Unchecked" },
  details_updated: { icon: Pencil, color: "text-amber-500", label: "Updated" },
};

const DEFAULT_CONFIG = { icon: Pencil, color: "text-muted-foreground", label: "Activity" };

export default function LeadActivityTimeline({ leadId }: { leadId: string }) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();

    const channel = supabase
      .channel(`lead-activity-${leadId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "lead_activity_log", filter: `lead_id=eq.${leadId}` },
        () => fetchActivities()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [leadId]);

  const fetchActivities = async () => {
    const { data } = await supabase
      .from("lead_activity_log")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false });

    if (!data) { setLoading(false); return; }

    // Enrich with performer names
    const performerIds = [...new Set(data.filter(a => a.performed_by).map(a => a.performed_by!))];
    let profileMap = new Map<string, string>();
    if (performerIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", performerIds);
      if (profiles) {
        profileMap = new Map(profiles.map(p => [p.user_id, p.full_name || p.email]));
      }
    }

    setActivities(data.map(a => ({
      ...a,
      performer_name: a.performed_by ? profileMap.get(a.performed_by) || undefined : undefined,
    })));
    setLoading(false);
  };

  const config = (action: string) => ACTION_CONFIG[action] || DEFAULT_CONFIG;

  if (loading) {
    return <p className="text-xs text-muted-foreground text-center py-4">Loading activity...</p>;
  }

  return (
    <div>
      <h4 className="text-sm font-medium mb-2">Activity Timeline</h4>
      <ScrollArea className="max-h-[200px] pr-2">
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No activity recorded</p>
        ) : (
          <div className="relative pl-5 space-y-3">
            {/* Vertical line */}
            <div className="absolute left-[7px] top-1 bottom-1 w-px bg-border" />
            {activities.map((activity) => {
              const cfg = config(activity.action);
              const Icon = cfg.icon;
              return (
                <div key={activity.id} className="relative flex gap-2">
                  <div className={`absolute -left-5 mt-0.5 rounded-full bg-background p-0.5 ${cfg.color}`}>
                    <Icon className="w-3 h-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground/80 leading-snug">
                      {activity.description || cfg.label}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(activity.created_at), "dd MMM yyyy, HH:mm")}
                      </span>
                      {activity.performer_name && (
                        <span className="text-[10px] text-muted-foreground">
                          by {activity.performer_name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
