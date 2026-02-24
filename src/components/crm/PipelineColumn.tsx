import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import LeadCard, { type Lead } from "./LeadCard";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export interface PipelineStage {
  id: string;
  name: string;
  color: string;
  position: number;
}

interface PipelineColumnProps {
  stage: PipelineStage;
  leads: Lead[];
  onAddLead: (stageId: string) => void;
  onEditLead: (lead: Lead) => void;
  onDeleteLead: (id: string) => void;
  onOpenDetail: (lead: Lead) => void;
  adminMap: Map<string, string>;
}

const PipelineColumn = ({ stage, leads, onAddLead, onEditLead, onDeleteLead, onOpenDetail, adminMap }: PipelineColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id, data: { type: "stage" } });

  return (
    <div className="flex flex-col w-72 shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
          <h3 className="font-semibold text-sm text-foreground">{stage.name}</h3>
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
            {leads.length}
          </span>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onAddLead(stage.id)}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* Droppable area */}
      <div
        ref={setNodeRef}
        className={`flex-1 space-y-2 p-2 rounded-lg min-h-[200px] transition-colors ${
          isOver ? "bg-accent/10 border-2 border-dashed border-accent" : "bg-muted/30"
        }`}
      >
        <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
          {leads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onEdit={onEditLead}
              onDelete={onDeleteLead}
              onOpenDetail={onOpenDetail}
              assigneeName={lead.assigned_to ? adminMap.get(lead.assigned_to) : null}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
};

export default PipelineColumn;
