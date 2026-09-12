import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const cases = [
  ['America/New_York', '2026-09-12T01:30:00Z', '2026-09-11'],
  ['Asia/Tokyo', '2026-09-11T16:30:00Z', '2026-09-12'],
  ['America/New_York', '2026-01-01T02:00:00Z', '2025-12-31'],
  ['America/New_York', '2026-03-08T07:30:00Z', '2026-03-08'],
  ['America/New_York', '2026-11-01T06:30:00Z', '2026-11-01'],
  ['UTC', '2026-09-12T00:00:00Z', '2026-09-12'],
];
for (const [zone, instant, expected] of cases) {
  test(`${zone}: ${instant} belongs to ${expected}`, () => {
    const result = execFileSync(process.execPath, ['--input-type=module', '-e',
      `import { localDateKey } from './src/lib/localDate.js'; process.stdout.write(localDateKey(new Date('${instant}')));`
    ], { env: { ...process.env, TZ: zone }, encoding: 'utf8' });
    assert.equal(result, expected);
  });
}
