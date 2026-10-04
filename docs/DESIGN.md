# MJ ESPORTS — UI/UX Design System Specification (DESIGN.md)

## 1. Visual Direction & Aesthetic Philosophy

MJ ESPORTS features a **high-contrast, cyberpunk-inspired dark aesthetic** based on the Google Stitch UI-1 design system. The design language evokes a competitive esports arena: deep charcoal surfaces, ambient glows, precise angular cards, vibrant neon cyan accents, and high-energy orange call-to-actions.

### Core Visual Principles:
- **Tonal Depth over Flat Surfaces:** Interfaces use a multi-tiered surface elevation model rather than pure black backgrounds, creating clear visual hierarchy.
- **Intentional Neon Highlights:** Vibrant colors are reserved for actionable elements, live competition states, and status badges.
- **Cyberpunk Precision:** Sharp 4px–8px border radii, subtle 1px stroke borders (`#27272a`), and technical monospaced statistics.
- **Motion with Purpose:** Smooth 150ms–250ms ease-out transitions (`cubic-bezier(0.16, 1, 0.3, 1)`), shimmer highlights on hover, and gentle glow pulses for live matches.

---

## 2. Color System & Design Tokens

Defined in `src/index.css` and `src/styles/designSystem.css`:

### 2.1 Surface & Background Tokens
| Token | Hex Value | Semantic Usage |
| :--- | :--- | :--- |
| `--color-surface-container-lowest` | `#0e0e0f` | Recessed backgrounds, input field fills, dark wells |
| `--color-background` / `--color-surface` | `#131314` | Primary viewport canvas background |
| `--color-surface-elevated` | `#141416` | Standard card backgrounds, navbar bar background |
| `--color-surface-container-low` | `#1c1b1c` | Table rows, inactive tab headers |
| `--color-surface-container` | `#201f20` | Modal panels, dropdown menus, flyouts |
| `--color-surface-container-high` | `#2a2a2b` | Hover state for interactive cards and rows |
| `--color-surface-container-highest` | `#353436` | Active state, chip backgrounds |
| `--color-surface-stroke` | `#27272a` | Default 1px card borders, dividing rules |

### 2.2 Brand & Accent Tokens
| Token | Hex Value | Role |
| :--- | :--- | :--- |
| `--color-primary-container` | `#00f2ff` | **Cyber Cyan:** Primary brand identity, tabs, links, verified checkmarks |
| `--color-primary-fixed-dim` | `#00dbe7` | Active cyan hover state, glow highlights |
| `--color-secondary-container` | `#ff5e07` | **Action Orange:** Primary CTA buttons ("Book Slot", "Register Squad") |
| `--color-secondary-fixed-dim` | `#ffb59a` | Secondary text accents, subtle badges |
| `--color-tertiary-container` | `#fed83a` | **Warning Gold / Amber:** Waitlist state, coin icons, rank #1 accents |
| `--color-success` | `#10b981` | Emerald Green: Confirmed status, active online, ready checks |
| `--color-warning` | `#f59e0b` | Cautionary notices, closing soon warnings |
| `--color-error` | `#ef4444` | Danger Red: Form errors, cancellations, match remake alerts |

### 2.3 Text & Content Tokens
| Token | Hex Value | Usage |
| :--- | :--- | :--- |
| `--color-on-surface` | `#e5e2e3` | High-emphasis primary headings and body copy |
| `--color-on-surface-variant` | `#b9cacb` | Medium-emphasis labels, secondary meta descriptions |
| `--color-outline` | `#849495` | Low-emphasis placeholder text, disabled icons |
| `--color-outline-variant` | `#3a494b` | Subtle divider lines and decorative borders |

---

## 3. Typography Hierarchy

Fonts are loaded from Google Fonts (`Inter`, `Hanken Grotesk`, and `Geist`):
- **Headline Font (`--font-headline`):** `"Hanken Grotesk", "Geist", system-ui, sans-serif` — Used for page titles, tournament banners, modal headers, and display metrics.
- **Body Font (`--font-body`):** `"Inter", system-ui, sans-serif` — Used for general UI copy, form inputs, table content, and descriptions.
- **Label / Mono Font (`--font-label`):** `"Inter", "Geist", monospace` — Used for UIDs, timestamps, room credentials, and kill scores.

