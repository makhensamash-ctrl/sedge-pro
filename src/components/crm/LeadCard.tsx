import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Phone, Mail, GripVertical, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

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
  package: string | null;
  generated_by: string | null;
}

interface LeadCardProps {
  lead: Lead;
  onEdit: (lead: Lead) => void;
  onDelete: (id: string) => void;
  onOpenDetail: (lead: Lead) => void;
  assigneeNames?: string[];
}

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const packageColors: Record<string, string> = {
  "Certificates & Invoicing": "bg-blue-500/10 text-blue-700 border-blue-200",
  "Profitability Management": "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  "Project Collaboration Service": "bg-violet-500/10 text-violet-700 border-violet-200",
};

const LeadCard = ({ lead, onEdit, onDelete, onOpenDetail, assigneeNames = [] }: LeadCardProps) => {
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
    opacity: isDragging ? 0.4 : 1,
  };

  const pkgClass = lead.package ? packageColors[lead.package] || "bg-muted text-muted-foreground" : "";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-card border border-border rounded-xl p-3.5 shadow-sm hover:shadow-lg hover:border-primary/20 transition-all duration-200 group cursor-pointer relative"
      onClick={() => onOpenDetail(lead)}
    >
      {/* Drag handle — top-left subtle dots */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 left-1.5 cursor-grab active:cursor-grabbing text-muted-foreground/20 hover:text-muted-foreground/60 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="w-3.5 h-3.5" />
      </div>

      {/* Top row: name + assignee avatar */}
      <div className="flex items-start justify-between gap-2 ml-4">
        <h4 className="font-semibold text-sm text-foreground leading-tight line-clamp-2">
          {lead.client_name}
        </h4>
        {assigneeNames.length > 0 && (
          <div className="flex -space-x-1.5 shrink-0">
            {assigneeNames.slice(0, 3).map((name, i) => (
              <Avatar key={i} className="h-6 w-6 ring-2 ring-background shadow-sm">
                <AvatarFallback className="text-[9px] font-bold bg-primary text-primary-foreground">
                  {getInitials(name)}
                </AvatarFallback>
              </Avatar>
            ))}
            {assigneeNames.length > 3 && (
              <Avatar className="h-6 w-6 ring-2 ring-background shadow-sm">
                <AvatarFallback className="text-[9px] font-bold bg-muted text-muted-foreground">
                  +{assigneeNames.length - 3}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        )}
      </div>

      {/* Contact info */}
      <div className="mt-2.5 ml-4 space-y-1">
        {lead.email && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Mail className="w-3 h-3 shrink-0 text-muted-foreground/60" />
            <span className="truncate">{lead.email}</span>
          </div>
        )}
        {lead.phone && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Phone className="w-3 h-3 shrink-0 text-muted-foreground/60" />
            <span className="truncate">{lead.phone}</span>
          </div>
        )}
      </div>

      {/* Footer: package badge + actions */}
      <div className="flex items-center justify-between mt-3 ml-4">
        <Badge
          variant="outline"
          className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
            lead.package ? pkgClass : "bg-muted/50 text-muted-foreground border-border"
          }`}
        >
          {lead.package || "No package"}
        </Badge>

        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-full hover:bg-muted"
            onClick={(e) => { e.stopPropagation(); onEdit(lead); }}
          >
            <Pencil className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-full hover:bg-destructive/10 text-destructive"
            onClick={(e) => { e.stopPropagation(); onDelete(lead.id); }}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LeadCard;
