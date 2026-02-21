import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import PipelineColumn, { type PipelineStage } from "@/components/crm/PipelineColumn";
import LeadCard, { type Lead } from "@/components/crm/LeadCard";
import LeadDialog from "@/components/crm/LeadDialog";
import LeadDetailDialog from "@/components/crm/LeadDetailDialog";
import StageManager from "@/components/crm/StageManager";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

const CRM = () => {
  const { user } = useAuth();
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [addToStageId, setAddToStageId] = useState("");
  const [saving, setSaving] = useState(false);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [adminMap, setAdminMap] = useState<Map<string, string>>(new Map());

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const fetchStages = useCallback(async () => {
    const { data } = await supabase
      .from("pipeline_stages")
      .select("*")
      .order("position");
    setStages((data as PipelineStage[]) || []);
  }, []);

  const fetchLeads = useCallback(async () => {
    const { data } = await supabase
      .from("leads")
      .select("*")
      .order("position");
    setLeads((data as Lead[]) || []);
  }, []);

  const fetchAdminMap = useCallback(async () => {
    const { data: roles } = await supabase.from("user_roles").select("user_id");
    if (!roles) return;
    const userIds = roles.map((r) => r.user_id);
    const { data: profiles } = await supabase.from("profiles").select("user_id, email, full_name").in("user_id", userIds);
    const map = new Map<string, string>();
    profiles?.forEach((p) => map.set(p.user_id, p.full_name || p.email));
    setAdminMap(map);
  }, []);

  useEffect(() => {
    fetchStages();
    fetchLeads();
    fetchAdminMap();
  }, [fetchStages, fetchLeads, fetchAdminMap]);

  const handleAddLead = (stageId: string) => {
    setEditingLead(null);
    setAddToStageId(stageId);
    setDialogOpen(true);
  };

  const handleEditLead = (lead: Lead) => {
    setEditingLead(lead);
    setAddToStageId(lead.stage_id);
    setDialogOpen(true);
  };

  const handleDeleteLead = async (id: string) => {
    if (!confirm("Delete this lead?")) return;
    const { error } = await supabase.from("leads").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setLeads((prev) => prev.filter((l) => l.id !== id));
    toast.success("Lead deleted");
  };

  const handleSaveLead = async (
    data: { client_name: string; phone: string; email: string; source: string; notes: string; stage_id: string },
    id?: string
  ) => {
    setSaving(true);
    try {
      if (id) {
        const { error } = await supabase.from("leads").update(data).eq("id", id);
        if (error) throw error;
        setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...data } : l)));
        toast.success("Lead updated");
      } else {
        const stageLeads = leads.filter((l) => l.stage_id === data.stage_id);
        const maxPos = stageLeads.reduce((max, l) => Math.max(max, l.position), -1);
        const { data: newLead, error } = await supabase
          .from("leads")
          .insert({ ...data, position: maxPos + 1, created_by: user?.id })
          .select()
          .single();
        if (error) throw error;
        setLeads((prev) => [...prev, newLead as Lead]);
        toast.success("Lead added");
      }
      setDialogOpen(false);
      setEditingLead(null);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const lead = leads.find((l) => l.id === event.active.id);
    setActiveLead(lead || null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeLead = leads.find((l) => l.id === activeId);
    if (!activeLead) return;

    // Determine target stage
    const overLead = leads.find((l) => l.id === overId);
    const overStage = stages.find((s) => s.id === overId);
    const targetStageId = overLead ? overLead.stage_id : overStage ? overStage.id : null;

    if (targetStageId && activeLead.stage_id !== targetStageId) {
      setLeads((prev) =>
        prev.map((l) => (l.id === activeId ? { ...l, stage_id: targetStageId } : l))
      );
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveLead(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const lead = leads.find((l) => l.id === activeId);
    if (!lead) return;

    // Determine target stage
    const overLead = leads.find((l) => l.id === overId);
    const overStage = stages.find((s) => s.id === overId);
    const targetStageId = overLead ? overLead.stage_id : overStage ? overStage.id : lead.stage_id;

    // Reorder within stage
    const stageLeads = leads
      .filter((l) => l.stage_id === targetStageId)
      .sort((a, b) => a.position - b.position);

    const oldIndex = stageLeads.findIndex((l) => l.id === activeId);
    const newIndex = overLead ? stageLeads.findIndex((l) => l.id === overId) : stageLeads.length - 1;

    if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
      const reordered = arrayMove(stageLeads, oldIndex, newIndex);
      const updates = reordered.map((l, i) => ({ ...l, position: i }));

      setLeads((prev) => {
        const others = prev.filter((l) => l.stage_id !== targetStageId);
        return [...others, ...updates];
      });

      // Persist positions
      await Promise.all(
        updates.map((l) =>
          supabase.from("leads").update({ position: l.position, stage_id: targetStageId }).eq("id", l.id)
        )
      );
    } else {
      // Just moved to a different stage
      await supabase.from("leads").update({ stage_id: targetStageId }).eq("id", activeId);
    }
  };

  const handleAssignLead = async (leadId: string, userId: string | null) => {
    const { error } = await supabase.from("leads").update({ assigned_to: userId }).eq("id", leadId);
    if (error) { toast.error(error.message); return; }
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, assigned_to: userId } : l)));
    setDetailLead((prev) => prev && prev.id === leadId ? { ...prev, assigned_to: userId } : prev);
    toast.success(userId ? "Lead assigned" : "Lead unassigned");
  };

  const sortedStages = [...stages].sort((a, b) => a.position - b.position);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-foreground">CRM Pipeline</h2>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => { setAddToStageId(sortedStages[0]?.id || ""); setEditingLead(null); setDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Add Lead
          </Button>
          <StageManager stages={stages} onStagesChanged={fetchStages} />
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {sortedStages.map((stage) => (
            <PipelineColumn
              key={stage.id}
              stage={stage}
              leads={leads.filter((l) => l.stage_id === stage.id).sort((a, b) => a.position - b.position)}
              onAddLead={handleAddLead}
              onEditLead={handleEditLead}
              onDeleteLead={handleDeleteLead}
              onOpenDetail={(lead) => { setDetailLead(lead); setDetailOpen(true); }}
              adminMap={adminMap}
            />
          ))}
        </div>

        <DragOverlay>
          {activeLead && (
            <div className="rotate-3 opacity-90">
              <LeadCard lead={activeLead} onEdit={() => {}} onDelete={() => {}} onOpenDetail={() => {}} />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <LeadDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        lead={editingLead}
        stageId={addToStageId}
        stages={sortedStages}
        onSave={handleSaveLead}
        saving={saving}
      />

      <LeadDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        lead={detailLead}
        onAssign={handleAssignLead}
      />
    </div>
  );
};

export default CRM;
