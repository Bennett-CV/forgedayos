import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { PILLARS, PILLAR_KEYS } from "../../lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function ProjectForm({ onCreated, onCancel }) {
  const [name, setName] = useState("");
  const [pillar, setPillar] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("1");
  const [targetDate, setTargetDate] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !pillar) return;
    setSaving(true);
    const project = await base44.entities.Project.create({
      name,
      pillar,
      description,
      priority: parseInt(priority),
      target_date: targetDate || undefined,
      status: "active",
      progress: 0,
    });
    toast.success("Project created!");
    setSaving(false);
    onCreated?.(project);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1.5 block">Project Name</label>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g., AI Playlist Generator" className="bg-secondary/50 border-border" required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1.5 block">Pillar</label>
          <Select value={pillar} onValueChange={setPillar}>
            <SelectTrigger className="bg-secondary/50 border-border"><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>
              {PILLAR_KEYS.map(k => (
                <SelectItem key={k} value={k}>{PILLARS[k].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1.5 block">Priority</label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="bg-secondary/50 border-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">P1 — Critical</SelectItem>
              <SelectItem value="2">P2 — High</SelectItem>
              <SelectItem value="3">P3 — Normal</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1.5 block">Target Date</label>
        <Input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} className="bg-secondary/50 border-border" />
      </div>
      <div>
        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1.5 block">Description</label>
        <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="What is this project about?" className="bg-secondary/50 border-border resize-none" />
      </div>
      <div className="flex gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
        <Button type="submit" disabled={saving} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">
          {saving ? "Creating..." : "Create Project"}
        </Button>
      </div>
    </form>
  );
}