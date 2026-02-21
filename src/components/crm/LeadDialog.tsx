import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Lead } from "./LeadCard";
import type { PipelineStage } from "./PipelineColumn";

interface LeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead | null;
  stageId: string;
  stages: PipelineStage[];
  onSave: (data: { client_name: string; phone: string; email: string; source: string; notes: string; stage_id: string }, id?: string) => void;
  saving: boolean;
}

const leadSources = ["Website", "Referral", "Social Media", "Cold Call", "Email Campaign", "Walk-in", "Tender", "Other"];

const LeadDialog = ({ open, onOpenChange, lead, stageId, stages, onSave, saving }: LeadDialogProps) => {
  const [clientName, setClientName] = useState(lead?.client_name || "");
  const [phone, setPhone] = useState(lead?.phone || "");
  const [email, setEmail] = useState(lead?.email || "");
  const [source, setSource] = useState(lead?.source || "");
  const [notes, setNotes] = useState(lead?.notes || "");
  const [selectedStage, setSelectedStage] = useState(lead?.stage_id || stageId);

  // Reset form when lead changes
  useState(() => {
    setClientName(lead?.client_name || "");
    setPhone(lead?.phone || "");
    setEmail(lead?.email || "");
    setSource(lead?.source || "");
    setNotes(lead?.notes || "");
    setSelectedStage(lead?.stage_id || stageId);
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(
      { client_name: clientName.trim(), phone: phone.trim(), email: email.trim(), source, notes: notes.trim(), stage_id: selectedStage },
      lead?.id
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{lead ? "Edit Lead" : "Add New Lead"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Client Name *</Label>
            <Input value={clientName} onChange={(e) => setClientName(e.target.value)} required maxLength={100} placeholder="John Doe" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} placeholder="+27 ..." />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} placeholder="john@example.com" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Source of Lead</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  {leadSources.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Stage</Label>
              <Select value={selectedStage} onValueChange={setSelectedStage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} rows={3} placeholder="Additional notes..." />
          </div>
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Saving..." : lead ? "Update Lead" : "Add Lead"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LeadDialog;
