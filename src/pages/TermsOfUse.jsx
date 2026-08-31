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

export default function TermsOfUse() {
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
        <h1 className="text-2xl font-black tracking-tight text-foreground mb-1">Terms of Use</h1>
        <p className="text-xs text-muted-foreground mb-8">Last updated: {LAST_UPDATED}</p>

        <Section title="Acceptance of Terms">
          <p>
            These Terms of Use ("Terms") govern your use of the Forgeday mobile and web application
            (the "Service") operated by Forgeday ("we", "us", or "our"). By creating an account or
            using the Service, you agree to be bound by these Terms. If you do not agree, do not use
            the Service.
          </p>
        </Section>

        <Section title="Your Account">
          <p>
            You are responsible for maintaining the security of your account and for all activity
            that occurs under it. You agree to provide accurate information and to keep it current.
          </p>
        </Section>

        <Section title="Use of the Service">
          <p>
            Forgeday is a personal productivity, health, and finance tracking tool. You may use it
            to log meals, workouts, weight, journal entries, projects, and financial transactions.
            You agree to use the Service only for lawful purposes and not to misuse, disrupt, or
            attempt to gain unauthorized access to it.
          </p>
        </Section>

        <Section title="Health and Fitness Disclaimer">
          <p>
            The Service provides general information and tracking tools for nutrition, fitness,
            and wellness. It is not a medical device and does not provide medical advice,
            diagnosis, or treatment. Always consult a qualified healthcare professional before
            beginning any diet, exercise, or health program. You use health and fitness features at
            your own risk.
          </p>
        </Section>

        <Section title="Intellectual Property">
          <p>
            The Service, including its design, text, and software, is owned by us and protected by
            applicable laws. We grant you a limited, non-exclusive, non-transferable license to use
            the Service for your personal, non-commercial use.
          </p>
        </Section>

        <Section title="Prohibited Conduct">
          <p>You agree not to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Use the Service for any unlawful purpose;</li>
            <li>Attempt to interfere with or compromise the Service's security;</li>
            <li>Reverse engineer, decompile, or disassemble the Service; or</li>
            <li>Use automated systems to access the Service in a way that sends more requests than a human reasonably could.</li>
          </ul>
        </Section>

        <Section title="Third-Party Services">
          <p>
            The Service may integrate with or reference third-party services (such as food databases
            and AI providers). We are not responsible for the practices or content of those
            third-party services.
          </p>
        </Section>

        <Section title="Disclaimers">
          <p>
            The Service is provided "as is" and "as available" without warranties of any kind, to
            the fullest extent permitted by law. We do not warrant that the Service will be
            uninterrupted, error-free, or that results will be accurate or reliable.
          </p>
        </Section>

        <Section title="Limitation of Liability">
          <p>
            To the maximum extent permitted by law, we shall not be liable for any indirect,
            incidental, special, or consequential damages, or any loss of data, arising from your
            use of the Service.
          </p>
        </Section>

        <Section title="Termination">
          <p>
            You may delete your account at any time from within the app. We may suspend or
            terminate your access if you violate these Terms or for any other reason at our
            discretion.
          </p>
        </Section>

        <Section title="Changes to These Terms">
          <p>
            We may update these Terms from time to time. We will notify you of significant changes
            within the app. Your continued use after changes take effect constitutes acceptance of
            the updated Terms.
          </p>
        </Section>

        <Section title="Contact Us">
          <p>
            If you have questions about these Terms, contact us through the app's Settings page or
            at support.
          </p>
        </Section>
      </main>
    </div>
  );
}