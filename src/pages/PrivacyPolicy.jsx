import { Zap, ArrowLeft } from "lucide-react";

const LAST_UPDATED = "August 31, 2026";

function Section({ title, children }) {
  return (
    <section className="mb-6">
      <h2 className="text-base font-bold text-foreground mb-2">{title}</h2>
      <div className="text-sm text-muted-foreground leading-relaxed space-y-2">{children}</div>
    </section>
  );
}

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card/95 backdrop-blur-xl border-b border-border">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <a
            href="/"
            className="flex items-center gap-1 text-primary font-semibold text-sm min-h-[44px] -ml-2 px-2"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </a>
          <div className="flex items-center gap-2 ml-auto">
            <div className="h-7 w-7 rounded-md bg-primary/20 flex items-center justify-center">
              <Zap className="h-4 w-4 text-primary" />
            </div>
            <span className="font-bold text-sm">Forgeday</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-black tracking-tight text-foreground mb-1">Privacy Policy</h1>
        <p className="text-xs text-muted-foreground mb-8">Last updated: {LAST_UPDATED}</p>

        <Section title="Overview">
          <p>
            Forgeday ("we", "us", or "our") operates the Forgeday mobile and web application (the
            "Service"). This Privacy Policy explains what information we collect, how we use it, and
            the choices you have. By using the Service, you agree to the practices described here.
          </p>
        </Section>

        <Section title="Information We Collect">
          <p><strong className="text-foreground">Account information:</strong> your name and email address when you register.</p>
          <p><strong className="text-foreground">Profile and health data:</strong> details you enter such as age, gender, weight, height, activity level, nutrition goals, meals, workouts, body weight, journal entries, and financial transactions you choose to log.</p>
          <p><strong className="text-foreground">Usage data:</strong> information about how you interact with the Service, including device and app analytics.</p>
        </Section>

        <Section title="How We Use Your Information">
          <p>We use your information to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Provide, personalize, and improve the Service;</li>
            <li>Calculate nutrition targets, momentum points, and performance summaries;</li>
            <li>Generate weekly reviews and insights;</li>
            <li>Communicate with you about your account; and</li>
            <li>Comply with legal obligations.</li>
          </ul>
        </Section>

        <Section title="Data Sharing">
          <p>
            We do not sell your personal information. We may share data with service providers that
            help us operate the Service (such as hosting, analytics, and AI providers) under
            appropriate confidentiality obligations, and where required by law.
          </p>
        </Section>

        <Section title="Data Security">
          <p>
            We use reasonable technical and organizational measures to protect your information.
            However, no method of transmission or storage is completely secure, and we cannot
            guarantee absolute security.
          </p>
        </Section>

        <Section title="Data Retention">
          <p>
            We retain your information for as long as your account is active or as needed to provide
            the Service. You may request deletion of your account and associated data at any time
            from within the app's Settings.
          </p>
        </Section>

        <Section title="Your Rights">
          <p>
            Depending on your jurisdiction, you may have rights to access, correct, export, or
            delete your personal information. To exercise these rights, contact us using the details
            below.
          </p>
        </Section>

        <Section title="Children's Privacy">
          <p>
            The Service is not intended for children under 13 (or the minimum age in your
            jurisdiction). We do not knowingly collect personal information from children. If you
            believe a child has provided us information, contact us and we will delete it.
          </p>
        </Section>

        <Section title="Changes to This Policy">
          <p>
            We may update this Privacy Policy from time to time. We will notify you of significant
            changes within the app. Your continued use after changes take effect constitutes
            acceptance of the updated policy.
          </p>
        </Section>

        <Section title="Contact Us">
          <p>
            If you have questions about this Privacy Policy or your data, contact us through the
            app's Settings page or at support.
          </p>
        </Section>
      </main>
    </div>
  );
}