import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Target } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const QUARTERS = ["Q1 (Jan–Mar)", "Q2 (Apr–Jun)", "Q3 (Jul–Sep)", "Q4 (Oct–Dec)"];

export interface RevenueTarget {
  id: string;
  period_type: string;
  period_year: number;
  period_month: number | null;
  period_quarter: number | null;
  target_amount_cents: number;
}

interface Props {
  targets: RevenueTarget[];
  onRefresh: () => void;
}

const RevenueTargetDialog = ({ targets, onRefresh }: Props) => {
  const [open, setOpen] = useState(false);
  const [periodType, setPeriodType] = useState<string>("monthly");
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [quarter, setQuarter] = useState<number>(1);
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 1 + i);

  const handleSave = async () => {
    const cents = Math.round(parseFloat(amount) * 100);
    if (!amount || isNaN(cents) || cents <= 0) {
      toast.error("Enter a valid target amount");
      return;
    }
    setSaving(true);
    const row: any = {
      period_type: periodType,
      period_year: year,
      period_month: periodType === "monthly" ? month : null,
      period_quarter: periodType === "quarterly" ? quarter : null,
      target_amount_cents: cents,
    };

    const { error } = await supabase.from("revenue_targets").upsert(row, {
      onConflict: "period_type,period_year,period_month,period_quarter",
    });
    setSaving(false);
    if (error) {
      toast.error("Failed to save target");
      console.error(error);
    } else {
      toast.success("Target saved");
      setAmount("");
      onRefresh();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("revenue_targets").delete().eq("id", id);
    if (error) toast.error("Failed to delete");
    else {
      toast.success("Target deleted");
      onRefresh();
    }
  };

  const formatPeriod = (t: RevenueTarget) => {
    if (t.period_type === "monthly") return `${MONTHS[(t.period_month || 1) - 1]} ${t.period_year}`;
    if (t.period_type === "quarterly") return `Q${t.period_quarter} ${t.period_year}`;
    return `${t.period_year}`;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
          <Target className="h-3.5 w-3.5" />
          Manage Targets
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Revenue Targets
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add new target */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Period Type</Label>
              <Select value={periodType} onValueChange={setPeriodType}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Year</Label>
              <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {periodType === "monthly" && (
              <div>
                <Label className="text-xs">Month</Label>
                <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {periodType === "quarterly" && (
              <div>
                <Label className="text-xs">Quarter</Label>
                <Select value={String(quarter)} onValueChange={(v) => setQuarter(Number(v))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {QUARTERS.map((q, i) => <SelectItem key={i} value={String(i + 1)}>{q}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label className="text-xs">Target (R)</Label>
              <Input className="h-9" type="number" placeholder="50000" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving} size="sm" className="w-full gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            {saving ? "Saving..." : "Add / Update Target"}
          </Button>

          {/* Existing targets */}
          {targets.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Period</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs text-right">Target</TableHead>
                    <TableHead className="text-xs w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {targets.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-sm font-medium">{formatPeriod(t)}</TableCell>
                      <TableCell className="text-sm capitalize">{t.period_type}</TableCell>
                      <TableCell className="text-sm text-right">R{(t.target_amount_cents / 100).toLocaleString()}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(t.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RevenueTargetDialog;
