# MJ ESPORTS — Storage Architecture & Cloudflare R2 Evaluation (Phase 4)

## 1. Storage Inventory & Asset Classification

### Active Storage Buckets

| Bucket Name | Visibility | Primary Purpose | Upload Source | Access Control Mechanism | File Size Limit | Current Storage Volume |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`avatars`** | Public | Player profile photos | `avatarService.js` / User profile | PostgreSQL RLS on `storage.objects` (`(storage.foldername(name))[1] = auth.uid()::text`) | 5 MB | Minimal (< 100 MB) |
| **`profile-proofs`** | Private | Free Fire UID / IGN verification screenshots | `playerEvidenceService.js` / Edit profile | PostgreSQL RLS: Owner INSERT/SELECT, Admin SELECT/ALL. Access via 1-hour signed URLs. | 5 MB | Minimal (< 250 MB) |

### Historical / Dropped Buckets
- `scoreboard-proofs`: Dropped in `supabase_phase_ocr_cleanup.sql`.
- `match-scorecards`: Dropped in `supabase_phase_ocr_cleanup.sql`.

---

## 2. File Category Classification

1. **Category A: Private / Security-Sensitive Evidence**
   - *Example*: Free Fire profile screenshots uploaded for identity verification (`profile-proofs`).
   - *Security Requirement*: Must remain strictly private. Unauthorized users must never be able to enumerate or view other players' screenshots.
   - *Target Provider*: **Supabase Storage**. Built-in PostgreSQL RLS provides immediate folder-level isolation based on `auth.uid()` and short-lived signed URLs.

2. **Category B: User-Specific Application Media**
   - *Example*: User profile avatars (`avatars`).
   - *Security Requirement*: Publicly readable so teammates and tournament organizers can view player avatars, but write/update/delete strictly isolated to the owning player.
   - *Target Provider*: **Supabase Storage**. Built-in PostgreSQL RLS policies enforce `auth.uid()::text` folder matching.

3. **Category C: Public High-Volume Media**
   - *Example*: Tournament hero banners, promotional sponsor assets, live stream graphics, future public match highlights.
   - *Security Requirement*: 100% public, high read frequency, zero confidentiality.
   - *Target Provider*: **Cloudflare R2** (when high-resolution custom media are introduced). Benefit: Zero egress fees worldwide.

4. **Category D: Temporary Processing Artifacts**
   - *Example*: In-browser OCR canvas buffers, temporary image slices.
   - *Storage Requirement*: In-memory only (WebAssembly memory / canvas buffer). No cloud storage persistence required.

---

## 3. Detailed Technology Comparison: Supabase Storage vs Cloudflare R2

| Dimension | Supabase Storage | Cloudflare R2 |
| :--- | :--- | :--- |
| **Free Storage Tier** | 1 GB included | 10 GB included |
| **Egress Bandwidth Cost** | 2 GB/month free; $0.09/GB thereafter on Pro | **$0.00 / GB (Zero Egress Fees worldwide)** |
| **Write Cost (Class A Ops)** | Included in project quota | 1M free/month ($4.50/M thereafter) |
| **Read Cost (Class B Ops)** | Included in project quota | 10M free/month ($0.36/M thereafter) |
| **Authentication Integration**| **Native Supabase Auth** (`auth.uid()`, JWT) | None. Requires custom signing service |
| **Row Level Security (RLS)** | **Native PostgreSQL RLS** on `storage.objects` | None. Requires server-side application logic |
| **Private Access (Signed URLs)**| Single SDK call (`createSignedUrl(path, 3600)`)| S3 Presigned URLs via AWS SDK v3 in Edge Func |
| **Client Upload Complexity** | Single client SDK call (`supabase.storage.upload`)| Requires S3 presigned PUT or backend proxy |
| **Operational Complexity** | Very Low (Managed with Database) | Medium (Separate S3 API keys, signing infra) |
| **Best Fit For** | Private user files, avatars, proofs | High-volume public media, video, large assets |

---

## 4. Recommended Target Architecture: Hybrid Model

```
                             MJ ESPORTS
                                  │
                     ┌────────────┴────────────┐
                     │                         │
                     ▼                         ▼
          Private / User Files        Public High-Volume Media
          (profile-proofs, avatars)   (tournament banners, media)
                     │                         │
                     ▼                         ▼
             Supabase Storage            Cloudflare R2
          • Auth session integration  • Zero egress cost
          • PostgreSQL RLS ownership  • Global Edge CDN delivery
          • Short-lived signed URLs   • Public custom domain
```

### Justification
1. **Security & Least Privilege**: Keeping `profile-proofs` in Supabase Storage ensures that PostgreSQL RLS policies enforce access control. Migrating to R2 would require custom Edge Function signing endpoints, increasing the attack surface.
2. **Economic Reality**: Current MJ ESPORTS storage is < 500 MB, well below the 1 GB free Supabase tier. Migrating everything to R2 solely for free storage would add unnecessary operational complexity.
3. **Prepared Scalability**: The new `storageService.js` abstraction allows public media (Category C) to be routed to Cloudflare R2 seamlessly when high-volume media assets are uploaded.

---

## 5. Non-Destructive Migration & Rollback Runbook (For Future Phase)

When public media or tournament banners are migrated to Cloudflare R2 in a future phase:

### Step 1: Pre-Migration Inventory
- Export list of all objects from target Supabase bucket using `supabase.storage.from(bucket).list()`.
- Calculate SHA-256 checksums for each object.

### Step 2: Dual-Read & Non-Destructive Copy
- Upload copies of public assets to the Cloudflare R2 bucket.
- **CRITICAL**: Do NOT delete original objects from Supabase Storage.

### Step 3: Verification
- Verify object counts and SHA-256 checksums in R2 match Supabase.
- Test public asset resolution via the Cloudflare R2 public URL / CDN domain.

### Step 4: Controlled Cutover
- Update `storageService.js` provider routing to point Category C requests to R2.
- Monitor error rates and cache hit ratios.

### Step 5: Rollback Plan (If issues arise)
- Revert `storageService.js` provider routing back to Supabase Storage.
- Because original Supabase files were never deleted, rollback is instantaneous (0 downtime).