### Scale:
- **Display XL:** 72px / line-height 80px (Hero titles; mobile fallback: 40px / 48px).
- **Heading 1:** 32px / line-height 40px (Page titles, tournament names).
- **Heading 2:** 24px / line-height 32px (Section headers, card group titles).
- **Heading 3:** 18px / line-height 26px (Card titles, modal subheaders).
- **Body Large:** 16px / line-height 24px (Lead paragraphs, card descriptions).
- **Body Regular:** 14px / line-height 20px (Default body copy, form fields).
- **Caption / Meta:** 12px / line-height 16px (Timestamps, badges, slot counters).

---

## 4. Components & Pattern Library

### 4.1 Buttons
1. **Primary Action Button (Orange CTA):**
   - Background: `bg-[#ff5e07] hover:bg-[#e05204] text-white font-bold`
   - Shadows: `shadow-[0_0_16px_rgba(255,94,7,0.35)]`
   - Height: 44px min tap target (`py-2.5 px-6 rounded-md`)
   - Micro-interaction: Shimmer hover highlight with subtle scale transform (`active:scale-[0.98]`).
2. **Secondary Primary Button (Cyan Brand):**
   - Background: `bg-[#00f2ff] hover:bg-[#00dbe7] text-[#00363a] font-bold`
   - Shadow: `shadow-[0_0_16px_rgba(0,242,255,0.3)]`
3. **Outlined / Ghost Button:**
   - Background: `bg-transparent hover:bg-[#201f20] text-[#e5e2e3] border border-[#27272a]`
4. **Destructive Button:**
   - Background: `bg-[#ef4444]/15 hover:bg-[#ef4444]/25 text-[#ef4444] border border-[#ef4444]/30`

### 4.2 Cards
- **Base Card:** `bg-[#141416] border border-[#27272a] rounded-lg p-5 transition-all duration-200`
- **Interactive Card Hover:** `hover:border-[#00f2ff]/40 hover:shadow-[0_4px_20px_rgba(0,242,255,0.12)] hover:-translate-y-0.5`
- **Tournament Card:** Displays map thumbnail preview, game badge (`Free Fire MAX`), format chip (`Squad`), entry fee badge (`FREE`), prize pool, progress bar (`X / 48 Players`), and CTA button.

### 4.3 Form Elements
- **Input Fields:** `bg-[#0e0e0f] border border-[#27272a] text-[#e5e2e3] focus:border-[#00f2ff] focus:ring-1 focus:ring-[#00f2ff] rounded-md px-3.5 py-2.5 text-sm outline-none`
- **Placeholder:** `text-[#849495]`
- **Validation Errors:** Highlighted in red border (`border-[#ef4444]`) with descriptive error text below (`text-xs text-[#ef4444] mt-1 flex items-center gap-1`).

### 4.4 Modals & Overlays
- **Backdrop:** `bg-black/80 backdrop-blur-sm fixed inset-0 z-50 flex items-center justify-center p-4`
- **Dialog Container:** `bg-[#201f20] border border-[#27272a] rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl`
- **Dismissibility:** Dismiss on backdrop click, explicit close button (`X`), and keyboard `Escape`. Focus trapped within open modal.

### 4.5 Tables & Data Grids
- **Header:** `bg-[#1c1b1c] text-[#b9cacb] uppercase text-xs font-semibold tracking-wider py-3 px-4 border-b border-[#27272a]`
- **Row:** `border-b border-[#27272a]/60 hover:bg-[#2a2a2b]/50 text-sm py-3 px-4 transition-colors`
- **Rank Accents:** Rank 1 styled in `#fed83a` (gold), Rank 2 in `#b9cacb` (silver), Rank 3 in `#ffb59a` (bronze).

---

## 5. Domain-Specific UI Patterns

