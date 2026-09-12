import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (name === "ui" || name === "node_modules") continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (/\.(js|jsx)$/.test(name) && !name.endsWith(".test.js")) acc.push(p);
  }
  return acc;
}

function sourceFiles() {
  return [
    ...walk(join(root, "src/pages")),
    ...walk(join(root, "src/components")),
    ...walk(join(root, "src/lib")),
    ...walk(join(root, "src/hooks")),
  ];
}

function hasNamedImport(src, name) {
  return new RegExp(
    String.raw`import\s*\{[^}]*\b${name}\b[^}]*\}\s*from\s*['"][^'"]+['"]`
  ).test(src);
}

test("files that call format() import it", () => {
  const offenders = [];
  for (const file of sourceFiles()) {
    const src = readFileSync(file, "utf8");
    if (!/\bformat\s*\(/.test(src)) continue;
    if (hasNamedImport(src, "format")) continue;
    offenders.push(relative(root, file));
  }
  assert.deepEqual(offenders, []);
});

test("Dashboard no longer calls unbound format / useLifeData leftovers", () => {
  const src = readFileSync(join(root, "src/pages/Dashboard.jsx"), "utf8");
  assert.doesNotMatch(src, /\bformat\s*\(/);
  assert.doesNotMatch(src, /\buseLifeData\s*\(/);
  assert.match(src, /localToday\s*\(/);
  assert.match(src, /localWeekStartKey\s*\(/);
});

test("Weekly Review does not reference undefined generating", () => {
  const src = readFileSync(join(root, "src/pages/WeeklyReview.jsx"), "utf8");
  assert.doesNotMatch(src, /\bgenerating\b/);
});
