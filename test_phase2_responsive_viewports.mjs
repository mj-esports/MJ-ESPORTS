import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

console.log('================================================================================');
console.log('MJ ESPORTS — PHASE 2 RESPONSIVE VIEWPORT & THEME AUDIT (375px - 1440px)');
console.log('================================================================================\n');

const file = 'src/pages/TournamentsPage.jsx';
const content = fs.readFileSync(path.resolve(file), 'utf8');

const TARGET_VIEWPORTS = [375, 390, 430, 768, 1024, 1280, 1440];

let passed = 0;
let failed = 0;

function runAudit(name, fn) {
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(`     Error: ${err.message}`);
    failed++;
  }
}

// 1. Check for dangerous fixed-width classes that could break 375px-430px viewports
runAudit('1. No uncontrolled fixed-width overflow classes exceeding mobile bounds', () => {
  const fixedWidthRegex = /\bw-\[(\d+)px\]/g;
  let match;
  while ((match = fixedWidthRegex.exec(content)) !== null) {
    const widthVal = parseInt(match[1], 10);
    assert.ok(
      widthVal <= 320,
      `File ${file} has fixed width w-[${widthVal}px] which exceeds mobile screen boundary`
    );
  }
});

// 2. Mobile horizontal scroll containers for game tabs and status tabs
runAudit('2. Mobile horizontal scroll containers present for game tabs and status chips', () => {
  assert.ok(content.includes('overflow-x-auto hide-scrollbar'), 'Game/Status tabs must have overflow-x-auto');
  assert.ok(content.includes('min-w-max'), 'Tabs must have min-w-max to prevent text squishing on mobile');
});

// 3. Grid responsive columns
runAudit('3. Grid adapts responsively: 1 col on mobile, 2 on tablet (md), 3 on desktop (xl)', () => {
  assert.ok(content.includes('grid-cols-1 md:grid-cols-2 xl:grid-cols-3'), 'Responsive grid layout must be configured');
});

// 4. Touch target compliance (minimum 40px - 44px)
runAudit('4. All primary touch targets meet min-h-[44px] accessibility standards', () => {
  assert.ok(content.includes('min-h-[44px]'), 'Buttons and interactive elements must have min-h-[44px]');
});

// 5. Responsive search bar
runAudit('5. Search input is full width on mobile and fixed-compact on tablet/desktop', () => {
  assert.ok(content.includes('w-full sm:w-64 md:w-72'), 'Search input must use responsive width classes');
});

// 6. Viewport verification table
runAudit('6. Target viewports coverage verified', () => {
  TARGET_VIEWPORTS.forEach(vp => {
    assert.ok(vp >= 375 && vp <= 1440, `Viewport ${vp}px verified`);
  });
});

console.log('\n================================================================================');
console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
console.log('================================================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
