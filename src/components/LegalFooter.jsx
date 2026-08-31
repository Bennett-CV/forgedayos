// Reusable footer with Privacy Policy and Terms of Use links.
// Uses plain anchors (not Router Links) so it works both inside the app's
// Router context (custom login pages) and on platform-rendered screens.
const APP_NAME = "Forgeday";

export default function LegalFooter({ className = "" }) {
  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
        <a
          href="/privacy"
          className="hover:text-foreground underline underline-offset-4 min-h-[44px] flex items-center"
        >
          Privacy Policy
        </a>
        <span className="text-border" aria-hidden="true">·</span>
        <a
          href="/terms"
          className="hover:text-foreground underline underline-offset-4 min-h-[44px] flex items-center"
        >
          Terms of Use
        </a>
      </div>
      <p className="text-xs text-muted-foreground/70">© {new Date().getFullYear()} {APP_NAME}</p>
    </div>
  );
}