import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { PILLARS } from "../../lib/constants";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MoreHorizontal, Pause, Play, Check, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { format } from "date-fns";

export default function ProjectCard({ project, onUpdate, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [progress, setProgress] = useState(String(project.progress || 0));
  const [weeklyUpdate, setWeeklyUpdate] = useState(project.weekly_update || "");
  const [updating, setUpdating] = useState(false);

  const pillar = PILLARS[project.pillar];
  const priorityLabel = { 1: "P1", 2: "P2", 3: "P3" }[project.priority] || "P3";

  const handleStatusChange = async (status) => {
    await base44.entities.Project.update(project.id, { status });
    toast.success(`Project ${status}`);
    onUpdate?.();
  };

  const handleProgressSave = async () => {
    setUpdating(true);
    await base44.entities.Project.update(project.id, {
      progress: parseInt(progress) || 0,
      weekly_update: weeklyUpdate,
    });
    toast.success("Progress updated!");
    setUpdating(false);
    onUpdate?.();
  };

  const handleDeleteProject = async () => {
    await base44.entities.Project.delete(project.id);
    toast.success("Project deleted");
    onDelete?.();
  };

  return (
    <div className="editorial-card overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full" style={{ background: pillar?.color }} />
            <div>
              <h3 className="text-base font-bold text-foreground">{project.name}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{pillar?.label}</span>
                <span className="text-muted-foreground text-[10px]">·</span>
                <span className="text-[10px] font-mono font-bold text-muted-foreground">{priorityLabel}</span>
                {project.target_date && (
                  <>
                    <span className="text-muted-foreground text-[10px]">·</span>
                    <span className="text-[10px] text-muted-foreground">Due {format(new Date(project.target_date), 'MMM d')}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
            >
              {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                  <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {project.status === "active" && (
                  <DropdownMenuItem onClick={() => handleStatusChange("paused")}>
                    <Pause className="h-4 w-4 mr-2" /> Pause
                  </DropdownMenuItem>
                )}
                {project.status === "paused" && (
                  <DropdownMenuItem onClick={() => handleStatusChange("active")}>
                    <Play className="h-4 w-4 mr-2" /> Resume
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => handleStatusChange("completed")}>
                  <Check className="h-4 w-4 mr-2" /> Complete
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDeleteProject} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {project.description && (
          <p className="text-sm text-muted-foreground mb-3">{project.description}</p>
        )}

        <div className="flex items-center gap-3">
          <Progress value={project.progress || 0} className="flex-1 h-2" />
          <span className="text-sm font-bold font-mono text-foreground">{project.progress || 0}%</span>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border p-5 space-y-3 bg-secondary/20">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1.5 block">Progress (%)</label>
            <Input
              type="number"
              min="0"
              max="100"
              value={progress}
              onChange={e => setProgress(e.target.value)}
              className="bg-secondary/50 border-border font-mono w-32"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1.5 block">Weekly Update</label>
            <Textarea
              value={weeklyUpdate}
              onChange={e => setWeeklyUpdate(e.target.value)}
              rows={2}
              placeholder="What happened this week?"
              className="bg-secondary/50 border-border resize-none"
            />
          </div>
          <Button onClick={handleProgressSave} disabled={updating} size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
            {updating ? "Saving..." : "Save Progress"}
          </Button>
        </div>
      )}
    </div>
  );
}