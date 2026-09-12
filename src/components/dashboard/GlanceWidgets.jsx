import { Link } from "react-router-dom";

function GlanceCard({ widget }) {
  return (
    <Link
      to={widget.href}
      className="editorial-card px-4 py-4 min-h-[96px] flex flex-col justify-between"
    >
      <p className="micro-label">{widget.title}</p>
      <div>
        <p className="mt-3 font-serif text-[20px] font-semibold tracking-tight text-ink leading-tight">
          {widget.value}
        </p>
        <p className="mt-1 text-[12px] text-caption leading-relaxed">{widget.subtitle}</p>
      </div>
    </Link>
  );
}

export default function GlanceWidgets({ widgets }) {
  if (!widgets?.length) return null;

  return (
    <section>
      <div className="flex items-baseline justify-between px-0.5 mb-2">
        <p className="micro-label">Glance</p>
        <Link
          to="/health"
          className="text-[11px] font-semibold text-caption min-h-0"
        >
          Health
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {widgets.map(widget => (
          <GlanceCard key={widget.id} widget={widget} />
        ))}
      </div>
    </section>
  );
}
