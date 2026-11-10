import fs from 'fs';
import path from 'path';

console.log('--- Phase 2 Free Fire MAX Theme Verification ---');

const filePath = path.resolve('src/pages/TournamentsPage.jsx');
const content = fs.readFileSync(filePath, 'utf8');

let errors = [];

// 1. Check for expected theme tokens
const expectedTokens = [
  { name: 'Primary Amber (#FFB900)', regex: /#FFB900/i },
  { name: 'Secondary Fire Orange (#FF6200)', regex: /#FF6200/i },
  { name: 'Pure Black background (#000000)', regex: /#000000/i },
  { name: 'Card background (#111318)', regex: /#111318/i },
  { name: 'Elevated surface (#1B1B1F)', regex: /#1B1B1F/i },
  { name: 'Border (#2A2A30)', regex: /#2A2A30/i },
  { name: 'Error / Full (#FF0000)', regex: /#FF0000/i },
  { name: 'Preserved Open Status (#10b981)', regex: /#10b981/i }
];

expectedTokens.forEach(({ name, regex }) => {
  if (!regex.test(content)) {
    errors.push(`Missing expected token: ${name}`);
  } else {
    console.log(`[PASS] Token present: ${name}`);
  }
});

// 2. Check for banned / deprecated legacy tokens
const bannedTokens = [
  '#00f2ff',
  '#00363a',
  '#131314',
  '#141416',
  '#1c1b1c',
  '#201f20',
  '#27272a',
  '#849495',
  '#b9cacb',
  '#e5e2e3',
  '#ff5e07'
];

bannedTokens.forEach(token => {
  const matches = (content.toLowerCase().match(new RegExp(token.toLowerCase(), 'g')) || []).length;
  if (matches > 0) {
    errors.push(`Found legacy token ${token} (${matches} occurrences) in TournamentsPage.jsx`);
  } else {
    console.log(`[PASS] No legacy token: ${token}`);
  }
});

// 3. Check key element styling
if (!content.includes('bg-[#FFB900] text-[#000000]')) {
  errors.push('Expected high-contrast amber CTA button or active tab (bg-[#FFB900] text-[#000000])');
} else {
  console.log('[PASS] High-contrast amber CTAs / active tabs present');
}

if (!content.includes('from-[#FF6200] to-[#FFB900]')) {
  errors.push('Expected Fire-Orange to Amber progress gradient (from-[#FF6200] to-[#FFB900])');
} else {
  console.log('[PASS] Progress bar gradient: Fire-Orange to Amber');
}

// 4. Output summary
if (errors.length > 0) {
  console.error('\nVerification FAILED with errors:');
  errors.forEach(err => console.error(` - ${err}`));
  process.exit(1);
} else {
  console.log('\n[ALL CHECKS PASSED] TournamentsPage.jsx matches Free Fire MAX theme specification 100%!');
  process.exit(0);
}
