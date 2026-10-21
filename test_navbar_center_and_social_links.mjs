import assert from 'assert';
import fs from 'fs';
import path from 'path';
import {
  formatInstagramUrl,
  formatWhatsAppUrl,
  getInstagramUrl,
  getWhatsAppUrl
} from './src/utils/socialLinks.js';

console.log('================================================================================');
console.log('MJ ESPORTS — NAVBAR CENTERING & FOOTER SOCIAL LINKS AUDIT');
console.log('================================================================================\n');

let passCount = 0;
let totalCount = 0;

function check(title, fn) {
  totalCount++;
  try {
    fn();
    console.log(`  ✅ [PASS] ${totalCount}. ${title}`);
    passCount++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${totalCount}. ${title}`);
    console.error(`     Reason: ${err.message}\n`);
  }
}

// 1. Social Links URL Formatter Unit Tests
check('formatInstagramUrl correctly formats handles with @', () => {
  const result = formatInstagramUrl('@mjesports_arena');
  assert.strictEqual(result, 'https://instagram.com/mjesports_arena');
});

check('formatInstagramUrl correctly formats handles without @', () => {
  const result = formatInstagramUrl('mjesports');
  assert.strictEqual(result, 'https://instagram.com/mjesports');
});

check('formatInstagramUrl enforces HTTPS on full URLs', () => {
  const result = formatInstagramUrl('http://instagram.com/mjesports');
  assert.strictEqual(result, 'https://instagram.com/mjesports');
});

check('formatInstagramUrl rejects generic root domain lacking a profile handle', () => {
  assert.strictEqual(formatInstagramUrl('https://instagram.com'), null);
  assert.strictEqual(formatInstagramUrl('https://instagram.com/'), null);
  assert.strictEqual(formatInstagramUrl('http://www.instagram.com'), null);
});

check('formatInstagramUrl returns null for blank/empty input', () => {
  assert.strictEqual(formatInstagramUrl(''), null);
  assert.strictEqual(formatInstagramUrl('   '), null);
  assert.strictEqual(formatInstagramUrl(null), null);
});

check('formatWhatsAppUrl formats 10-digit Indian numbers with 91 country code', () => {
  const result = formatWhatsAppUrl('9876543210');
  assert.strictEqual(result, 'https://wa.me/919876543210');
});

check('formatWhatsAppUrl formats formatted phone numbers (+91 98765 43210)', () => {
  const result = formatWhatsAppUrl('+91 98765 43210');
  assert.strictEqual(result, 'https://wa.me/919876543210');
});

check('formatWhatsAppUrl preserves WhatsApp community chat HTTPS URLs', () => {
  const result = formatWhatsAppUrl('https://chat.whatsapp.com/K1234567890abcdef');
  assert.strictEqual(result, 'https://chat.whatsapp.com/K1234567890abcdef');
});

check('formatWhatsAppUrl rejects generic WhatsApp homepage lacking a chat or invite code', () => {
  assert.strictEqual(formatWhatsAppUrl('https://whatsapp.com'), null);
  assert.strictEqual(formatWhatsAppUrl('https://whatsapp.com/'), null);
  assert.strictEqual(formatWhatsAppUrl('http://www.whatsapp.com'), null);
});

check('formatWhatsAppUrl returns null for blank/empty input', () => {
  assert.strictEqual(formatWhatsAppUrl(''), null);
  assert.strictEqual(formatWhatsAppUrl('   '), null);
  assert.strictEqual(formatWhatsAppUrl(null), null);
});

// 2. Navbar Centering & Layout Structure Tests
const navbarPath = path.resolve('src/components/common/Navbar.jsx');
const navbarCode = fs.readFileSync(navbarPath, 'utf8');

check('Navbar uses 3-column CSS grid on desktop (md:grid-cols-[1fr_auto_1fr])', () => {
  assert.ok(navbarCode.includes('md:grid-cols-[1fr_auto_1fr]'), 'Missing 3-column grid');
});

check('Navbar aligns Logo to left column (md:justify-self-start)', () => {
  assert.ok(navbarCode.includes('md:justify-self-start'), 'Missing md:justify-self-start on logo');
});

check('Navbar centers Navigation Links horizontally (justify-self-center & justify-center)', () => {
  assert.ok(navbarCode.includes('justify-self-center'), 'Missing justify-self-center on nav links');
  assert.ok(navbarCode.includes('justify-center'), 'Missing justify-center on nav links');
});

check('Navbar aligns Action Bar / Register to right column (justify-self-end)', () => {
  assert.ok(navbarCode.includes('justify-self-end'), 'Missing justify-self-end on right action bar');
});

check('Navbar includes Login in centered navLinks when unauthenticated', () => {
  assert.ok(navbarCode.includes("!isAuthenticated ? [{ name: 'Login', path: '/login' }]"), 'Login link missing from navLinks');
});

check('Navbar retains active page indicator (isActive)', () => {
  assert.ok(navbarCode.includes('isActive(link.path)'), 'Active page indicator missing');
});

check('Navbar preserves mobile navigation drawer and toggle button', () => {
  assert.ok(navbarCode.includes('flex md:hidden items-center shrink-0 ml-2'), 'Mobile menu toggle missing');
  assert.ok(navbarCode.includes('id="mobile-navigation-drawer"'), 'Mobile navigation drawer missing');
});

// 3. Footer Social Links & Accessibility Tests
const footerPath = path.resolve('src/components/common/Footer.jsx');
const footerCode = fs.readFileSync(footerPath, 'utf8');

check('Footer imports and calls social link resolution helpers', () => {
  assert.ok(footerCode.includes("import { getInstagramUrl, getWhatsAppUrl } from '../../utils/socialLinks'"));
  assert.ok(footerCode.includes('getInstagramUrl()'));
  assert.ok(footerCode.includes('getWhatsAppUrl()'));
});

check('Footer social links protect external navigation with target="_blank" and rel="noopener noreferrer"', () => {
  assert.ok(footerCode.includes('target="_blank"'), 'target="_blank" missing');
  assert.ok(footerCode.includes('rel="noopener noreferrer"'), 'rel="noopener noreferrer" missing');
});

check('Footer social links include accessible keyboard focus styling', () => {
  assert.ok(footerCode.includes('focus:outline-none focus:ring-2 focus:ring-[#FFB900]'), 'Instagram focus ring missing');
  assert.ok(footerCode.includes('focus:outline-none focus:ring-2 focus:ring-[#25D366]'), 'WhatsApp focus ring missing');
});

check('Footer social links retain sharp-edge square styling (rounded-none)', () => {
  assert.ok(footerCode.includes('rounded-none bg-[#111318] border border-[#2A2A30]'), 'Missing rounded-none on social link containers');
});

check('Footer preserves authentic SVG vector graphics for Instagram and WhatsApp', () => {
  assert.ok(footerCode.includes('rx="5.5" stroke="url(#ig-gradient-compact)"'), 'Instagram SVG modified');
  assert.ok(footerCode.includes('fill="#25D366"'), 'WhatsApp SVG modified');
});

console.log('\n--------------------------------------------------------------------------------');
console.log(`TOTAL AUDITS: ${totalCount} | PASSED: ${passCount} | FAILED: ${totalCount - passCount}`);
console.log('--------------------------------------------------------------------------------\n');

if (passCount === totalCount) {
  console.log('🎉 ALL NAVBAR CENTERING & FOOTER SOCIAL LINK TESTS PASSED!\n');
  process.exit(0);
} else {
  console.error('❌ SOME AUDITS FAILED!\n');
  process.exit(1);
}
