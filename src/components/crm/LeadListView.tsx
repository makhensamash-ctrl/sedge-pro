import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import type { Lead } from "./LeadCard";
import type { PipelineStage } from "./PipelineColumn";

interface LeadListViewProps {
  leads: Lead[];
  stages: PipelineStage[];
  adminMap: Map<string, string>;
  assignmentsMap: Map<string, string[]>;
  onEditLead: (lead: Lead) => void;
  onDeleteLead: (id: string) => void;
  onOpenDetail: (lead: Lead) => void;
}

const getInitials = (name: string) =>
  name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

const packageColors: Record<string, string> = {
  "Certificates & Invoicing": "bg-blue-500/10 text-blue-700 border-blue-200",
  "Profitability Management": "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  "Project Collaboration Service": "bg-violet-500/10 text-violet-700 border-violet-200",
};

const LeadListView = ({ leads, stages, adminMap, assignmentsMap, onEditLead, onDeleteLead, onOpenDetail }: LeadListViewProps) => {
  const stageMap = new Map(stages.map((s) => [s.id, s]));

  return (
    <div className="rounded-lg border bg-card overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Stage</TableHead>
            <TableHead>Package</TableHead>
            <TableHead>Assigned</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.length === 0 && (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                No leads found
              </TableCell>
            </TableRow>
          )}
          {leads.map((lead) => {
            const stage = stageMap.get(lead.stage_id);
            const assigneeIds = assignmentsMap.get(lead.id) || [];
            const assigneeNames = assigneeIds.map((id) => adminMap.get(id)).filter(Boolean) as string[];
            const pkgClass = lead.package ? packageColors[lead.package] || "bg-muted text-muted-foreground" : "";

            return (
              <TableRow
                key={lead.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onOpenDetail(lead)}
              >
                <TableCell className="font-medium">{lead.client_name}</TableCell>
                <TableCell className="text-muted-foreground">{lead.email || "—"}</TableCell>
                <TableCell className="text-muted-foreground">{lead.phone || "—"}</TableCell>
                <TableCell>
                  {stage && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
                      <span className="text-sm">{stage.name}</span>
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      lead.package ? pkgClass : "bg-muted/50 text-muted-foreground border-border"
                    }`}
                  >
                    {lead.package || "None"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {assigneeNames.length > 0 ? (
                    <div className="flex -space-x-1.5">
                      {assigneeNames.slice(0, 3).map((name, i) => (
                        <Avatar key={i} className="h-6 w-6 ring-2 ring-background">
                          <AvatarFallback className="text-[9px] font-bold bg-primary text-primary-foreground">
                            {getInitials(name)}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {assigneeNames.length > 3 && (
                        <Avatar className="h-6 w-6 ring-2 ring-background">
                          <AvatarFallback className="text-[9px] font-bold bg-muted text-muted-foreground">
                            +{assigneeNames.length - 3}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">{lead.source || "—"}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {format(new Date(lead.created_at), "dd MMM yyyy")}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-0.5 justify-end" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEditLead(lead)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDeleteLead(lead.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default LeadListView;
