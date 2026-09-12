import { Link } from "react-router-dom";
import TodayCommand from "../components/dashboard/TodayCommand";
import WeekDigest from "../components/review/WeekDigest";
import GuidedCheckIn from "../components/review/GuidedCheckIn";
import { fixtureTodayView, fixtureWeekDigest } from "../lib/previewFixtures";

/** Local visual QA only. Not shipped in production builds. */
export default function UiPreview() {
  const today = fixtureTodayView();
  const digest = fixtureWeekDigest();

  return (
    <div className="space-y-10 pb-8">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-faint">Preview · fixture data</p>

      <section>
        <p className="micro-label mb-3">Today</p>
        <TodayCommand view={today} />
      </section>

      <section className="space-y-4">
        <p className="micro-label">Weekly Review</p>
        <div>
          <h1 className="page-title">Weekly Review</h1>
          <p className="text-[13px] text-caption mt-1">The loop closes here.</p>
        </div>
        <WeekDigest digest={digest} rangeLabel="Sep 7 – Sep 13" />
        <GuidedCheckIn onComplete={() => {}} />
      </section>

      <Link to="/" className="text-[12px] font-semibold text-caption min-h-0">Back</Link>
    </div>
  );
}
