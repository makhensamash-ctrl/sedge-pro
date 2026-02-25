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
    const [{ data: criteriaData }, { data: checksData }] = await Promise.all([
      supabase
        .from("stage_criteria")
        .select("id, label, position")
        .eq("stage_id", stageId)
        .order("position"),
      supabase
        .from("lead_criteria_checks")
        .select("criteria_id, checked")
        .eq("lead_id", leadId),
    ]);

    setCriteria((criteriaData as Criteria[]) || []);
    const map = new Map<string, boolean>();
    (checksData as CriteriaCheck[] | null)?.forEach((c) => map.set(c.criteria_id, c.checked));
    setChecks(map);
    setLoading(false);
  }, [leadId, stageId]);

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

  const checkedCount = criteria.filter((c) => checks.get(c.id)).length;
  const total = criteria.length;
  const progress = Math.round((checkedCount / total) * 100);

  return (
    <div className="pb-3 border-b border-border">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium">Stage Checklist</h4>
        <span className="text-xs text-muted-foreground">
          {checkedCount}/{total} complete
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-muted mb-3 overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

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
                    ? "text-muted-foreground line-through"
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
