import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { format } from "date-fns";
import { toast } from "sonner";
import { usePullToRefresh } from "../hooks/usePullToRefresh";
import PullToRefreshIndicator from "../components/PullToRefreshIndicator";
import MindfulnessComposer from "../components/mindfulness/MindfulnessComposer";
import MindfulnessLog from "../components/mindfulness/MindfulnessLog";

const TABS = [
  { id: "morning", label: "Morning" },
  { id: "evening", label: "Evening" },
  { id: "meditation", label: "Meditation" },
  { id: "reading", label: "Reading" },
];

const POINTS = { morning: 3, evening: 3, meditation: 3, reading: 2 };

export default function Mindfulness() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const composeParam = searchParams.get("compose");
  const composeType = TABS.some(t => t.id === composeParam) ? composeParam : composeParam ? "morning" : null;
  const [activeTab, setActiveTab] = useState(composeType || "morning");
  const [composing, setComposing] = useState(!!composeParam);
  const [editingEntry, setEditingEntry] = useState(null);

  const load = useCallback(async () => {
    if (!user?.email) return;
    try {
      const data = await base44.entities.JournalEntry.filter({ created_by: user.email }, "-date", 200);
      setEntries(data);
    } catch {
      // best-effort
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!composeParam) return;
    const next = TABS.some(t => t.id === composeParam) ? composeParam : "morning";
    setActiveTab(next);
    setEditingEntry(null);
    setComposing(true);
  }, [composeParam]);

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
      const existing = await base44.entities.Activity.filter({ date: today, category: data.type, created_by: user.email });
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
    setComposing(false);
    load();
  };

  const openNew = (type) => {
    setActiveTab(type);
    setEditingEntry(null);
    setComposing(true);
  };

  const openEdit = (entry) => {
    setEditingEntry(entry);
    setActiveTab(entry.type);
    setComposing(true);
  };

  const tabEntries = entries.filter(e => e.type === activeTab);
  const activeLabel = TABS.find(t => t.id === activeTab)?.label || "Morning";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-border border-t-clay rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <PullToRefreshIndicator pullY={pullY} pullProgress={pullProgress} isRefreshing={isRefreshing} />
      <div className="space-y-5">
        <h1 className="page-title">Mindfulness</h1>

        <div className="flex flex-wrap gap-2">
          {TABS.map(tab => {
            const active = activeTab === tab.id;
            const done = hasToday(tab.id);
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setComposing(false); setEditingEntry(null); }}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-full border text-[13px] font-semibold min-h-[40px] min-w-0 ${
                  active ? "border-clay text-ink bg-card" : "border-border text-caption bg-card"
                }`}
              >
                <span
                  className="h-[6px] w-[6px] rounded-full"
                  style={{ background: active ? "oklch(var(--clay))" : done ? "oklch(var(--pillar-mindfulness))" : "oklch(var(--border-strong))" }}
                />
                {tab.label}
              </button>
            );
          })}
        </div>

        {!composing ? (
          <button
            onClick={() => openNew(activeTab)}
            className="flex items-center justify-center w-full min-h-[48px] rounded-[4px] bg-clay text-clay-fg text-[15px] font-semibold hover:bg-clay-hover"
          >
            + Log {activeLabel}
          </button>
        ) : (
          <MindfulnessComposer
            type={activeTab}
            entry={editingEntry}
            onSave={handleSave}
            onCancel={() => { setComposing(false); setEditingEntry(null); }}
          />
        )}

        <MindfulnessLog
          entries={tabEntries}
          type={activeTab}
          onAdd={() => openNew(activeTab)}
          onEdit={openEdit}
        />
      </div>
    </>
  );
}
