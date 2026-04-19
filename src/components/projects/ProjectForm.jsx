import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { PILLARS, PILLAR_KEYS } from "../../lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { toast } from "sonner";

function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 1024);
  useEffect(() => {
    const handler = () => setMobile(window.innerWidth < 1024);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return mobile;
}

function FormBody({ name, setName, pillar, setPillar, priority, setPriority, targetDate, setTargetDate, description, setDescription, saving, onCancel, isMobile }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1.5 block">Project Name</label>
        <Input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g., AI Playlist Generator"
          className="bg-secondary/50 border-border"
          style={{ userSelect: "text", WebkitUserSelect: "text" }}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1.5 block">Pillar</label>
          {isMobile ? (
            <div className="grid grid-cols-1 gap-1">
              {PILLAR_KEYS.map(k => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setPillar(k)}
                  className={`text-xs font-semibold px-3 py-2.5 rounded-lg text-left transition-colors min-h-[44px] ${
                    pillar === k ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {PILLARS[k].label}
                </button>
              ))}
            </div>
          ) : (
            <Select value={pillar} onValueChange={setPillar}>
              <SelectTrigger className="bg-secondary/50 border-border"><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                {PILLAR_KEYS.map(k => (
                  <SelectItem key={k} value={k}>{PILLARS[k].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1.5 block">Priority</label>
          {isMobile ? (
            <div className="grid grid-cols-1 gap-1">
              {[["1", "P1 — Critical"], ["2", "P2 — High"], ["3", "P3 — Normal"]].map(([val, lbl]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setPriority(val)}
                  className={`text-xs font-semibold px-3 py-2.5 rounded-lg text-left transition-colors min-h-[44px] ${
                    priority === val ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>
          ) : (
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="bg-secondary/50 border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">P1 — Critical</SelectItem>
                <SelectItem value="2">P2 — High</SelectItem>
                <SelectItem value="3">P3 — Normal</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <div>
        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1.5 block">Target Date</label>
        <Input
          type="date"
          value={targetDate}
          onChange={e => setTargetDate(e.target.value)}
          className="bg-secondary/50 border-border"
          style={{ userSelect: "text", WebkitUserSelect: "text" }}
        />
      </div>
      <div>
        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1.5 block">Description</label>
        <Textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={3}
          placeholder="What is this project about?"
          className="bg-secondary/50 border-border resize-none"
          style={{ userSelect: "text", WebkitUserSelect: "text" }}
        />
      </div>
      <div className="flex gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1 min-h-[44px]">Cancel</Button>
        <Button type="submit" disabled={saving} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 min-h-[44px]">
          {saving ? "Creating..." : "Create Project"}
        </Button>
      </div>
    </div>
  );
}

export default function ProjectForm({ onCreated, onCancel, open }) {
  const [name, setName] = useState("");
  const [pillar, setPillar] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("1");
  const [targetDate, setTargetDate] = useState("");
  const [saving, setSaving] = useState(false);
  const isMobile = useIsMobile();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !pillar) return;
    setSaving(true);
    const project = await base44.entities.Project.create({
      name, pillar, description,
      priority: parseInt(priority),
      target_date: targetDate || undefined,
      status: "active",
      progress: 0,
    });
    toast.success("Project created!");
    setSaving(false);
    onCreated?.(project);
  };

  const bodyProps = { name, setName, pillar, setPillar, priority, setPriority, targetDate, setTargetDate, description, setDescription, saving, onCancel, isMobile };

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={v => !v && onCancel?.()}>
        <DrawerContent className="bg-card border-border px-4 pb-6 max-h-[90vh] overflow-y-auto">
          <DrawerHeader className="px-0">
            <DrawerTitle className="font-black">New Project</DrawerTitle>
          </DrawerHeader>
          <form onSubmit={handleSubmit}>
            <FormBody {...bodyProps} />
          </form>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormBody {...bodyProps} />
    </form>
  );
}