export default function PullToRefreshIndicator({ pullY, pullProgress, isRefreshing }) {
  const visible = pullY > 4 || isRefreshing;
  if (!visible) return null;

  return (
    <div
      className="fixed top-[70px] left-0 right-0 z-50 flex justify-center pointer-events-none"
      style={{ transform: `translateY(${Math.min(pullY, 72)}px)`, transition: isRefreshing ? "transform 0.2s" : "none" }}
    >
      <div className="flex items-center gap-2 bg-card border border-border rounded-[4px] px-4 py-2">
        <span className="text-xs font-semibold text-caption">
          {isRefreshing ? "Refreshing…" : pullProgress >= 1 ? "Release to refresh" : "Pull to refresh"}
        </span>
      </div>
    </div>
  );
}
