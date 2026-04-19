import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { format, subDays } from "date-fns";
import { Sun, Moon, Brain, BookOpen, Plus, ChevronLeft, ChevronRight, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { usePullToRefresh } from "../hooks/usePullToRefresh";
import PullToRefreshIndicator from "../components/PullToRefreshIndicator";
import MindfulnessEntryModal from "../components/mindfulness/MindfulnessEntryModal";
import MindfulnessLog from "../components/mindfulness/MindfulnessLog";

const TABS = [
  { id: "morning", label: "Morning", icon: Sun },
  { id: "evening", label: "Evening", icon: Moon },
  { id: "meditation", label: "Meditation", icon: Brain },
  { id: "reading", label: "Reading", icon: BookOpen },
];

const POINTS = { morning: 3, evening: 3, meditation: 3, reading: 2 };

export default function Mindfulness() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("morning");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const load = useCallback(async () => {
    const data = await base44.entities.JournalEntry.list("-date", 200);
    setEntries(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const { pullY, pullProgress, isRefreshing } = usePullToRefresh(load);

  const today = format(new Date(), "yyyy-MM-dd");
  const todayEntries = entries.filter(e => e.date === today);
  const hasToday = (type) => todayEntries.some(e => e.type === type);

  const handleSave = async (data) => {
    if (editingEntry) {
      await base44.entities.JournalEntry.update(editingEntry.id, data);
      toast.success("Entry updated");
    } else {
      await base44.entities.JournalEntry.create({ ...data, date: today });
      // Roll up into Activity for dashboard scoring
      const existing = await base44.entities.Activity.filter({ date: today, category: data.type });
      if (existing.length === 0) {
        let activityTitle;
        if (data.type === "meditation") {
          activityTitle = `Meditation${data.duration_minutes ? ` (${data.duration_minutes} min)` : ""}`;
        } else if (data.type === "reading") {
          activityTitle = `Reading${data.pages_read ? ` (${data.pages_read} pages)` : ""}`;
        } else {
          activityTitle = `${data.type.charAt(0).toUpperCase() + data.type.slice(1)} journal`;
        }
        await base44.entities.Activity.create({
          pillar: "mindfulness",
          category: data.type,
          title: activityTitle,
          points: POINTS[data.type],
          date: today,
        });
      }
      toast.success("Logged!");
    }
    setEditingEntry(null);
    setModalOpen(false);
    load();
  };

  const openNew = (type) => {
    setActiveTab(type);
    setEditingEntry(null);
    setModalOpen(true);
  };

  const openEdit = (entry) => {
    setEditingEntry(entry);
    setActiveTab(entry.type);
    setModalOpen(true);
  };

  const tabEntries = entries.filter(e => e.type === activeTab);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <PullToRefreshIndicator pullY={pullY} pullProgress={pullProgress} isRefreshing={isRefreshing} />
      <div className="space-y-5 animate-slide-up max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-foreground">Mindfulness</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Journals & meditation</p>
          </div>
          <Button onClick={() => openNew(activeTab)} className="gap-2 min-h-[44px]">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Log</span>
          </Button>
        </div>

        {/* Today's streak pills */}
        <div className="flex gap-3">
          {TABS.map(tab => {
            const done = hasToday(tab.id);
            const Icon = tab.icon;
            return (
              <div
                key={tab.id}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  done
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "bg-secondary/50 border-border text-muted-foreground"
                }`}
              >
                {done ? <Check className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
                {tab.label}
              </div>
            );
          })}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-xl bg-secondary/50 p-1 border border-border">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === tab.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Log for active tab */}
        <MindfulnessLog
          entries={tabEntries}
          type={activeTab}
          onAdd={() => openNew(activeTab)}
          onEdit={openEdit}
        />

        <MindfulnessEntryModal
          open={modalOpen}
          type={activeTab}
          entry={editingEntry}
          onClose={() => { setModalOpen(false); setEditingEntry(null); }}
          onSave={handleSave}
        />
      </div>
    </>
  );
}