import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, Circle } from "lucide-react";

interface Criteria {
  id: string;
  label: string;
  position: number;
}

interface CriteriaCheck {
  criteria_id: string;
  checked: boolean;
}

interface LeadChecklistProps {
  leadId: string;
  stageId: string;
}

const LeadChecklist = ({ leadId, stageId }: LeadChecklistProps) => {
  const { user } = useAuth();
  const [criteria, setCriteria] = useState<Criteria[]>([]);
  const [checks, setChecks] = useState<Map<string, boolean>>(new Map());
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const [{ data: criteriaData }, { data: checksData }, { data: stageData }] = await Promise.all([
      supabase
        .from("stage_criteria")
        .select("id, label, position")
        .eq("stage_id", stageId)
        .order("position"),
      supabase
        .from("lead_criteria_checks")
        .select("criteria_id, checked")
        .eq("lead_id", leadId),
      supabase
        .from("pipeline_stages")
        .select("name")
        .eq("id", stageId)
        .single(),
    ]);

    const items = (criteriaData as Criteria[]) || [];
    setCriteria(items);

    // Auto-check all criteria for "New Lead" stage if no checks exist yet
    const existingChecks = (checksData as CriteriaCheck[] | null) || [];
    if (stageData?.name === "New Lead" && existingChecks.length === 0 && items.length > 0) {
      const inserts = items.map((c) => ({
        lead_id: leadId,
        criteria_id: c.id,
        checked: true,
        checked_by: user?.id || null,
        checked_at: new Date().toISOString(),
      }));
      await supabase.from("lead_criteria_checks").upsert(inserts, { onConflict: "lead_id,criteria_id" });
      const map = new Map<string, boolean>();
      items.forEach((c) => map.set(c.id, true));
      setChecks(map);
      setLoading(false);
      return;
    }
    const map = new Map<string, boolean>();
    (checksData as CriteriaCheck[] | null)?.forEach((c) => map.set(c.criteria_id, c.checked));
    setChecks(map);
    setLoading(false);
  }, [leadId, stageId, user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleCheck = async (criteriaId: string) => {
    const current = checks.get(criteriaId) || false;
    const newVal = !current;

    // Optimistic update
    setChecks((prev) => new Map(prev).set(criteriaId, newVal));

    const { error } = await supabase
      .from("lead_criteria_checks")
      .upsert(
        {
          lead_id: leadId,
          criteria_id: criteriaId,
          checked: newVal,
          checked_by: user?.id || null,
          checked_at: newVal ? new Date().toISOString() : null,
        },
        { onConflict: "lead_id,criteria_id" }
      );

    if (error) {
      // Revert on error
      setChecks((prev) => new Map(prev).set(criteriaId, current));
    }
  };

  if (loading || criteria.length === 0) return null;

  return (
    <div className="pb-3 border-b border-border">
      <h4 className="text-sm font-medium mb-2">Stage Checklist</h4>

      <div className="space-y-2">
        {criteria.map((c) => {
          const isChecked = checks.get(c.id) || false;
          return (
            <label
              key={c.id}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <Checkbox
                checked={isChecked}
                onCheckedChange={() => toggleCheck(c.id)}
                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <span
                className={`text-sm transition-colors ${
                  isChecked
                    ? "text-muted-foreground"
                    : "text-foreground group-hover:text-primary"
                }`}
              >
                {c.label}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
};

export default LeadChecklist;
