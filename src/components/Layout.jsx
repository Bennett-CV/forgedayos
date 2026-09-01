import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

const BOTTOM_TABS = [
  { path: "/", label: "Today" },
  { path: "/lifts", label: "Lifts" },
  { path: "/log", label: "Log" },
  { path: "/nutrition", label: "Food" },
  { path: "/mindfulness", label: "Mind" },
];

function BottomTab({ item, active }) {
  const navigate = useNavigate();

  const handleTap = () => {
    if (active) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      navigate(item.path);
    }
  };

  return (
    <button
      onClick={handleTap}
      className={`flex-1 flex flex-col items-center justify-center min-h-[56px] transition-colors ${
        active ? "text-ink" : "text-faint"
      }`}
    >
      <span
        className="mb-1 h-[5px] w-[5px] rounded-full"
        style={{ background: active ? "oklch(var(--clay))" : "transparent" }}
      />
      <span className="text-[10px] font-bold uppercase tracking-[0.12em]">{item.label}</span>
    </button>
  );
}

export default function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-page flex justify-center">
      <div className="relative w-full max-w-[460px] min-h-screen bg-shell flex flex-col shadow-[0_0_0_1px_oklch(var(--border))]">
        <header
          className="sticky top-0 z-40 bg-shell border-b border-border"
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          <div className="flex items-center justify-between px-[22px] h-[58px]">
            <Link to="/" className="min-w-0 min-h-0">
              <p className="font-serif text-[21px] font-semibold leading-none text-ink tracking-tight">Forgeday</p>
              <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.22em] text-faint">Personal OS</p>
            </Link>
            <Link
              to="/settings"
              className="inline-flex items-center justify-center rounded-full border border-border px-[14px] py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink min-h-0"
            >
              Settings
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.18, ease: "easeInOut" }}
              className="px-[22px] pt-5 pb-[110px]"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>

        <nav
          className="sticky bottom-0 z-40 bg-shell border-t border-border flex w-full mt-auto"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          {BOTTOM_TABS.map(item => (
            <BottomTab
              key={item.path}
              item={item}
              active={location.pathname === item.path}
            />
          ))}
        </nav>
      </div>
    </div>
  );
}
