import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ICON_NAMES, getIcon } from "@/lib/iconMap";
import { Loader2, Plus, Trash2, ArrowUp, ArrowDown, Save, Download, Upload, FileJson, FileSpreadsheet, AlertTriangle, Pencil } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type SiteCard = {
  id: string;
  section: string;
  title: string;
  description: string;
  icon: string;
  position: number;
};

type SettingMap = Record<string, any>;

interface ServiceData {
  description: string;
  features: string[];
  is_active: boolean;
}

const parseServiceDescription = (raw: string): ServiceData => {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return {
        description: parsed.description || "",
        features: Array.isArray(parsed.features) ? parsed.features : [],
        is_active: typeof parsed.is_active === "boolean" ? parsed.is_active : true,
      };
    }
  } catch (e) {
    // Fail silently, fallback to standard text
  }
  return {
    description: raw || "",
    features: [],
    is_active: true,
  };
};

const serializeServiceDescription = (description: string, features: string[], is_active: boolean): string => {
  return JSON.stringify({
    description,
    features,
    is_active,
  });
};

const ServicesManager = ({
  cards,
  onReload,
}: {
  cards: SiteCard[];
  onReload: () => void;
}) => {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SiteCard | null>(null);
  const [saving, setSaving] = useState(false);

  // Form states
  const [title, setTitle] = useState("");
  const [icon, setIcon] = useState("Sparkles");
  const [description, setDescription] = useState("");
  const [featuresText, setFeaturesText] = useState("");
  const [isActive, setIsActive] = useState(true);

  const openAdd = () => {
    setEditing(null);
    setTitle("");
    setIcon("None");
    setDescription("");
    setFeaturesText("");
    setIsActive(true);
    setDialogOpen(true);
  };

  const openEdit = (card: SiteCard) => {
    setEditing(card);
    setTitle(card.title);
    setIcon(card.icon);
    
    const parsed = parseServiceDescription(card.description);
    setDescription(parsed.description);
    setFeaturesText(parsed.features.join("\n"));
    setIsActive(parsed.is_active);
    
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);

    const features = featuresText
      .split("\n")
      .map((f) => f.trim())
      .filter(Boolean);

    const serializedDesc = serializeServiceDescription(
      description.trim(),
      features,
      isActive
    );

    if (editing) {
      const { error } = await supabase
        .from("site_cards")
        .update({
          title: title.trim(),
          icon,
          description: serializedDesc,
        })
        .eq("id", editing.id);

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Service updated" });
      }
    } else {
      const maxPos = cards.reduce((max, c) => Math.max(max, c.position), -1);
      const { error } = await supabase.from("site_cards").insert({
        section: "services",
        title: title.trim(),
        icon,
        description: serializedDesc,
        position: maxPos + 1,
      });

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Service added" });
      }
    }

    setSaving(false);
    setDialogOpen(false);
    onReload();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this service?")) return;
    const { error } = await supabase.from("site_cards").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Service deleted" });
      onReload();
    }
  };

  const toggleActive = async (card: SiteCard) => {
    const parsed = parseServiceDescription(card.description);
    const serializedDesc = serializeServiceDescription(
      parsed.description,
      parsed.features,
      !parsed.is_active
    );

    const { error } = await supabase
      .from("site_cards")
      .update({ description: serializedDesc })
      .eq("id", card.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      onReload();
    }
  };

  const move = async (id: string, dir: -1 | 1) => {
    const sorted = [...cards].sort((a, b) => a.position - b.position);
    const idx = sorted.findIndex((c) => c.id === id);
    const swap = sorted[idx + dir];
    if (!swap) return;
    const a = sorted[idx];
    await supabase.from("site_cards").update({ position: swap.position }).eq("id", a.id);
    await supabase.from("site_cards").update({ position: a.position }).eq("id", swap.id);
    onReload();
  };

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-md">
        <CardContent className="pt-6 overflow-x-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h2 className="text-xl font-bold text-foreground">Services Cards</h2>
              <p className="text-sm text-muted-foreground mt-1">Manage the specific service cards shown on the website</p>
            </div>
            <Button onClick={openAdd}>
              <Plus className="w-4 h-4 mr-2" />
              Add Service
            </Button>
          </div>

          {cards.length === 0 ? (
            <p className="text-muted-foreground text-center py-12">No services yet. Add your first service.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Icon</TableHead>
                  <TableHead>Features</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-40">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cards.map((card, i) => {
                  const parsed = parseServiceDescription(card.description);
                  const Icon = getIcon(card.icon);
                  return (
                    <TableRow key={card.id} className={!parsed.is_active ? "opacity-50" : ""}>
                      <TableCell className="font-medium">{card.title}</TableCell>
                      <TableCell>
                        {card.icon && card.icon !== "None" ? (
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4 text-accent" />
                            <span className="text-xs text-muted-foreground">{card.icon}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">None</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {parsed.features.length} features
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={parsed.is_active ? "default" : "secondary"}
                          className="cursor-pointer"
                          onClick={() => toggleActive(card)}
                        >
                          {parsed.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 items-center">
                          <Button
                            size="icon"
                            variant="ghost"
                            disabled={i === 0}
                            onClick={() => move(card.id, -1)}
                          >
                            <ArrowUp className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            disabled={i === cards.length - 1}
                            onClick={() => move(card.id, 1)}
                          >
                            <ArrowDown className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => openEdit(card)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDelete(card.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Service" : "Add Service"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Service Name *</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="e.g. Quantity Surveying"
                />
              </div>
              <div className="space-y-2">
                <Label>Icon</Label>
                <Select value={icon} onValueChange={setIcon}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    <SelectItem value="None">None (No Icon)</SelectItem>
                    {ICON_NAMES.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short description (optional)"
              />
            </div>

            <div className="space-y-2">
              <Label>Features (one per line)</Label>
              <Textarea
                value={featuresText}
                onChange={(e) => setFeaturesText(e.target.value)}
                rows={5}
                placeholder={"Feature 1\nFeature 2\nFeature 3"}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={isActive} onCheckedChange={setIsActive} />
              <Label>Active</Label>
            </div>

            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? "Saving..." : editing ? "Update Service" : "Add Service"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const SectionForm = ({
  title,
  fields,
  values,
  onChange,
  onSave,
  saving,
}: {
  title: string;
  fields: { key: string; label: string; type?: "text" | "textarea" | "datetime-local" | "number" }[];
  values: Record<string, string>;
  onChange: (k: string, v: string) => void;
  onSave: () => void;
  saving: boolean;
}) => (
  <Card>
    <CardHeader>
      <CardTitle>{title}</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      {fields.map((f) => (
        <div key={f.key} className="space-y-1.5">
          <Label htmlFor={f.key}>{f.label}</Label>
          {f.type === "textarea" ? (
            <Textarea
              id={f.key}
              value={values[f.key] ?? ""}
              onChange={(e) => onChange(f.key, e.target.value)}
              rows={5}
            />
          ) : (
            <Input
              id={f.key}
              type={f.type ?? "text"}
              value={values[f.key] ?? ""}
              onChange={(e) => onChange(f.key, e.target.value)}
            />
          )}
        </div>
      ))}
      <Button onClick={onSave} disabled={saving}>
        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
        Save
      </Button>
    </CardContent>
  </Card>
);

const CardsManager = ({
  section,
  sectionLabel,
  cards,
  onReload,
}: {
  section: string;
  sectionLabel: string;
  cards: SiteCard[];
  onReload: () => void;
}) => {
  const { toast } = useToast();
  const [drafts, setDrafts] = useState<Record<string, SiteCard>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    const d: Record<string, SiteCard> = {};
    cards.forEach((c) => (d[c.id] = { ...c }));
    setDrafts(d);
  }, [cards]);

  const updateDraft = (id: string, patch: Partial<SiteCard>) =>
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const saveCard = async (id: string) => {
    setSavingId(id);
    const c = drafts[id];
    const { error } = await supabase
      .from("site_cards")
      .update({ title: c.title, description: c.description, icon: c.icon })
      .eq("id", id);
    setSavingId(null);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Saved" });
      onReload();
    }
  };

  const deleteCard = async (id: string) => {
    if (!confirm("Delete this item?")) return;
    const { error } = await supabase.from("site_cards").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Deleted" });
      onReload();
    }
  };

  const move = async (id: string, dir: -1 | 1) => {
    const sorted = [...cards].sort((a, b) => a.position - b.position);
    const idx = sorted.findIndex((c) => c.id === id);
    const swap = sorted[idx + dir];
    if (!swap) return;
    const a = sorted[idx];
    await supabase.from("site_cards").update({ position: swap.position }).eq("id", a.id);
    await supabase.from("site_cards").update({ position: a.position }).eq("id", swap.id);
    onReload();
  };

  const addCard = async () => {
    const maxPos = cards.reduce((m, c) => Math.max(m, c.position), -1);
    const { error } = await supabase.from("site_cards").insert({
      section,
      title: "New item",
      description: "",
      icon: "Sparkles",
      position: maxPos + 1,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      onReload();
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{sectionLabel}</CardTitle>
        <Button size="sm" onClick={addCard}>
          <Plus className="w-4 h-4 mr-2" />
          Add
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {cards.length === 0 && (
          <p className="text-sm text-muted-foreground">No items yet. Click Add to create one.</p>
        )}
        {cards.map((c, i) => {
          const d = drafts[c.id];
          if (!d) return null;
          const Icon = getIcon(d.icon);
          return (
            <div key={c.id} className="border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Icon className="w-4 h-4 text-accent" />
                  <span>#{i + 1}</span>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" disabled={i === 0} onClick={() => move(c.id, -1)}>
                    <ArrowUp className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={i === cards.length - 1}
                    onClick={() => move(c.id, 1)}
                  >
                    <ArrowDown className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => deleteCard(c.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Title</Label>
                  <Input value={d.title} onChange={(e) => updateDraft(c.id, { title: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Icon</Label>
                  <Select value={d.icon} onValueChange={(v) => updateDraft(c.id, { icon: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {ICON_NAMES.map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea
                  rows={3}
                  value={d.description}
                  onChange={(e) => updateDraft(c.id, { description: e.target.value })}
                />
              </div>
              <Button size="sm" onClick={() => saveCard(c.id)} disabled={savingId === c.id}>
                {savingId === c.id ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

// Helper to convert array of objects to CSV string
const convertToCSV = (data: any[], headers: string[]): string => {
  let str = headers.join(',') + '\r\n';

  for (let i = 0; i < data.length; i++) {
    let line = '';
    for (let j = 0; j < headers.length; j++) {
      if (line !== '') line += ',';
      
      const head = headers[j];
      let val = data[i][head];
      if (val === undefined || val === null) {
        val = '';
      } else if (typeof val === 'object') {
        val = JSON.stringify(val);
      }
      
      // Escape double quotes and wrap in quotes if contains comma, quote, or newline
      let valStr = String(val);
      if (valStr.includes('"') || valStr.includes(',') || valStr.includes('\n') || valStr.includes('\r')) {
        valStr = '"' + valStr.replace(/"/g, '""') + '"';
      }
      line += valStr;
    }
    str += line + '\r\n';
  }
  return str;
};

// Helper to trigger file download
const downloadFile = (content: string, contentType: string, filename: string) => {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// A robust RFC 4180-compliant CSV parser
const parseCSV = (text: string): string[][] => {
  const lines: string[][] = [];
  let row: string[] = [];
  let inQuotes = false;
  let currentValue = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentValue += '"';
          i++; // Skip next quote
        } else {
          inQuotes = false;
        }
      } else {
        currentValue += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(currentValue);
        currentValue = '';
      } else if (char === '\n' || char === '\r') {
        row.push(currentValue);
        currentValue = '';
        if (row.some(val => val !== '') || char === '\n') {
          lines.push(row);
        }
        row = [];
        if (char === '\r' && nextChar === '\n') {
          i++; // Skip LF if CRLF
        }
      } else {
        currentValue += char;
      }
    }
  }
  
  if (row.length > 0 || currentValue !== '') {
    row.push(currentValue);
    lines.push(row);
  }
  
  return lines;
};

const ContentManager = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<SettingMap>({});
  const [drafts, setDrafts] = useState<SettingMap>({});
  const [cards, setCards] = useState<SiteCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("hero");

  const [importingSettings, setImportingSettings] = useState(false);
  const [importingCards, setImportingCards] = useState(false);
  const [settingsFile, setSettingsFile] = useState<File | null>(null);
  const [cardsFile, setCardsFile] = useState<File | null>(null);

  const handleExportSettingsCSV = async () => {
    try {
      const { data, error } = await supabase.from("site_settings").select("key, value");
      if (error) throw error;
      if (!data || data.length === 0) {
        toast({ title: "No Data", description: "No site settings found to export." });
        return;
      }
      const csvContent = convertToCSV(data, ["key", "value"]);
      downloadFile(csvContent, "text/csv;charset=utf-8;", "site_settings_export.csv");
      toast({ title: "Export Success", description: "Site settings CSV downloaded successfully." });
    } catch (err: any) {
      toast({ title: "Export Failed", description: err.message, variant: "destructive" });
    }
  };

  const handleExportSettingsJSON = async () => {
    try {
      const { data, error } = await supabase.from("site_settings").select("key, value");
      if (error) throw error;
      if (!data || data.length === 0) {
        toast({ title: "No Data", description: "No site settings found to export." });
        return;
      }
      const jsonContent = JSON.stringify(data, null, 2);
      downloadFile(jsonContent, "application/json;charset=utf-8;", "site_settings_export.json");
      toast({ title: "Export Success", description: "Site settings JSON downloaded successfully." });
    } catch (err: any) {
      toast({ title: "Export Failed", description: err.message, variant: "destructive" });
    }
  };

  const handleExportCardsCSV = async () => {
    try {
      const { data, error } = await supabase
        .from("site_cards")
        .select("section, title, description, icon, position")
        .order("section")
        .order("position");
      if (error) throw error;
      if (!data || data.length === 0) {
        toast({ title: "No Data", description: "No site cards found to export." });
        return;
      }
      const csvContent = convertToCSV(data, ["section", "title", "description", "icon", "position"]);
      downloadFile(csvContent, "text/csv;charset=utf-8;", "site_cards_export.csv");
      toast({ title: "Export Success", description: "Site cards CSV downloaded successfully." });
    } catch (err: any) {
      toast({ title: "Export Failed", description: err.message, variant: "destructive" });
    }
  };

  const handleExportCardsJSON = async () => {
    try {
      const { data, error } = await supabase
        .from("site_cards")
        .select("section, title, description, icon, position")
        .order("section")
        .order("position");
      if (error) throw error;
      if (!data || data.length === 0) {
        toast({ title: "No Data", description: "No site cards found to export." });
        return;
      }
      const jsonContent = JSON.stringify(data, null, 2);
      downloadFile(jsonContent, "application/json;charset=utf-8;", "site_cards_export.json");
      toast({ title: "Export Success", description: "Site cards JSON downloaded successfully." });
    } catch (err: any) {
      toast({ title: "Export Failed", description: err.message, variant: "destructive" });
    }
  };

  const handleImportSettings = async () => {
    if (!settingsFile) return;
    
    const isJson = settingsFile.name.endsWith(".json");
    const isCsv = settingsFile.name.endsWith(".csv");
    
    if (!isJson && !isCsv) {
      toast({ title: "Invalid File", description: "Please upload a valid .csv or .json file.", variant: "destructive" });
      return;
    }

    if (!confirm("Are you sure you want to import these settings? This will overwrite existing keys with the new data.")) {
      return;
    }

    setImportingSettings(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        let items: { key: string; value: any }[] = [];

        if (isJson) {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) {
            const isValid = parsed.every(item => item && typeof item === "object" && "key" in item && "value" in item);
            if (!isValid) throw new Error("JSON must be an array of objects containing 'key' and 'value' fields.");
            items = parsed.map(item => ({ key: item.key, value: item.value }));
          } else if (typeof parsed === "object" && parsed !== null) {
            items = Object.entries(parsed).map(([key, value]) => ({ key, value }));
          } else {
            throw new Error("Invalid JSON structure. Must be an array of settings or key-value dictionary.");
          }
        } else {
          const rows = parseCSV(text);
          if (rows.length < 2) throw new Error("CSV file is empty or missing data.");
          
          const headers = rows[0].map(h => h.trim().toLowerCase());
          const keyIdx = headers.indexOf("key");
          const valIdx = headers.indexOf("value");

          if (keyIdx === -1 || valIdx === -1) {
            throw new Error("CSV is missing required headers: 'key' and 'value'.");
          }

          for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (row.length === 0 || (row.length === 1 && row[0] === "")) continue;
            
            const key = row[keyIdx]?.trim();
            const valueStr = row[valIdx]?.trim();

            if (!key) continue;

            let valueObj: any;
            try {
              valueObj = JSON.parse(valueStr);
            } catch {
              valueObj = valueStr;
            }
            items.push({ key, value: valueObj });
          }
        }

        if (items.length === 0) {
          throw new Error("No settings records found in the uploaded file.");
        }

        const { error } = await supabase.from("site_settings").upsert(items, { onConflict: "key" });
        if (error) throw error;

        toast({ title: "Import Success", description: `Successfully imported ${items.length} site settings records.` });
        loadAll(false);
      } catch (err: any) {
        toast({ title: "Import Failed", description: err.message, variant: "destructive" });
      } finally {
        setImportingSettings(false);
        setSettingsFile(null);
        const input = document.querySelector('input[type="file"]') as HTMLInputElement;
        if (input) input.value = "";
      }
    };

    reader.onerror = () => {
      toast({ title: "Error Reading File", description: "Failed to read the uploaded file.", variant: "destructive" });
      setImportingSettings(false);
    };

    reader.readAsText(settingsFile);
  };

  const handleImportCards = async () => {
    if (!cardsFile) return;

    const isJson = cardsFile.name.endsWith(".json");
    const isCsv = cardsFile.name.endsWith(".csv");

    if (!isJson && !isCsv) {
      toast({ title: "Invalid File", description: "Please upload a valid .csv or .json file.", variant: "destructive" });
      return;
    }

    if (!confirm("Are you sure you want to import these cards? This will delete all existing cards in the sections being imported and replace them with the new data.")) {
      return;
    }

    setImportingCards(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        let items: { section: string; title: string; description: string; icon: string; position: number }[] = [];

        if (isJson) {
          const parsed = JSON.parse(text);
          if (!Array.isArray(parsed)) throw new Error("JSON file must be an array of card records.");
          
          const isValid = parsed.every(
            item => item && typeof item === "object" && "section" in item && "title" in item
          );
          if (!isValid) throw new Error("JSON cards must contain at least 'section' and 'title' fields.");

          items = parsed.map(item => ({
            section: String(item.section),
            title: String(item.title),
            description: String(item.description || ""),
            icon: String(item.icon || "Sparkles"),
            position: Number(item.position ?? 0)
          }));
        } else {
          const rows = parseCSV(text);
          if (rows.length < 2) throw new Error("CSV file is empty or missing data.");

          const headers = rows[0].map(h => h.trim().toLowerCase());
          const secIdx = headers.indexOf("section");
          const titleIdx = headers.indexOf("title");
          const descIdx = headers.indexOf("description");
          const iconIdx = headers.indexOf("icon");
          const posIdx = headers.indexOf("position");

          if (secIdx === -1 || titleIdx === -1) {
            throw new Error("CSV is missing required columns: 'section' and 'title'.");
          }

          for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (row.length === 0 || (row.length === 1 && row[0] === "")) continue;

            const section = row[secIdx]?.trim();
            const title = row[titleIdx]?.trim();
            
            if (!section || !title) continue;

            const description = descIdx !== -1 ? row[descIdx]?.trim() : "";
            const icon = iconIdx !== -1 ? row[iconIdx]?.trim() : "Sparkles";
            const position = posIdx !== -1 ? parseInt(row[posIdx]) || 0 : 0;

            items.push({ section, title, description, icon, position });
          }
        }

        if (items.length === 0) {
          throw new Error("No cards records found in the uploaded file.");
        }

        const sections = Array.from(new Set(items.map(item => item.section)));

        for (const section of sections) {
          const { error: delError } = await supabase.from("site_cards").delete().eq("section", section);
          if (delError) throw delError;
        }

        const { error: insError } = await supabase.from("site_cards").insert(items);
        if (insError) throw insError;

        toast({ title: "Import Success", description: `Successfully imported ${items.length} cards across ${sections.length} sections.` });
        loadAll(false);
      } catch (err: any) {
        toast({ title: "Import Failed", description: err.message, variant: "destructive" });
      } finally {
        setImportingCards(false);
        setCardsFile(null);
        const inputs = document.querySelectorAll('input[type="file"]') as NodeListOf<HTMLInputElement>;
        inputs.forEach(input => input.value = "");
      }
    };

    reader.onerror = () => {
      toast({ title: "Error Reading File", description: "Failed to read the uploaded file.", variant: "destructive" });
      setImportingCards(false);
    };

    reader.readAsText(cardsFile);
  };

  const loadAll = async (silent = true) => {
    if (!silent) setLoading(true);
    const [{ data: s }, { data: c }] = await Promise.all([
      supabase.from("site_settings").select("*"),
      supabase.from("site_cards").select("*").order("position"),
    ]);
    const map: SettingMap = {};
    (s ?? []).forEach((row: any) => {
      let val = row.value;
      if (row.key === "prelaunch" && val) {
        val = { ...val };
        if (val.once_off) val.once_off = String(val.once_off).replace(/[^0-9]/g, "");
        if (val.monthly) val.monthly = String(val.monthly).replace(/[^0-9]/g, "");
        if (val.original) val.original = String(val.original).replace(/[^0-9]/g, "");
      }
      map[row.key] = val;
    });
    if (!map.services) {
      map.services = {
        heading_prefix: "Our",
        heading_accent: "Services",
        intro: "We provide a comprehensive range of professional services to support your projects.",
      };
    }
    setSettings(map);
    setDrafts(JSON.parse(JSON.stringify(map)));
    setCards((c as SiteCard[]) ?? []);
    if (!silent) setLoading(false);
  };

  useEffect(() => {
    loadAll(false);
  }, []);

  const updateDraft = (sectionKey: string, field: string, value: string) =>
    setDrafts((prev) => ({ ...prev, [sectionKey]: { ...prev[sectionKey], [field]: value } }));

  const saveSection = async (key: string) => {
    if (key === "prelaunch") {
      const onceOff = drafts.prelaunch?.once_off;
      const monthly = drafts.prelaunch?.monthly;
      const original = drafts.prelaunch?.original;

      const isNumeric = (val: any) => {
        if (val === undefined || val === null || val === "") return false;
        return /^\d+$/.test(String(val).trim());
      };

      if (!onceOff || !isNumeric(onceOff)) {
        toast({
          title: "Validation Error",
          description: "Once-off price must be a positive whole number (digits only, e.g. 5000).",
          variant: "destructive",
        });
        return;
      }

      if (!monthly || !isNumeric(monthly)) {
        toast({
          title: "Validation Error",
          description: "Monthly price must be a positive whole number (digits only, e.g. 700).",
          variant: "destructive",
        });
        return;
      }

      if (original && !isNumeric(original)) {
        toast({
          title: "Validation Error",
          description: "Original price must be a positive whole number (digits only, e.g. 100000).",
          variant: "destructive",
        });
        return;
      }
    }

    setSaving(key);
    const { error } = await supabase
      .from("site_settings")
      .upsert({ key, value: drafts[key] }, { onConflict: "key" });
    setSaving(null);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Saved" });
      setSettings((prev) => ({ ...prev, [key]: drafts[key] }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Site Content</h1>
        <p className="text-sm text-muted-foreground">Edit text and cards shown on the public landing page.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="hero">Hero</TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="how">How It Works</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="prelaunch">Pre-launch</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="videos">Videos</TabsTrigger>
          <TabsTrigger value="transfer">Export/Import</TabsTrigger>
        </TabsList>

        <TabsContent value="hero" className="mt-4">
          <SectionForm
            title="Hero Section (Project Performance System)"
            fields={[
              { key: "title_prefix", label: "Title prefix" },
              { key: "title_accent", label: "Title accent (highlighted text)" },
              { key: "subtitle", label: "Subtitle / description", type: "textarea" },
              { key: "cta_label", label: "CTA button label" },
            ]}
            values={drafts.hero ?? {}}
            onChange={(k, v) => updateDraft("hero", k, v)}
            onSave={() => saveSection("hero")}
            saving={saving === "hero"}
          />
        </TabsContent>

        <TabsContent value="pricing" className="mt-4">
          <SectionForm
            title="Project Performance System (Pricing Section)"
            fields={[
              { key: "heading_prefix", label: "Heading prefix (e.g. Project Performance)" },
              { key: "heading_accent", label: "Heading accent (e.g. System)" },
              { key: "intro", label: "Intro paragraph", type: "textarea" },
            ]}
            values={drafts.pricing ?? {}}
            onChange={(k, v) => updateDraft("pricing", k, v)}
            onSave={() => saveSection("pricing")}
            saving={saving === "pricing"}
          />
        </TabsContent>

        <TabsContent value="about" className="space-y-6 mt-4">
          <SectionForm
            title="About Section"
            fields={[
              { key: "heading_prefix", label: "Heading prefix" },
              { key: "heading_accent", label: "Heading accent (highlighted text)" },
              { key: "intro", label: "Intro paragraph", type: "textarea" },
            ]}
            values={drafts.about ?? {}}
            onChange={(k, v) => updateDraft("about", k, v)}
            onSave={() => saveSection("about")}
            saving={saving === "about"}
          />
          <CardsManager
            section="about"
            sectionLabel="About Cards"
            cards={cards.filter((c) => c.section === "about")}
            onReload={loadAll}
          />
        </TabsContent>

        <TabsContent value="services" className="space-y-6 mt-4">
          <SectionForm
            title="Services Section"
            fields={[
              { key: "heading_prefix", label: "Heading prefix" },
              { key: "heading_accent", label: "Heading accent (highlighted text)" },
              { key: "intro", label: "Intro paragraph", type: "textarea" },
            ]}
            values={drafts.services ?? {}}
            onChange={(k, v) => updateDraft("services", k, v)}
            onSave={() => saveSection("services")}
            saving={saving === "services"}
          />
          <ServicesManager
            cards={cards.filter((c) => c.section === "services")}
            onReload={loadAll}
          />
        </TabsContent>

        <TabsContent value="how" className="space-y-6 mt-4">
          <SectionForm
            title="How It Works Section"
            fields={[
              { key: "heading_prefix", label: "Heading prefix" },
              { key: "heading_accent", label: "Heading accent (highlighted text)" },
              { key: "intro", label: "Intro paragraph", type: "textarea" },
            ]}
            values={drafts.how_it_works ?? {}}
            onChange={(k, v) => updateDraft("how_it_works", k, v)}
            onSave={() => saveSection("how_it_works")}
            saving={saving === "how_it_works"}
          />
          <CardsManager
            section="how_it_works"
            sectionLabel="How It Works Steps"
            cards={cards.filter((c) => c.section === "how_it_works")}
            onReload={loadAll}
          />
        </TabsContent>

        <TabsContent value="prelaunch" className="mt-4">
          <SectionForm
            title="Pre-launch Promotion"
            fields={[
              { key: "badge", label: "Top badge label (e.g. Pre-Launch Special Offer)" },
              { key: "heading_prefix", label: "Heading prefix (e.g. Exclusive Pre-Launch Pricing,)" },
              { key: "heading_accent", label: "Heading accent (e.g. Limited Time Only)" },
              { key: "deadline", label: "Countdown deadline (YYYY-MM-DDTHH:MM:SS)" },
              { key: "valid_until_label", label: "Valid until label" },
              { key: "intro", label: "Intro paragraph", type: "textarea" },
              { key: "original", label: "Original price (e.g. 100000)", type: "number" },
              { key: "once_off", label: "Once-off price (e.g. 5000)", type: "number" },
              { key: "monthly", label: "Monthly price (e.g. 700)", type: "number" },
            ]}
            values={drafts.prelaunch ?? {}}
            onChange={(k, v) => updateDraft("prelaunch", k, v)}
            onSave={() => saveSection("prelaunch")}
            saving={saving === "prelaunch"}
          />
        </TabsContent>

        <TabsContent value="contact" className="mt-4">
          <SectionForm
            title="Contact Section"
            fields={[
              { key: "heading_prefix", label: "Heading prefix" },
              { key: "heading_accent", label: "Heading accent" },
              { key: "intro", label: "Intro paragraph", type: "textarea" },
              { key: "email", label: "Email" },
              { key: "phone", label: "Phone" },
              { key: "address", label: "Address / Location" },
            ]}
            values={drafts.contact ?? {}}
            onChange={(k, v) => updateDraft("contact", k, v)}
            onSave={() => saveSection("contact")}
            saving={saving === "contact"}
          />
        </TabsContent>

        <TabsContent value="videos" className="mt-4">
          <SectionForm
            title="Hero Watch Videos (YouTube)"
            fields={[
              { key: "project_video_label", label: "Project video button label" },
              { key: "project_video_id", label: "Project video YouTube ID (e.g. dQw4w9WgXcQ)" },
              { key: "business_video_label", label: "Business video button label" },
              { key: "business_video_id", label: "Business video YouTube ID" },
            ]}
            values={drafts.videos ?? {}}
            onChange={(k, v) => updateDraft("videos", k, v)}
            onSave={() => saveSection("videos")}
            saving={saving === "videos"}
          />
          <p className="text-sm text-muted-foreground mt-3">
            Paste only the video ID (the part after <code>v=</code> in the YouTube URL). Videos open in a popup on the
            site so visitors never leave.
          </p>
        </TabsContent>

        <TabsContent value="transfer" className="mt-4 space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Export Card */}
            <Card className="border border-border/80 shadow-md bg-card/50 backdrop-blur-sm transition-all hover:shadow-lg">
              <CardHeader className="pb-3 border-b border-border/10 bg-gradient-to-r from-accent/5 to-transparent">
                <CardTitle className="flex items-center gap-2.5 text-lg font-bold">
                  <Download className="w-5 h-5 text-accent animate-pulse" />
                  <span>Export Site Content</span>
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Download your landing page content for backup or transfer to another Supabase project.
                </p>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-muted/30 border border-muted/50 transition-all hover:bg-muted/40">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                      Site Settings
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                      Hero text, subtitles, CTA buttons, pricing descriptions, contact info, and YouTube video IDs.
                    </p>
                    <div className="flex gap-2.5 mt-4">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1 text-xs hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 dark:hover:bg-emerald-950/20 dark:hover:text-emerald-400 dark:hover:border-emerald-900" 
                        onClick={handleExportSettingsCSV}
                      >
                        <Download className="w-3.5 h-3.5 mr-1.5" />
                        Export CSV
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1 text-xs hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 dark:hover:bg-blue-950/20 dark:hover:text-blue-400 dark:hover:border-blue-900" 
                        onClick={handleExportSettingsJSON}
                      >
                        <FileJson className="w-3.5 h-3.5 mr-1.5 text-blue-500" />
                        Export JSON
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-muted/30 border border-muted/50 transition-all hover:bg-muted/40">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                      Site Cards
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                      "About" cards and "How It Works" steps (titles, descriptions, icons, and display order).
                    </p>
                    <div className="flex gap-2.5 mt-4">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1 text-xs hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 dark:hover:bg-emerald-950/20 dark:hover:text-emerald-400 dark:hover:border-emerald-900" 
                        onClick={handleExportCardsCSV}
                      >
                        <Download className="w-3.5 h-3.5 mr-1.5" />
                        Export CSV
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1 text-xs hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 dark:hover:bg-blue-950/20 dark:hover:text-blue-400 dark:hover:border-blue-900" 
                        onClick={handleExportCardsJSON}
                      >
                        <FileJson className="w-3.5 h-3.5 mr-1.5 text-blue-500" />
                        Export JSON
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Import Card */}
            <Card className="border border-border/80 shadow-md bg-card/50 backdrop-blur-sm transition-all hover:shadow-lg">
              <CardHeader className="pb-3 border-b border-border/10 bg-gradient-to-r from-amber/5 to-transparent">
                <CardTitle className="flex items-center gap-2.5 text-lg font-bold">
                  <Upload className="w-5 h-5 text-amber-500" />
                  <span>Import Site Content</span>
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Upload exported CSV or JSON files to quickly restore or transfer landing page content.
                </p>
              </CardHeader>
              <CardContent className="pt-6 space-y-5">
                <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                  <div>
                    <h4 className="text-xs font-semibold">Important Safety Warning</h4>
                    <p className="text-[10px] mt-1 leading-relaxed opacity-90">
                      Importing site settings will overwrite matching keys. Importing site cards will clear and replace existing items in the section. Make sure to back up your database before continuing.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Import Settings */}
                  <div className="p-4 rounded-lg bg-muted/20 border border-muted-foreground/10 space-y-3">
                    <Label className="text-xs font-semibold flex items-center justify-between">
                      <span>Import Site Settings</span>
                      <span className="text-[10px] text-muted-foreground font-normal">Accepts .csv or .json</span>
                    </Label>
                    <div className="flex gap-2 items-center">
                      <Input 
                        type="file" 
                        accept=".csv,.json"
                        className="text-xs h-9 bg-background/50 cursor-pointer file:text-xs file:font-medium file:text-muted-foreground"
                        onChange={(e) => setSettingsFile(e.target.files?.[0] || null)}
                      />
                      <Button 
                        size="sm" 
                        variant="default"
                        disabled={!settingsFile || importingSettings}
                        onClick={handleImportSettings}
                        className="h-9 px-4 text-xs font-medium"
                      >
                        {importingSettings ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                        ) : (
                          <Upload className="w-3.5 h-3.5 mr-1.5" />
                        )}
                        Import
                      </Button>
                    </div>
                  </div>

                  {/* Import Cards */}
                  <div className="p-4 rounded-lg bg-muted/20 border border-muted-foreground/10 space-y-3">
                    <Label className="text-xs font-semibold flex items-center justify-between">
                      <span>Import Site Cards</span>
                      <span className="text-[10px] text-muted-foreground font-normal">Accepts .csv or .json</span>
                    </Label>
                    <div className="flex gap-2 items-center">
                      <Input 
                        type="file" 
                        accept=".csv,.json"
                        className="text-xs h-9 bg-background/50 cursor-pointer file:text-xs file:font-medium file:text-muted-foreground"
                        onChange={(e) => setCardsFile(e.target.files?.[0] || null)}
                      />
                      <Button 
                        size="sm" 
                        variant="default"
                        disabled={!cardsFile || importingCards}
                        onClick={handleImportCards}
                        className="h-9 px-4 text-xs font-medium"
                      >
                        {importingCards ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                        ) : (
                          <Upload className="w-3.5 h-3.5 mr-1.5" />
                        )}
                        Import
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ContentManager;