### 5.1 Tournament Experience
- **Slot Fill Progress Bar:** Horizontal bar with cyan gradient fill. Changes to warning gold at 85%+ capacity (`ALMOST FULL`) and red at 100% (`FULL`).
- **Status Badges:**
  - `OPEN`: Green pill (`bg-[#10b981]/15 text-[#10b981] border-[#10b981]/30`)
  - `ALMOST FULL`: Amber pill (`bg-[#fed83a]/15 text-[#fed83a] border-[#fed83a]/30`)
  - `LIVE NOW`: Cyan pulsing pill (`bg-[#00f2ff]/20 text-[#00f2ff] border-[#00f2ff]/40 animate-pulseGlow`)
  - `COMPLETED`: Muted gray pill (`bg-[#2a2a2b] text-[#849495]`)

### 5.2 Match Control & Scheduling UI (N2)
- Multi-round tabs: Pill buttons displaying round number, map name, and operational status icon.
- Room Credential Display: High-contrast monospaced credential cards featuring copy-to-clipboard icons with visual "Copied!" checkmark feedback.

### 5.3 Player Team / Squad Portal UI (N3)
- Located at `/profile/team`.
- Overview header: Clan tag pill, squad name, recruitment toggle badge, and member capacity meter (`X / 6 Members`).
- Roster grid: Captain card with star badge, starting lineup cards (up to 3 Members) with verified UID badges, and bench substitute slots (up to 2 Substitutes).
- Action modal suite: Create Team, Invite Teammate (with UID validation), Transfer Captaincy (with double confirmation), and Disband Squad.

### 5.4 Notification Drawer (N1)
- Global Bell Trigger in Navbar with unread count badge (`bg-[#ef4444] text-white text-[10px] font-bold rounded-full h-4 min-w-[16px] px-1`).
- Flyout drawer displaying chronological notifications with category icons (trophy for matches, users for squad invites, alert for remakes).
- Single-click action buttons directly inside invite notifications ("Accept" / "Decline").

---

## 6. Responsive Breakpoints & Viewport Behavior

Tested and verified across all standard responsive devices:

| Breakpoint | Minimum Width | Target Devices & Behavior |
| :--- | :--- | :--- |
| `xs` | `380px` | Compact smartphones (iPhone SE, Galaxy A-series). Single-column stacked layouts, condensed header padding. |
| `sm` | `640px` | Standard smartphones (iPhone 14/15/16, Pixel). Full-width cards with expanded touch targets. |
| `md` | `768px` | Tablets & Foldables (iPad Mini, Surface Duo). 2-column tournament cards, horizontal stat strips. |
| `lg` | `1024px` | Small laptops & iPad Pro. 3-column tournament grid, persistent admin sidebar navigation. |
| `xl` | `1280px` | Standard desktop displays. Full widescreen layout with max container width `max-w-7xl`. |
| `2xl` | `1440px` | High-resolution widescreen monitors. Centered layout with balanced gutters and max content margins. |

### Mobile-Specific UX Rules:
- All interactive touch targets (buttons, links, inputs, close icons) must meet a minimum size of **44px × 44px**.
- Mobile tab strips (tournament formats, match rounds) use smooth horizontal scrolling with scrollbars hidden (`.hide-scrollbar`).
- Modal dialogs occupy full width on mobile with bottom-sheet or full-screen sheet styling for optimal thumb ergonomics.

---

## 7. Accessibility, States & Micro-Interactions

### 7.1 Accessibility (a11y)
- **Contrast Compliance:** Text color `--color-on-surface` (`#e5e2e3`) on `--color-background` (`#131314`) achieves a contrast ratio of >14:1, exceeding WCAG AAA standards.
- **Focus Rings:** All interactive elements declare visible focus indicators: `focus-visible:ring-2 focus-visible:ring-[#00f2ff] focus-visible:outline-none`.
- **Reduced Motion:** Fully supports `prefers-reduced-motion: reduce` by zeroing transition durations and suppressing background glow animations.

### 7.2 UI State Standards
- **Loading State:** Content areas render pulse-shimmer skeleton blocks mimicking component geometry (`shimmer-effect bg-[#1c1b1c] rounded`). Buttons show embedded spinner alongside loading copy ("Processing...").
- **Empty State:** Centered card featuring a relevant domain icon (e.g., Lucide `Users`, `Trophy`, `BellOff`), bold title, concise explanatory sentence, and a primary CTA button.
- **Error State:** Inlined contextual alert box (`bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#ef4444] rounded-lg p-4`) accompanied by an explicit "Retry" button.
