import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Plus, FolderKanban, FileText, Settings, Zap, Dumbbell, Utensils, Wallet, Sparkles, ChevronLeft } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const NAV_ITEMS = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/log", label: "Log", icon: Plus },
  { path: "/projects", label: "Projects", icon: FolderKanban },
  { path: "/review", label: "Review", icon: FileText },
  { path: "/lifts", label: "Lifts", icon: Dumbbell },
  { path: "/nutrition", label: "Nutrition", icon: Utensils },
  { path: "/finance", label: "Finance", icon: Wallet },
  { path: "/mindfulness", label: "Mindfulness", icon: Sparkles },
  { path: "/settings", label: "Settings", icon: Settings },
];

const BOTTOM_TABS = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/log", label: "Log", icon: Plus },
  { path: "/nutrition", label: "Nutrition", icon: Utensils },
  { path: "/finance", label: "Finance", icon: Wallet },
  { path: "/mindfulness", label: "Mind", icon: Sparkles },
  { path: "/settings", label: "Settings", icon: Settings },
];

// Root paths for bottom tabs — tapping an active tab navigates here
const TAB_ROOT_PATHS = {
  "/": "/",
  "/log": "/log",
  "/nutrition": "/nutrition",
  "/finance": "/finance",
  "/mindfulness": "/mindfulness",
  "/settings": "/settings",
};

// Pages that are "child" pages — show Back button instead of logo on mobile
const CHILD_PAGES = ["/lifts", "/projects", "/review", "/log"];

function BottomTab({ item, active, currentPath }) {
  const navigate = useNavigate();
  const Icon = item.icon;

  const handleTap = () => {
    if (active) {
      // If we're at the root path for this tab, scroll to top
      if (currentPath === item.path) {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        // Navigate to the tab's root
        navigate(item.path);
      }
    } else {
      navigate(item.path);
    }
  };

  return (
    <button
      onClick={handleTap}
      className={`flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[56px] transition-colors relative ${
        active ? "text-primary" : "text-muted-foreground"
      }`}
    >
      <Icon className="h-5 w-5" />
      <span className="text-[10px] font-semibold tracking-wide">{item.label}</span>
      {active && (
        <motion.div
          layoutId="bottomTabIndicator"
          className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full"
        />
      )}
    </button>
  );
}

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const isChildPage = CHILD_PAGES.includes(location.pathname);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-border bg-card fixed inset-y-0 left-0 z-30">
        <div className="p-6 border-b border-border">
          <Link to="/" className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/20 flex items-center justify-center">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-foreground">MomentumOS</h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium">Personal OS</p>
            </div>
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {NAV_ITEMS.map(item => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 min-h-[44px] ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
                {active && <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-border">
          <div className="px-3 py-2 rounded-lg bg-secondary/50">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">System Status</p>
            <p className="text-xs text-primary font-semibold">Operational</p>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div
        className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-xl border-b border-border"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="flex items-center px-4 h-14">
          {isChildPage ? (
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1 text-primary font-semibold text-sm min-h-[44px] min-w-[44px] -ml-2 px-2"
            >
              <ChevronLeft className="h-5 w-5" />
              Back
            </button>
          ) : (
            <Link to="/" className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-primary/20 flex items-center justify-center">
                <Zap className="h-4 w-4 text-primary" />
              </div>
              <span className="font-bold text-sm">MomentumOS</span>
            </Link>
          )}
        </div>
      </div>

      {/* Main Content with route slide transitions */}
      <main className="flex-1 lg:ml-64 pt-14 lg:pt-0 pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0 overflow-x-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.18, ease: "easeInOut" }}
            className="max-w-7xl mx-auto p-4 lg:p-8"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Tab Bar */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-xl border-t border-border flex"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {BOTTOM_TABS.map(item => (
          <BottomTab
            key={item.path}
            item={item}
            active={location.pathname === item.path}
            currentPath={location.pathname}
          />
        ))}
      </nav>
    </div>
  );
}