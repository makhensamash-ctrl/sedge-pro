import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Phone, Mail, Globe, GripVertical, Pencil, Trash2, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface Lead {
  id: string;
  client_name: string;
  phone: string | null;
  email: string | null;
  source: string | null;
  stage_id: string;
  position: number;
  notes: string | null;
  created_at: string;
  assigned_to: string | null;
}

interface LeadCardProps {
  lead: Lead;
  onEdit: (lead: Lead) => void;
  onDelete: (id: string) => void;
  onOpenDetail: (lead: Lead) => void;
  assigneeName?: string | null;
}

const LeadCard = ({ lead, onEdit, onDelete, onOpenDetail, assigneeName }: LeadCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lead.id, data: { type: "lead", lead } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-card border border-border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow group cursor-pointer"
      onClick={() => onOpenDetail(lead)}
    >
      <div className="flex items-start justify-between gap-2">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing mt-1 text-muted-foreground/40 hover:text-muted-foreground"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm text-foreground truncate">{lead.client_name}</h4>
          {lead.phone && (
            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
              <Phone className="w-3 h-3 shrink-0" />
              <span className="truncate">{lead.phone}</span>
            </div>
          )}
          {lead.email && (
            <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
              <Mail className="w-3 h-3 shrink-0" />
              <span className="truncate">{lead.email}</span>
            </div>
          )}
          {lead.source && (
            <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
              <Globe className="w-3 h-3 shrink-0" />
              <span className="truncate">{lead.source}</span>
            </div>
          )}
          {assigneeName && (
            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-primary/80">
              <UserCircle className="w-3 h-3 shrink-0" />
              <span className="truncate">{assigneeName}</span>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onEdit(lead); }}>
            <Pencil className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(lead.id); }}>
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LeadCard;
