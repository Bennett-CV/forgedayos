import { Loader2, ArrowDown } from "lucide-react";

export default function PullToRefreshIndicator({ pullY, pullProgress, isRefreshing }) {
  const visible = pullY > 4 || isRefreshing;
  if (!visible) return null;

  return (
    <div
      className="fixed top-14 left-0 right-0 z-50 flex justify-center pointer-events-none lg:hidden"
      style={{ transform: `translateY(${Math.min(pullY, 72)}px)`, transition: isRefreshing ? "transform 0.2s" : "none" }}
    >
      <div className="flex items-center gap-2 bg-card border border-border rounded-full px-4 py-2 shadow-lg">
        {isRefreshing ? (
          <Loader2 className="h-4 w-4 text-primary animate-spin" />
        ) : (
          <ArrowDown
            className="h-4 w-4 text-primary transition-transform"
            style={{ transform: `rotate(${pullProgress * 180}deg)` }}
          />
        )}
        <span className="text-xs font-semibold text-muted-foreground">
          {isRefreshing ? "Refreshing…" : pullProgress >= 1 ? "Release to refresh" : "Pull to refresh"}
        </span>
      </div>
    </div>
  );
}