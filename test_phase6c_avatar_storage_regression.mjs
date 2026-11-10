import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('======================================================================');
console.log('MJ ESPORTS: Phase 6C Stage 2 Avatar Storage Static Verification Tests');
console.log('======================================================================\n');

let passed = 0;
let failed = 0;

function check(desc, fn) {
  try {
    fn();
    console.log(`  ✓ ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${desc}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

const sqlContent = fs.readFileSync('supabase_avatar_storage.sql', 'utf8');
const avatarServiceContent = fs.readFileSync('src/services/avatarService.js', 'utf8');
const dashboardContent = fs.readFileSync('src/pages/DashboardPage.jsx', 'utf8');
const editProfileContent = fs.readFileSync('src/pages/EditProfilePage.jsx', 'utf8');

console.log('--- GROUP 1: SQL File Integrity & Ownership Restrictions ---');
check('1.1. No unauthorized ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY exists', () => {
  assert(!/ALTER\s+TABLE\s+storage\.objects\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i.test(sqlContent), 'Must not contain ALTER TABLE storage.objects');
});

check('1.2. Public avatars bucket is created with ON CONFLICT DO UPDATE', () => {
  assert(sqlContent.includes("INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)"), 'Must insert into storage.buckets');
  assert(sqlContent.includes("ON CONFLICT (id) DO UPDATE SET"), 'Must have ON CONFLICT DO UPDATE');
});

check('1.3. Bucket preserves 5 MB file-size limit (5242880 bytes)', () => {
  assert(sqlContent.includes("5242880"), 'Must enforce 5242880 byte limit');
});

check('1.4. Bucket allows JPEG, JPG, PNG, and WebP MIME types', () => {
  assert(sqlContent.includes("'image/jpeg'"), 'Must allow image/jpeg');
  assert(sqlContent.includes("'image/jpg'"), 'Must allow image/jpg');
  assert(sqlContent.includes("'image/png'"), 'Must allow image/png');
  assert(sqlContent.includes("'image/webp'"), 'Must allow image/webp');
});

console.log('\n--- GROUP 2: Policy Idempotency & Drop Statements ---');
check('2.1. Drops Public Read Avatars if exists', () => {
  assert(sqlContent.includes('DROP POLICY IF EXISTS "Public Read Avatars" ON storage.objects;'), 'Must drop Public Read Avatars');
});

check('2.2. Drops Authenticated Users Upload Avatar if exists', () => {
  assert(sqlContent.includes('DROP POLICY IF EXISTS "Authenticated Users Upload Avatar" ON storage.objects;'), 'Must drop Authenticated Users Upload Avatar');
});

check('2.3. Drops Authenticated Users Update Avatar if exists', () => {
  assert(sqlContent.includes('DROP POLICY IF EXISTS "Authenticated Users Update Avatar" ON storage.objects;'), 'Must drop Authenticated Users Update Avatar');
});

check('2.4. Drops Authenticated Users Delete Avatar if exists', () => {
  assert(sqlContent.includes('DROP POLICY IF EXISTS "Authenticated Users Delete Avatar" ON storage.objects;'), 'Must drop Authenticated Users Delete Avatar');
});

console.log('\n--- GROUP 3: RLS Policy Security & Path Verification ---');
check('3.1. Public Read Policy allows SELECT on avatars bucket', () => {
  assert(/CREATE\s+POLICY\s+"Public Read Avatars"\s+ON\s+storage\.objects\s+FOR\s+SELECT\s+TO\s+public\s+USING\s*\(\s*bucket_id\s*=\s*'avatars'\s*\)/i.test(sqlContent), 'Must have public SELECT policy');
});

check('3.2. Upload policy enforces user folder or owner or admin ownership', () => {
  assert(sqlContent.includes('(storage.foldername(name))[1]'), 'Upload policy must inspect foldername');
  assert(/CREATE\s+POLICY\s+"Authenticated Users Upload Avatar"\s+ON\s+storage\.objects\s+FOR\s+INSERT\s+TO\s+authenticated\s+WITH\s+CHECK/i.test(sqlContent), 'Must have INSERT WITH CHECK policy');
});

check('3.3. Update policy enforces both USING and WITH CHECK', () => {
  const updateIdx = sqlContent.indexOf('"Authenticated Users Update Avatar"');
  const updateBlock = sqlContent.substring(updateIdx, updateIdx + 800);
  assert(updateBlock.includes('USING'), 'Update policy must contain USING clause');
  assert(updateBlock.includes('WITH CHECK'), 'Update policy must contain WITH CHECK clause');
  assert(updateBlock.includes('(storage.foldername(name))[1]'), 'Update policy must check foldername in both clauses');
});

check('3.4. Delete policy restricts to owner or admin', () => {
  const deleteIdx = sqlContent.indexOf('"Authenticated Users Delete Avatar"');
  const deleteBlock = sqlContent.substring(deleteIdx, deleteIdx + 800);
  assert(deleteBlock.includes('USING'), 'Delete policy must contain USING clause');
  assert(deleteBlock.includes('(storage.foldername(name))[1]'), 'Delete policy must check foldername');
  assert(deleteBlock.includes('public.is_admin()'), 'Delete policy must preserve admin access');
});

console.log('\n--- GROUP 4: Frontend Alignment & Upload Path ---');
check('4.1. avatarService.js uploads to ${userId}/${fileName}', () => {
  assert(avatarServiceContent.includes('const uploadPath = `${userId}/${fileName}`'), 'Upload path must be ${userId}/${fileName}');
});

check('4.2. avatarService.js uses AVATAR_BUCKET ("avatars")', () => {
  assert(avatarServiceContent.includes('const bucketName = AVATAR_BUCKET'), 'Bucket must be AVATAR_BUCKET');
});

check('4.3. DashboardPage.jsx passes user.id as userId', () => {
  assert(dashboardContent.includes('uploadAvatarFile(croppedFile, user.id'), 'DashboardPage must pass user.id');
});

check('4.4. EditProfilePage.jsx passes user.id as userId', () => {
  assert(editProfileContent.includes('uploadAvatarFile(croppedFile, user.id'), 'EditProfilePage must pass user.id');
});

console.log('\n--- GROUP 5: Production Isolation & Safety ---');
check('5.1. Production .env remains untouched', () => {
  const prodEnv = fs.readFileSync('.env', 'utf8');
  assert(prodEnv.includes('fdhjqlejomtgwffqgmoq'), 'Production .env must point to fdhjqlejomtgwffqgmoq');
});

check('5.2. supabase/.temp/linked-project.json remains linked to production', () => {
  const linked = fs.readFileSync('supabase/.temp/linked-project.json', 'utf8');
  assert(linked.includes('fdhjqlejomtgwffqgmoq'), 'CLI link must remain production ref');
});

console.log('\n======================================================================');
console.log(`TOTAL CHECKS: ${passed + failed}`);
console.log(`PASSED: ${passed}`);
console.log(`FAILED: ${failed}`);
console.log('======================================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('ALL PHASE 6C STAGE 2 AVATAR STORAGE VERIFICATION CHECKS PASSED!');
}

