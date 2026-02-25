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
  assignmentsMap: Map<string, string[]>;
  totalCents?: number;
}

const formatCurrency = (cents: number) => {
  return new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(cents / 100);
};

const PipelineColumn = ({ stage, leads, onAddLead, onEditLead, onDeleteLead, onOpenDetail, adminMap, assignmentsMap, totalCents = 0 }: PipelineColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id, data: { type: "stage" } });

  return (
    <div className="flex flex-col w-72 shrink-0 px-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
            <h3 className="font-semibold text-sm text-foreground">{stage.name}</h3>
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
              {leads.length}
            </span>
          </div>
          {totalCents > 0 && (
            <span className="text-xs font-medium text-primary pl-5">
              {formatCurrency(totalCents)}
            </span>
          )}
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onAddLead(stage.id)}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* Droppable area */}
      <div
        ref={setNodeRef}
        className={`flex-1 space-y-2 p-2 rounded-lg min-h-[200px] max-h-[calc(100vh-220px)] overflow-y-auto transition-colors scrollbar-thin scrollbar-thumb-muted-foreground/30 scrollbar-track-transparent ${
          isOver ? "bg-accent/10 border-2 border-dashed border-accent" : "bg-muted/30"
        }`}
        style={{ scrollbarWidth: 'thin' }}
      >
        <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
          {leads.map((lead) => {
            const assigneeIds = assignmentsMap.get(lead.id) || [];
            const assigneeNames = assigneeIds.map((id) => adminMap.get(id)).filter(Boolean) as string[];
            return (
              <LeadCard
                key={lead.id}
                lead={lead}
                onEdit={onEditLead}
                onDelete={onDeleteLead}
                onOpenDetail={onOpenDetail}
                assigneeNames={assigneeNames}
              />
            );
          })}
        </SortableContext>
      </div>
    </div>
  );
};

export default PipelineColumn;
