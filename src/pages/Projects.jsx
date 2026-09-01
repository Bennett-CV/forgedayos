import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProjectForm from "../components/projects/ProjectForm";
import ProjectCard from "../components/projects/ProjectCard";

export default function Projects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [tab, setTab] = useState("active");

  const load = async () => {
    if (!user?.email) return;
    const data = await base44.entities.Project.filter({ created_by: user.email }, "-created_date", 100);
    setProjects(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = projects.filter(p => {
    if (tab === "active") return p.status === "active";
    if (tab === "paused") return p.status === "paused";
    if (tab === "completed") return p.status === "completed";
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-border border-t-clay rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="text-sm text-caption mt-0.5">
            {projects.filter(p => p.status === "active").length} active
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-clay text-clay-fg hover:bg-clay-hover font-semibold">
          New
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-secondary/50">
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="paused">Paused</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-16 editorial-card border-dashed">
            <p className="text-sm text-caption">No {tab} projects yet.</p>
          </div>
        ) : (
          filtered.map(project => (
            <ProjectCard key={project.id} project={project} onUpdate={load} onDelete={load} />
          ))
        )}
      </div>

      {/* On mobile, ProjectForm uses a Drawer internally; on desktop use Dialog */}
      <div className="hidden lg:block">
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="font-black">New Project</DialogTitle>
            </DialogHeader>
            <ProjectForm
              open={showForm}
              onCreated={() => { setShowForm(false); load(); }}
              onCancel={() => setShowForm(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
      <div className="lg:hidden">
        <ProjectForm
          open={showForm}
          onCreated={() => { setShowForm(false); load(); }}
          onCancel={() => setShowForm(false)}
        />
      </div>
    </div>
  );
}