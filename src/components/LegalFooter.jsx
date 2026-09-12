// Privacy Policy and Terms of Use links. Client-side Links stay in the SPA
// (avoids a hard-nav 404 on hosts without a catch-all). Static copies also
// live at /privacy/ and /terms/ for App Store / logged-out crawlers.
import { Link } from "react-router-dom";

const APP_NAME = "Forgeday";

export default function LegalFooter({ className = "" }) {
  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
        <Link
          to="/privacy"
          className="hover:text-foreground underline underline-offset-4 min-h-[44px] flex items-center"
        >
          Privacy Policy
        </Link>
        <span className="text-border" aria-hidden="true">·</span>
        <Link
          to="/terms"
          className="hover:text-foreground underline underline-offset-4 min-h-[44px] flex items-center"
        >
          Terms of Use
        </Link>
      </div>
      <p className="text-xs text-muted-foreground/70">© {new Date().getFullYear()} {APP_NAME}</p>
    </div>
  );
}
