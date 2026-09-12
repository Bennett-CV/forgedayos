import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import {
  detectNotificationCapability,
  notificationCapabilityCopy,
  requestBrowserPermission,
} from "@/lib/notificationBridge";
import { normalizeNotificationPrefs } from "@/lib/smartNotifications";

export default function NotificationPrefsCard({ prefs, onChange, saving }) {
  const [cap, setCap] = useState(() => detectNotificationCapability());
  const [asking, setAsking] = useState(false);
  const p = normalizeNotificationPrefs(prefs);

  useEffect(() => {
    setCap(detectNotificationCapability());
  }, []);

  const update = (patch) => onChange({ ...p, ...patch });

  const handleAllow = async () => {
    setAsking(true);
    await requestBrowserPermission();
    setCap(detectNotificationCapability());
    setAsking(false);
  };

  return (
    <div className="editorial-card p-5 space-y-4">
      <div>
        <p className="micro-label mb-2">Smart notifications</p>
        <p className="text-[13px] text-caption leading-relaxed">
          {notificationCapabilityCopy(cap)}
        </p>
      </div>

      <label className="flex items-center justify-between gap-3 min-h-[44px]">
        <span className="text-[14px] text-ink">Weekly Review nudge</span>
        <Switch
          checked={p.weekly_review}
          onCheckedChange={v => update({ weekly_review: v })}
          disabled={saving}
        />
      </label>
      <label className="flex items-center justify-between gap-3 min-h-[44px]">
        <span className="text-[14px] text-ink">Incomplete Today next action</span>
        <Switch
          checked={p.today_next}
          onCheckedChange={v => update({ today_next: v })}
          disabled={saving}
        />
      </label>
      <label className="flex items-center justify-between gap-3 min-h-[44px]">
        <span className="text-[14px] text-ink">Stale weigh-in</span>
        <Switch
          checked={p.stale_weigh_in}
          onCheckedChange={v => update({ stale_weigh_in: v })}
          disabled={saving}
        />
      </label>

      {p.stale_weigh_in ? (
        <div>
          <p className="micro-label mb-2">Weigh-in gap</p>
          <div className="seg-track">
            {[3, 7, 14].map(days => (
              <button
                key={days}
                type="button"
                onClick={() => update({ stale_days: days })}
                className={`seg-item text-[12px] ${p.stale_days === days ? "seg-item-active" : ""}`}
              >
                {days} days
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {cap.canRequest && cap.permission !== "granted" ? (
        <button
          type="button"
          onClick={handleAllow}
          disabled={asking || cap.permission === "denied"}
          className="w-full min-h-[48px] rounded-[4px] border border-border text-[14px] font-semibold text-ink disabled:opacity-50"
        >
          {cap.permission === "denied" ? "Browser blocked notifications" : asking ? "Asking…" : "Allow browser notifications"}
        </button>
      ) : null}

      {cap.permission === "granted" ? (
        <p className="text-[12px] text-caption">Browser notifications: allowed</p>
      ) : null}
    </div>
  );
}
