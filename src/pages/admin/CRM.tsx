import { useState, useEffect, useCallback, useRef } from "react";
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
import LeadListView from "@/components/crm/LeadListView";
import { toast } from "sonner";
import { Plus, Search, X, LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  const [assignmentsMap, setAssignmentsMap] = useState<Map<string, string[]>>(new Map());
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAssignee, setFilterAssignee] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const dragOriginalStageRef = useRef<string | null>(null);

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

  const fetchAssignments = useCallback(async () => {
    const { data } = await supabase.from("lead_assignments").select("lead_id, user_id");
    const map = new Map<string, string[]>();
    data?.forEach((a: any) => {
      const existing = map.get(a.lead_id) || [];
      existing.push(a.user_id);
      map.set(a.lead_id, existing);
    });
    setAssignmentsMap(map);
  }, []);

  useEffect(() => {
    fetchStages();
    fetchLeads();
    fetchAdminMap();
    fetchAssignments();

    const channel = supabase
      .channel("crm-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leads" },
        () => { fetchLeads(); }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lead_comments" },
        () => { /* handled in LeadDetailDialog */ }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lead_assignments" },
        () => { fetchAssignments(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchStages, fetchLeads, fetchAdminMap, fetchAssignments]);

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
    data: { client_name: string; phone: string; email: string; source: string; notes: string; stage_id: string; package: string | null; generated_by: string | null },
    id?: string
  ) => {
    const saveData = { ...data, package: data.package === "none" ? null : data.package };
    setSaving(true);
    try {
      if (id) {
        const { error } = await supabase.from("leads").update(saveData).eq("id", id);
        if (error) throw error;
        setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...saveData } : l)));
        toast.success("Lead updated");
      } else {
        const stageLeads = leads.filter((l) => l.stage_id === saveData.stage_id);
        const maxPos = stageLeads.reduce((max, l) => Math.max(max, l.position), -1);
        const { data: newLead, error } = await supabase
          .from("leads")
          .insert({ ...saveData, position: maxPos + 1, created_by: user?.id })
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
    if (lead) {
      dragOriginalStageRef.current = lead.stage_id;
    }
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

    const originalStageId = dragOriginalStageRef.current || lead.stage_id;
    dragOriginalStageRef.current = null;

    // Determine target stage
    const overLead = leads.find((l) => l.id === overId);
    const overStage = stages.find((s) => s.id === overId);
    const targetStageId = overLead ? overLead.stage_id : overStage ? overStage.id : lead.stage_id;

    // If moving to a different stage, validate checklist
    if (targetStageId !== originalStageId) {
      const { data: criteria } = await supabase
        .from("stage_criteria")
        .select("id")
        .eq("stage_id", targetStageId);

      if (criteria && criteria.length > 0) {
        const { data: checks } = await supabase
          .from("lead_criteria_checks")
          .select("criteria_id, checked")
          .eq("lead_id", activeId)
          .in("criteria_id", criteria.map((c) => c.id))
          .eq("checked", true);

        if (!checks || checks.length === 0) {
          // Revert the optimistic stage change
          setLeads((prev) =>
            prev.map((l) => (l.id === activeId ? { ...l, stage_id: originalStageId } : l))
          );
          toast.error("Please check at least one criterion for the target stage before moving this lead. Open the lead card to complete the checklist.");
          return;
        }
      }
    }

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

  const handleToggleAssignment = async (leadId: string, userId: string) => {
    const currentAssignees = assignmentsMap.get(leadId) || [];
    if (currentAssignees.includes(userId)) {
      // Remove assignment
      const { error } = await supabase.from("lead_assignments").delete().eq("lead_id", leadId).eq("user_id", userId);
      if (error) { toast.error(error.message); return; }
      setAssignmentsMap((prev) => {
        const next = new Map(prev);
        next.set(leadId, currentAssignees.filter((id) => id !== userId));
        return next;
      });
      toast.success("Admin removed from lead");
    } else {
      // Add assignment
      const { error } = await supabase.from("lead_assignments").insert({ lead_id: leadId, user_id: userId });
      if (error) { toast.error(error.message); return; }
      setAssignmentsMap((prev) => {
        const next = new Map(prev);
        next.set(leadId, [...currentAssignees, userId]);
        return next;
      });
      toast.success("Admin assigned to lead");
    }
  };

  const query = searchQuery.toLowerCase().trim();
  const filteredLeads = leads.filter((l) => {
    const leadAssignees = assignmentsMap.get(l.id) || [];
    if (query) {
      const assigneeNames = leadAssignees.map((id) => adminMap.get(id)?.toLowerCase() || "").join(" ");
      const match =
        l.client_name.toLowerCase().includes(query) ||
        (l.email?.toLowerCase().includes(query)) ||
        (l.source?.toLowerCase().includes(query)) ||
        assigneeNames.includes(query);
      if (!match) return false;
    }
    if (filterAssignee === "unassigned") return leadAssignees.length === 0;
    if (filterAssignee !== "all") return leadAssignees.includes(filterAssignee);
    return true;
  });

  const hasFilters = query || filterAssignee !== "all";
  const sortedStages = [...stages].sort((a, b) => a.position - b.position);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-foreground">CRM Pipeline</h2>
        <div className="flex gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden">
            <Button
              variant={viewMode === "kanban" ? "default" : "ghost"}
              size="sm"
              className="rounded-none px-3"
              onClick={() => setViewMode("kanban")}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              className="rounded-none px-3"
              onClick={() => setViewMode("list")}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
          <Button size="sm" onClick={() => { setAddToStageId(sortedStages[0]?.id || ""); setEditingLead(null); setDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Add Lead
          </Button>
          <StageManager stages={stages} onStagesChanged={fetchStages} />
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, source..."
            className="pl-9 h-9"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <Select value={filterAssignee} onValueChange={setFilterAssignee}>
          <SelectTrigger className="w-48 h-9">
            <SelectValue placeholder="Filter by assignee" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All assignees</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {Array.from(adminMap.entries()).map(([id, name]) => (
              <SelectItem key={id} value={id}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => { setSearchQuery(""); setFilterAssignee("all"); }}>
            Clear filters
          </Button>
        )}
      </div>

      {viewMode === "kanban" ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex divide-x divide-border overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-muted-foreground/30 scrollbar-track-transparent" style={{ scrollbarWidth: 'thin' }}>
            {sortedStages.map((stage) => (
              <PipelineColumn
                key={stage.id}
                stage={stage}
                leads={filteredLeads.filter((l) => l.stage_id === stage.id).sort((a, b) => a.position - b.position)}
                onAddLead={handleAddLead}
                onEditLead={handleEditLead}
                onDeleteLead={handleDeleteLead}
                onOpenDetail={(lead) => { setDetailLead(lead); setDetailOpen(true); }}
                adminMap={adminMap}
                assignmentsMap={assignmentsMap}
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
      ) : (
        <LeadListView
          leads={filteredLeads}
          stages={sortedStages}
          adminMap={adminMap}
          assignmentsMap={assignmentsMap}
          onEditLead={handleEditLead}
          onDeleteLead={handleDeleteLead}
          onOpenDetail={(lead) => { setDetailLead(lead); setDetailOpen(true); }}
        />
      )}

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
        onToggleAssign={handleToggleAssignment}
        assignmentsMap={assignmentsMap}
      />
    </div>
  );
};

export default CRM;
