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
import { Loader2, Plus, Trash2, ArrowUp, ArrowDown, Save } from "lucide-react";

type SiteCard = {
  id: string;
  section: string;
  title: string;
  description: string;
  icon: string;
  position: number;
};

type SettingMap = Record<string, any>;

const SectionForm = ({
  title,
  fields,
  values,
  onChange,
  onSave,
  saving,
}: {
  title: string;
  fields: { key: string; label: string; type?: "text" | "textarea" | "datetime-local" }[];
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

const ContentManager = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<SettingMap>({});
  const [drafts, setDrafts] = useState<SettingMap>({});
  const [cards, setCards] = useState<SiteCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const loadAll = async () => {
    setLoading(true);
    const [{ data: s }, { data: c }] = await Promise.all([
      supabase.from("site_settings").select("*"),
      supabase.from("site_cards").select("*").order("position"),
    ]);
    const map: SettingMap = {};
    (s ?? []).forEach((row: any) => (map[row.key] = row.value));
    setSettings(map);
    setDrafts(JSON.parse(JSON.stringify(map)));
    setCards((c as SiteCard[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const updateDraft = (sectionKey: string, field: string, value: string) =>
    setDrafts((prev) => ({ ...prev, [sectionKey]: { ...prev[sectionKey], [field]: value } }));

  const saveSection = async (key: string) => {
    setSaving(key);
    const { error } = await supabase
      .from("site_settings")
      .update({ value: drafts[key] })
      .eq("key", key);
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

      <Tabs defaultValue="about">
        <TabsList className="flex-wrap">
          <TabsTrigger value="about">About</TabsTrigger>
          <TabsTrigger value="how">How It Works</TabsTrigger>
          <TabsTrigger value="prelaunch">Pre-launch</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
        </TabsList>

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
              { key: "deadline", label: "Countdown deadline (YYYY-MM-DDTHH:MM:SS)" },
              { key: "valid_until_label", label: "Valid until label" },
              { key: "intro", label: "Intro paragraph", type: "textarea" },
              { key: "original", label: "Original price (e.g. R100,000)" },
              { key: "once_off", label: "Once-off price (e.g. R20,000)" },
              { key: "monthly", label: "Monthly price (e.g. R3,000)" },
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
      </Tabs>
    </div>
  );
};

export default ContentManager;
