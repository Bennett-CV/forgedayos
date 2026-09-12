import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseFlexibleDate,
  toLbs,
  parseHealthCsv,
  parseHealthXml,
  parseHealthText,
  summarizeRecords,
  planHealthWrites,
  daysSinceLastWeighIn,
  latestWeightLog,
  isHealthActivity,
  HEALTH_NOTE,
} from "./healthImport.js";

test("parseFlexibleDate keeps civil days", () => {
  assert.equal(parseFlexibleDate("2026-09-01"), "2026-09-01");
  assert.equal(parseFlexibleDate("9/1/2026"), "2026-09-01");
  assert.equal(parseFlexibleDate("01-Sep-2026 08:00"), "2026-09-01");
  assert.equal(parseFlexibleDate("Sep 1, 2026"), "2026-09-01");
});

test("toLbs converts kilograms", () => {
  assert.equal(toLbs(80, "kg"), 176.4);
  assert.equal(toLbs(185.21, "lb"), 185.2);
});

test("parses Forgeday long CSV", () => {
  const rows = parseHealthCsv(`date,kind,value,unit
2026-09-01,weight,185.2,lb
2026-09-01,steps,8432,count
2026-09-01,sleep,7.4,hr
2026-09-02,weight,184.8,lb`);
  assert.equal(rows.length, 4);
  const weight = rows.find(r => r.kind === "weight" && r.date === "2026-09-01");
  assert.equal(weight.value, 185.2);
  assert.equal(rows.find(r => r.kind === "steps").value, 8432);
});

test("parses wide Health-style CSV and aggregates steps", () => {
  const rows = parseHealthCsv(`Date,Weight (lb),Steps,Sleep Analysis (hr)
2026-09-01,185.2,4000,7.2
2026-09-01,,4432,`);
  const weight = rows.find(r => r.kind === "weight");
  const steps = rows.find(r => r.kind === "steps");
  const sleep = rows.find(r => r.kind === "sleep");
  assert.equal(weight.value, 185.2);
  assert.equal(steps.value, 8432);
  assert.equal(sleep.value, 7.2);
});

test("parses Apple Health export.xml subset", () => {
  const xml = `<?xml version="1.0"?>
<HealthData>
  <Record type="HKQuantityTypeIdentifierBodyMass" unit="lb" value="185.2" startDate="2026-09-01 08:00:00 -0400"/>
  <Record type="HKQuantityTypeIdentifierStepCount" unit="count" value="1200" startDate="2026-09-01 09:00:00 -0400"/>
  <Record type="HKQuantityTypeIdentifierStepCount" unit="count" value="800" startDate="2026-09-01 18:00:00 -0400"/>
  <Record type="HKCategoryTypeIdentifierSleepAnalysis" value="HKCategoryValueSleepAnalysisAsleepCore" startDate="2026-09-01 22:00:00 -0400" endDate="2026-09-02 05:30:00 -0400"/>
  <Record type="HKCategoryTypeIdentifierSleepAnalysis" value="HKCategoryValueSleepAnalysisInBed" startDate="2026-09-01 21:30:00 -0400" endDate="2026-09-02 06:00:00 -0400"/>
  <Workout workoutActivityType="HKWorkoutActivityTypeTraditionalStrengthTraining" duration="45" durationUnit="min" startDate="2026-09-01 07:00:00 -0400"/>
</HealthData>`;
  const rows = parseHealthXml(xml);
  assert.equal(rows.find(r => r.kind === "weight").value, 185.2);
  assert.equal(rows.find(r => r.kind === "steps").value, 2000);
  assert.equal(rows.find(r => r.kind === "sleep").value, 7.5);
  assert.equal(rows.find(r => r.kind === "workout").value, 0.75);
});

test("parseHealthText routes xml vs csv", () => {
  assert.equal(parseHealthText("date,kind,value,unit\n2026-09-01,weight,180,lb").length, 1);
  assert.equal(
    parseHealthText('<Record type="HKQuantityTypeIdentifierBodyMass" unit="kg" value="80" startDate="2026-09-01"/>').length,
    1
  );
});

test("empty or junk input yields no records", () => {
  assert.deepEqual(parseHealthText(""), []);
  assert.deepEqual(parseHealthCsv("nope"), []);
  assert.deepEqual(parseHealthCsv("foo,bar\n1,2"), []);
});

test("planHealthWrites creates, updates, and skips", () => {
  const records = parseHealthCsv(`date,kind,value,unit
2026-09-01,weight,185.2,lb
2026-09-02,weight,184.8,lb
2026-09-01,steps,1000,count
2026-09-03,steps,2000,count`);
  const plan = planHealthWrites({
    records,
    existingWeights: [{ id: "w1", date: "2026-09-01", weight_lbs: 180 }],
    existingActivities: [{
      date: "2026-09-01",
      category: "steps",
      notes: `${HEALTH_NOTE} Imported`,
    }],
  });
  assert.equal(plan.weightCreates.length, 1);
  assert.equal(plan.weightCreates[0].date, "2026-09-02");
  assert.equal(plan.weightUpdates.length, 1);
  assert.equal(plan.weightUpdates[0].id, "w1");
  assert.equal(plan.activityCreates.length, 1);
  assert.equal(plan.activityCreates[0].date, "2026-09-03");
  assert.equal(plan.skipped, 1);
});

test("summarize and weigh-in helpers", () => {
  const records = [
    { date: "2026-09-01", kind: "weight", value: 185 },
    { date: "2026-09-03", kind: "steps", value: 10 },
  ];
  const sum = summarizeRecords(records);
  assert.equal(sum.total, 2);
  assert.equal(sum.byKind.weight, 1);
  assert.equal(sum.dateMin, "2026-09-01");
  assert.equal(daysSinceLastWeighIn([{ date: "2026-09-01", weight_lbs: 185 }], "2026-09-08"), 7);
  assert.equal(daysSinceLastWeighIn([], "2026-09-08"), null);
  assert.equal(latestWeightLog([{ date: "2026-09-01", weight_lbs: 185 }]).lbs, 185);
  assert.equal(isHealthActivity({ notes: "[health]" }), true);
  assert.equal(isHealthActivity({ category: "steps" }), true);
  assert.equal(isHealthActivity({ category: "lifting" }), false);
});
