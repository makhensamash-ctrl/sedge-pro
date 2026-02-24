import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { toast } from "sonner";
import { Settings, Plus, Pencil, Trash2, GripVertical } from "lucide-react";
import type { PipelineStage } from "./PipelineColumn";

interface StageManagerProps {
  stages: PipelineStage[];
  onStagesChanged: () => void;
}

const StageManager = ({ stages, onStagesChanged }: StageManagerProps) => {
  const { isSuperAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<PipelineStage | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#3B82F6");
  const [saving, setSaving] = useState(false);

  if (!isSuperAdmin) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingStage) {
        const { error } = await supabase
          .from("pipeline_stages")
          .update({ name, color })
          .eq("id", editingStage.id);
        if (error) throw error;
        toast.success("Stage updated");
      } else {
        const maxPos = stages.reduce((max, s) => Math.max(max, s.position), -1);
        const { error } = await supabase
          .from("pipeline_stages")
          .insert({ name, color, position: maxPos + 1 });
        if (error) throw error;
        toast.success("Stage added");
      }
      setName("");
      setColor("#3B82F6");
      setEditingStage(null);
      onStagesChanged();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this stage? All leads in it will be removed.")) return;
    const { error } = await supabase.from("pipeline_stages").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Stage deleted");
    onStagesChanged();
  };

  const startEdit = (stage: PipelineStage) => {
    setEditingStage(stage);
    setName(stage.name);
    setColor(stage.color);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditingStage(null); setName(""); setColor("#3B82F6"); } }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="w-4 h-4 mr-2" />
          Manage Stages
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Pipeline Stages</DialogTitle>
        </DialogHeader>

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Color</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stages.sort((a, b) => a.position - b.position).map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div className="w-5 h-5 rounded-full" style={{ backgroundColor: s.color }} />
                  </TableCell>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{s.position}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(s)}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(s.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <form onSubmit={handleSave} className="space-y-3 mt-4">
          <p className="text-sm font-medium">{editingStage ? "Edit Stage" : "Add New Stage"}</p>
          <div className="flex gap-3">
            <div className="flex-1 space-y-1">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Follow Up" />
            </div>
            <div className="space-y-1">
              <Label>Color</Label>
              <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-14 h-10 p-1 cursor-pointer" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={saving} size="sm">
              {saving ? "Saving..." : editingStage ? "Update" : "Add Stage"}
            </Button>
            {editingStage && (
              <Button type="button" variant="ghost" size="sm" onClick={() => { setEditingStage(null); setName(""); setColor("#3B82F6"); }}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default StageManager;
