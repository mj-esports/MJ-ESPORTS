import { useState, useEffect } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { Swords, ShieldCheck, Trophy, Users, Mail, FileText, Lock } from 'lucide-react'

export default function AboutPage({ defaultTab = 'about' }) {
  const location = useLocation()
  const [searchParams] = useSearchParams()

  const resolveInitialTab = () => {
    if (location.pathname.includes('/privacy')) return 'privacy'
    if (location.pathname.includes('/terms')) return 'terms'
    const tabParam = searchParams.get('tab')
    if (tabParam && ['about', 'privacy', 'terms', 'contact'].includes(tabParam)) {
      return tabParam
    }
    return defaultTab || 'about'
  }

  const [activeTab, setActiveTab] = useState(resolveInitialTab)

  useEffect(() => {
    setActiveTab(resolveInitialTab())
  }, [location.pathname, searchParams, defaultTab])

  const tabs = [
    { id: 'about', label: 'Platform & Rules', icon: Swords },
    { id: 'privacy', label: 'Privacy Policy', icon: Lock },
    { id: 'terms', label: 'Terms of Service', icon: FileText },
    { id: 'contact', label: 'Support & Contact', icon: Mail },
  ]

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6 sm:space-y-8">
      
      {/* Header Banner */}
      <div className="text-center space-y-2.5 max-w-2xl mx-auto">
        <div className="flex items-center justify-center mx-auto">
          <img
            src="/mj-esports-logo.png"
            alt="MJ ESPORTS"
            className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full object-contain border border-[#00f2ff]/40 shadow-[0_0_25px_rgba(0,242,255,0.3)]"
          />
        </div>
        <h1 className="font-display-lg text-2xl sm:text-4xl md:text-5xl font-extrabold text-white uppercase tracking-tight">
          MJ ESPORTS ARENA
        </h1>
        <p className="text-[#8e9dae] text-xs sm:text-sm max-w-lg mx-auto leading-relaxed">
          India's premier tournament platform engineered for competitive gamers, teams, and organizers.
        </p>
      </div>

      {/* Category Navigation (Responsive 2-col on mobile, flex on sm+, NO horizontal clipping) */}
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-center gap-2 border-b border-[#27272a] pb-4 font-headline text-xs font-bold uppercase tracking-wider max-w-2xl mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={`about-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2.5 rounded border transition-all duration-200 flex items-center justify-center gap-2 min-h-[44px] cursor-pointer ${
                isActive
                  ? 'border-[#00f2ff] text-[#00363a] bg-[#00f2ff] font-extrabold shadow-[0_0_12px_rgba(0,242,255,0.3)]'
                  : 'border-[#27272a] bg-[#141416] text-[#8e9dae] hover:text-white hover:border-[#3f3f46]'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      <div className="max-w-4xl mx-auto pt-2">
        {activeTab === 'about' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 text-left">
            <div className="bg-[#141416] border border-[#27272a] rounded p-5 sm:p-6 space-y-3 shadow-xl">
              <div className="w-10 h-10 rounded bg-[#00f2ff]/10 border border-[#00f2ff]/30 flex items-center justify-center text-[#00f2ff]">
                <Trophy className="w-5 h-5" />
              </div>
              <h3 className="font-headline text-base font-bold text-white uppercase">Pro Tournaments</h3>
              <p className="text-xs text-[#8e9dae] leading-relaxed">Daily and weekly competitive Free Fire MAX matches with real prize pools.</p>
            </div>

            <div className="bg-[#141416] border border-[#27272a] rounded p-5 sm:p-6 space-y-3 shadow-xl">
              <div className="w-10 h-10 rounded bg-[#ff5e07]/10 border border-[#ff5e07]/30 flex items-center justify-center text-[#ff5e07]">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-headline text-base font-bold text-white uppercase">Fair Play Engine</h3>
              <p className="text-xs text-[#8e9dae] leading-relaxed">Strict anti-cheat verification, character UID tracking, and verified organizer match moderation.</p>
            </div>

            <div className="bg-[#141416] border border-[#27272a] rounded p-5 sm:p-6 space-y-3 shadow-xl">
              <div className="w-10 h-10 rounded bg-[#10b981]/10 border border-[#10b981]/30 flex items-center justify-center text-[#10b981]">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-headline text-base font-bold text-white uppercase">Squad Management</h3>
              <p className="text-xs text-[#8e9dae] leading-relaxed">Manage squad rosters, captain approvals, and track seasonal leaderboard points.</p>
            </div>
          </div>
        )}

        {activeTab === 'privacy' && (
          <div className="bg-[#141416] border border-[#27272a] rounded p-5 sm:p-8 space-y-6 text-xs sm:text-sm text-[#e1e2e7] leading-relaxed text-left shadow-xl break-words">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#27272a] pb-4">
              <h2 className="font-headline text-lg sm:text-xl font-bold uppercase text-[#00f2ff] tracking-tight">
                PRIVACY POLICY
              </h2>
              <span className="text-[11px] font-mono text-[#8e9dae]">
                Last Updated: September 18, 2026
              </span>
            </div>

            <p className="text-[#b9cacb]">
              This Privacy Policy explains how MJ ESPORTS collects, uses, and safeguards information when you register, compete in tournaments, use wallet services, or access our platform. We process personal information strictly to operate competitive esports tournaments and manage player accounts.
            </p>

            {/* 1. Information We Collect */}
            <div className="space-y-2">
              <h3 className="font-headline font-bold text-white uppercase text-sm sm:text-base">
                1. Information We Collect
              </h3>
              <p className="text-[#8e9dae]">
                We collect only the categories of information necessary to deliver tournament services:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-[#8e9dae]">
                <li>
                  <strong className="text-white">Account Information:</strong> Username, email address, password hash (managed securely via Supabase Auth), and optional avatar image.
                </li>
                <li>
                  <strong className="text-white">In-Game Identity:</strong> Free Fire in-game name (IGN) and character UID (used for match roster verification).
                </li>
                <li>
                  <strong className="text-white">Tournament & Squad Details:</strong> Team names, squad rosters, captain contact phone number (when provided during registration), check-in records, assigned custom room lobby slots, and match incident reports.
                </li>
                <li>
                  <strong className="text-white">Match Evidence & Scorecards:</strong> Post-match screenshot proof uploads, reported kill counts, finish placements, and OCR text extraction data.
                </li>
                <li>
                  <strong className="text-white">Financial & Wallet Records:</strong> Razorpay payment identifiers (Order ID, Payment ID, amount, status), in-app wallet balance, immutable transaction history (<code className="text-[#00f2ff]">wallet_ledger</code>), and user-provided withdrawal payout details (UPI ID or bank account number and IFSC code).
                </li>
              </ul>
            </div>

            {/* 2. How We Use Information */}
            <div className="space-y-2">
              <h3 className="font-headline font-bold text-white uppercase text-sm sm:text-base">
                2. How We Use Information
              </h3>
              <p className="text-[#8e9dae]">
                Collected information is used strictly for operational tournament functions:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-[#8e9dae]">
                <li>Authenticating user accounts and securing account access.</li>
                <li>Processing tournament registrations, bracket seeds, and custom room slot assignments.</li>
                <li>Verifying player identities during match check-in to prevent unauthorized account substitution.</li>
                <li>Calculating authoritative match standings, points, leaderboard rankings, and prize eligibility.</li>
                <li>Facilitating entry fee payments, wallet top-ups, tournament cancellation refunds, and withdrawal disbursements.</li>
                <li>Auditing match score disputes, incident reports, and investigating fair play violations.</li>
                <li>Delivering essential platform notifications regarding match schedules and room credentials.</li>
              </ul>
            </div>

            {/* 3. Publicly Displayed vs. Private Information */}
            <div className="space-y-2">
              <h3 className="font-headline font-bold text-white uppercase text-sm sm:text-base">
                3. Publicly Displayed vs. Private Information
              </h3>
              <p className="text-[#8e9dae]">
                To maintain competitive transparency in esports, certain details are displayed publicly on tournament rosters and leaderboards:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div className="p-3.5 bg-[#1c1b1c] rounded border border-[#27272a] space-y-1">
                  <span className="text-[11px] font-headline font-bold text-[#00f2ff] uppercase block">
                    Publicly Visible Details:
                  </span>
                  <ul className="list-disc pl-4 space-y-1 text-xs text-[#8e9dae]">
                    <li>Free Fire in-game name (IGN) & character UID</li>
                    <li>Team name, captain name & squad members</li>
                    <li>Lobby slot assignments & check-in readiness</li>
                    <li>Match scores (kills, placement, total points)</li>
                    <li>Platform leaderboards & winner announcements</li>
                  </ul>
                </div>
                <div className="p-3.5 bg-[#1c1b1c] rounded border border-[#27272a] space-y-1">
                  <span className="text-[11px] font-headline font-bold text-[#10b981] uppercase block">
                    Strictly Private Details:
                  </span>
                  <ul className="list-disc pl-4 space-y-1 text-xs text-[#8e9dae]">
                    <li>Account email address & hashed credentials</li>
                    <li>Phone numbers provided during booking</li>
                    <li>Bank account numbers & UPI payout details (masked in UI)</li>
                    <li>Internal audit logs & private proof uploads</li>
                    <li>Transaction logs & personal wallet balance</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 4. Payment Processing */}
            <div className="space-y-2">
              <h3 className="font-headline font-bold text-white uppercase text-sm sm:text-base">
                4. Payment Processing
              </h3>
              <p className="text-[#8e9dae]">
                Online payments for paid tournaments and wallet top-ups are securely processed through <strong className="text-white">Razorpay</strong>. MJ ESPORTS does not collect, store, or process debit/credit card numbers, CVVs, net banking credentials, or UPI MPINs. All payment credential handling is executed directly by Razorpay's PCI-DSS compliant checkout interface. We store only standard transaction confirmation metadata (such as Razorpay Order ID, Payment ID, timestamp, and amount) for verification and refund processing.
              </p>
            </div>

            {/* 5. Third-Party Services */}
            <div className="space-y-2">
              <h3 className="font-headline font-bold text-white uppercase text-sm sm:text-base">
                5. Third-Party Services
              </h3>
              <p className="text-[#8e9dae]">
                We partner with trusted service providers to run platform infrastructure:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-[#8e9dae]">
                <li>
                  <strong className="text-white">Supabase:</strong> Cloud database (PostgreSQL), user authentication, private storage buckets, and realtime WebSocket communication.
                </li>
                <li>
                  <strong className="text-white">Razorpay:</strong> Regulated payment gateway for processing entry payments and top-ups in Indian Rupees (INR).
                </li>
                <li>
                  <strong className="text-white">Vercel:</strong> Global content delivery network and cloud hosting platform for the frontend application.
                </li>
                <li>
                  <strong className="text-white">Google Fonts:</strong> Web typography asset delivery directly via Google CDN.
                </li>
              </ul>
            </div>

            {/* 6. Data Security */}
            <div className="space-y-2">
              <h3 className="font-headline font-bold text-white uppercase text-sm sm:text-base">
                6. Data Security
              </h3>
              <p className="text-[#8e9dae]">
                We implement comprehensive technical and organizational safeguards to protect user information:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-[#8e9dae]">
                <li>Enforced HTTPS/TLS encryption for all client-to-server data transfers.</li>
                <li>Database-level PostgreSQL Row Level Security (RLS) policies guaranteeing player tenant isolation.</li>
                <li>Role-based access controls restricting administrative actions to verified organizers.</li>
                <li>Private storage access controls with time-limited signed URLs for evidence inspection.</li>
                <li>Cryptographic webhook verification and idempotency keys preventing replay attacks.</li>
                <li>Immutable ledger tracking for all wallet transactions and match operations.</li>
              </ul>
              <p className="text-[11px] text-[#8e9dae] italic">
                Please note that while we maintain industry-standard security safeguards, no method of transmission over the internet or electronic storage is completely infallible.
              </p>
            </div>

            {/* 7. Data Retention */}
            <div className="space-y-2">
              <h3 className="font-headline font-bold text-white uppercase text-sm sm:text-base">
                7. Data Retention
              </h3>
              <p className="text-[#8e9dae]">
                Information may be retained for as long as reasonably necessary to provide the service, maintain transaction and tournament records, meet security requirements, resolve disputes, or comply with applicable obligations. Inactive account records and completed tournament scorecards are maintained to preserve historical leaderboard integrity and financial auditing.
              </p>
            </div>

            {/* 8. Cookies & Local Storage */}
            <div className="space-y-2">
              <h3 className="font-headline font-bold text-white uppercase text-sm sm:text-base">
                8. Cookies & Local Storage
              </h3>
              <p className="text-[#8e9dae]">
                MJ ESPORTS does not use third-party advertising cookies, cross-site trackers, or behavioral analytics cookies. We use browser <code className="text-[#00f2ff]">localStorage</code> solely for essential functionality: maintaining your authenticated session and storing local administrative preferences.
              </p>
            </div>

            {/* 9. User Requests & Privacy Contact */}
            <div className="space-y-2">
              <h3 className="font-headline font-bold text-white uppercase text-sm sm:text-base">
                9. User Rights & Privacy Inquiries
              </h3>
              <p className="text-[#8e9dae]">
                Players may update their profile information directly via the platform's profile settings. For privacy inquiries, account data verification, or data deletion requests, you may contact our administration team at:
              </p>
              <div className="p-3 bg-[#1c1b1c] rounded border border-[#27272a] inline-block">
                <span className="text-[10px] uppercase font-bold text-[#8e9dae] block">Official Privacy & Support Contact:</span>
                <a
                  href="mailto:support.mjesports@gmail.com?subject=MJ%20ESPORTS%20Privacy%20Request"
                  className="text-[#00f2ff] font-mono font-bold hover:underline"
                >
                  support.mjesports@gmail.com
                </a>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'terms' && (
          <div className="bg-[#141416] border border-[#27272a] rounded p-5 sm:p-8 space-y-6 text-xs sm:text-sm text-[#e1e2e7] leading-relaxed text-left shadow-xl break-words">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#27272a] pb-4">
              <h2 className="font-headline text-lg sm:text-xl font-bold uppercase text-[#00f2ff] tracking-tight">
                TERMS OF SERVICE
              </h2>
              <span className="text-[11px] font-mono text-[#8e9dae]">
                Last Updated: September 18, 2026
              </span>
            </div>

            <p className="text-[#b9cacb]">
              These Terms of Service ("Terms") govern your access to and participation in competitive esports tournaments, custom match rooms, wallet services, and features provided by MJ ESPORTS. Please review these Terms carefully before creating an account, registering a squad, or entering any tournament.
            </p>

            {/* 1. Acceptance of Terms */}
            <div className="space-y-2">
              <h3 className="font-headline font-bold text-white uppercase text-sm sm:text-base">
                1. Acceptance of Terms
              </h3>
              <p className="text-[#8e9dae]">
                By creating an account, accessing the MJ ESPORTS platform, registering for any tournament (whether free or paid), or participating in any match, you acknowledge that you have read, understood, and agreed to be legally bound by these Terms of Service, the official Tournament Rulebook, and our Privacy Policy. If you do not agree to these Terms, you must not access the platform or register for tournaments.
              </p>
            </div>

            {/* 2. Eligibility & Accounts */}
            <div className="space-y-2">
              <h3 className="font-headline font-bold text-white uppercase text-sm sm:text-base">
                2. Eligibility & Accounts
              </h3>
              <p className="text-[#8e9dae]">
                To participate in MJ ESPORTS tournaments, players must register an authenticated account with a valid email address, username, and password. Players are strictly required to bind and maintain their genuine Free Fire character in-game name (IGN) and numeric character UID. You are solely responsible for:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-[#8e9dae]">
                <li>Providing truthful, complete, and up-to-date account registration details.</li>
                <li>Maintaining the confidentiality of your login credentials and preventing unauthorized account access.</li>
                <li>Ensuring you possess the understanding and capability to abide by competitive tournament regulations and fair play guidelines.</li>
              </ul>
            </div>

            {/* 3. Tournament Registration */}
            <div className="space-y-2">
              <h3 className="font-headline font-bold text-white uppercase text-sm sm:text-base">
                3. Tournament Registration
              </h3>
              <p className="text-[#8e9dae]">
                Tournament registration is conducted directly through the platform. Players may register for published Solo, Duo, or Squad tournaments subject to slot availability:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-[#8e9dae]">
                <li>
                  <strong className="text-white">Captain Responsibilities:</strong> For team and squad events, the team captain registers the squad, submits all member Free Fire UIDs and IGNs, ensures squad readiness, and communicates room schedules to teammates.
                </li>
                <li>
                  <strong className="text-white">Lobby Slot Allocation:</strong> Upon confirmed registration, squads are allocated specific custom room lobby slots (e.g., Slots 1 through 12).
                </li>
                <li>
                  <strong className="text-white">Registration Integrity:</strong> Players may not register phantom or ghost rosters, manipulate slot allocations, register across multiple teams for the same match, or register on behalf of competitors without authorization.
                </li>
              </ul>
            </div>

            {/* 4. Entry Fees & Payments */}
            <div className="space-y-2">
              <h3 className="font-headline font-bold text-white uppercase text-sm sm:text-base">
                4. Entry Fees & Payments
              </h3>
              <p className="text-[#8e9dae]">
                MJ ESPORTS hosts both free-to-enter and paid entry tournaments. For paid tournaments, entry fees are clearly displayed in Indian Rupees (INR):
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-[#8e9dae]">
                <li>
                  <strong className="text-white">Payment Methods:</strong> Entry fees may be paid using available in-app wallet balance or via our integrated online payment gateway, <strong className="text-white">Razorpay</strong> (supporting UPI, debit/credit cards, and net banking).
                </li>
                <li>
                  <strong className="text-white">Payment Credential Security:</strong> All online payment processing is executed directly by Razorpay's PCI-DSS compliant interface. MJ ESPORTS does not collect, store, or process card numbers, CVVs, net banking credentials, or UPI MPINs.
                </li>
                <li>
                  <strong className="text-white">Payment Confirmation:</strong> A tournament registration is considered successfully paid and confirmed only upon verified payment confirmation (cryptographically verified Razorpay webhook or atomic wallet debit ledger entry). Pending, abandoned, or unverified payment attempts do not reserve a tournament slot.
                </li>
              </ul>
            </div>

            {/* 5. Refunds & Cancellations */}
            <div className="space-y-2">
              <h3 className="font-headline font-bold text-white uppercase text-sm sm:text-base">
                5. Refunds & Cancellations
              </h3>
              <p className="text-[#8e9dae]">
                Refunds and tournament cancellations are governed strictly by the platform's authoritative transaction and database rules:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div className="p-3.5 bg-[#1c1b1c] rounded border border-[#27272a] space-y-1.5">
                  <span className="text-[11px] font-headline font-bold text-[#10b981] uppercase block">
                    When Refunds Are Available:
                  </span>
                  <ul className="list-disc pl-4 space-y-1 text-xs text-[#8e9dae]">
                    <li>
                      <strong className="text-white">Tournament Cancellation:</strong> If a tournament is cancelled by platform administrators prior to completion (due to operational issues or server disruptions), 100% of the verified paid entry fee is authoritatively refunded as an in-app wallet credit via the platform's atomic refund procedure.
                    </li>
                    <li>
                      <strong className="text-white">Verified Paid Entries:</strong> Refunds apply strictly to registrations with confirmed payment evidence (<code className="text-[#00f2ff]">CONSUMED</code> Razorpay transaction or confirmed <code className="text-[#00f2ff]">ENTRY_FEE_DEBIT</code> wallet ledger record).
                    </li>
                    <li>
                      <strong className="text-white">Wallet Credit Utility:</strong> Refunded wallet balances can be used immediately to enter other tournaments or requested for withdrawal subject to withdrawal policies.
                    </li>
                  </ul>
                </div>

                <div className="p-3.5 bg-[#1c1b1c] rounded border border-[#27272a] space-y-1.5">
                  <span className="text-[11px] font-headline font-bold text-[#ff5e07] uppercase block">
                    Non-Refundable Circumstances:
                  </span>
                  <ul className="list-disc pl-4 space-y-1 text-xs text-[#8e9dae]">
                    <li>
                      <strong className="text-white">Free Tournaments:</strong> No refund is issued for free tournaments as no entry fee was charged.
                    </li>
                    <li>
                      <strong className="text-white">Unpaid Orders:</strong> Abandoned or unconfirmed checkout transactions are ineligible for refunds.
                    </li>
                    <li>
                      <strong className="text-white">Voluntary Withdrawals / No-Shows:</strong> Player dropouts after registration closes, failure to check in, or no-shows in the custom room forfeit their entry fee.
                    </li>
                    <li>
                      <strong className="text-white">Rule Violations:</strong> Squads disqualified for cheating, UID mismatches, or toxic conduct forfeit all fees.
                    </li>
                    <li>
                      <strong className="text-white">Completed Tournaments:</strong> Tournaments that have concluded or where results are pending cannot be cancelled or refunded.
                    </li>
                  </ul>
                </div>
              </div>
              <p className="text-[11px] text-[#8e9dae] italic pt-1">
                Note on Remakes: If an official match remake is approved due to in-game technical issues, room credentials and check-in are reset for a rematch. Remakes do not constitute tournament cancellations or cash refunds unless the entire tournament is formally terminated by administrators.
              </p>
            </div>

            {/* 6. Fair Play & Prohibited Conduct */}
            <div className="space-y-2">
              <h3 className="font-headline font-bold text-white uppercase text-sm sm:text-base">
                6. Fair Play & Prohibited Conduct
              </h3>
              <p className="text-[#8e9dae]">
                MJ ESPORTS enforces a zero-tolerance policy against unfair play and competitive misconduct. The following behaviors are strictly prohibited:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-[#8e9dae]">
                <li>Using unauthorized third-party software, modified APKs, memory editors, auto-aim scripts, recoil reducers, wallhacks, or speed hacks.</li>
                <li>Exploiting in-game bugs, unintended map glitches, or server exploits to secure an unfair advantage.</li>
                <li>Match-fixing, teaming or collusion between competing squads, intentional feeding, or sharing tactical room information with opposing players.</li>
                <li>Providing false, stolen, or mismatched Free Fire character UIDs or impersonating another player.</li>
                <li>Harassment, threats, hate speech, vulgarity, or abusive behavior directed toward referees, staff, or fellow competitors.</li>
                <li>Payment fraud, fraudulent chargebacks, exploitation of wallet credits, or attempts to bypass platform security safeguards.</li>
              </ul>
              <p className="text-[#8e9dae]">
                Fair play compliance is enforced through referee room monitoring, screenshot verification, player incident reports, and post-match audit reviews.
              </p>
            </div>

            {/* 7. UID / IGN Verification */}
            <div className="space-y-2">
              <h3 className="font-headline font-bold text-white uppercase text-sm sm:text-base">
                7. UID / IGN Verification
              </h3>
              <p className="text-[#8e9dae]">
                Every participant must compete exclusively using the Free Fire account linked to their registered character UID and in-game name (IGN). During tournament check-in and custom room operations, registered UIDs are verified against participating players. If an in-game character UID does not match the registered record (<code className="text-[#00f2ff]">UID_MISMATCH</code>), the player or squad will be flagged for referee review and may be removed from the custom room or disqualified if verification cannot be confirmed before match launch.
              </p>
            </div>

            {/* 8. Check-In & Match Participation */}
            <div className="space-y-2">
              <h3 className="font-headline font-bold text-white uppercase text-sm sm:text-base">
                8. Check-In & Match Participation
              </h3>
              <p className="text-[#8e9dae]">
                To confirm operational readiness, registered players and captains must adhere to match schedule procedures:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-[#8e9dae]">
                <li>
                  <strong className="text-white">Mandatory Check-In:</strong> Captains or players must complete match check-in via the platform during the designated check-in window prior to match start.
                </li>
                <li>
                  <strong className="text-white">Lobby Slot Assignment:</strong> Each squad must occupy their assigned lobby slot (e.g. Slot 1 through 12) inside the Free Fire custom room. Occupying an unassigned slot or disrupting another squad's assigned position is prohibited.
                </li>
                <li>
                  <strong className="text-white">Failure to Check In:</strong> Squads failing to check in before the window expires are marked absent and forfeit their slot.
                </li>
                <li>
                  <strong className="text-white">Roster Locking:</strong> When check-in closes and room credentials are issued, team rosters are locked. Unregistered substitutes are not permitted without prior referee approval.
                </li>
              </ul>
            </div>

            {/* 9. Room Credentials */}
            <div className="space-y-2">
              <h3 className="font-headline font-bold text-white uppercase text-sm sm:text-base">
                9. Room Credentials
              </h3>
              <p className="text-[#8e9dae]">
                Custom room credentials (Room ID and Room Password) are protected by database-level authorization controls:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-[#8e9dae]">
                <li>Credentials are released strictly to verified, checked-in participants at the configured credential release time prior to match commencement.</li>
                <li>Room credentials are confidential. Sharing, streaming, broadcasting, or publishing room credentials to unapproved third parties is strictly prohibited and results in immediate disqualification.</li>
                <li>Attempting to obtain, intercept, or join custom rooms for tournaments in which you are not an authorized, checked-in participant is a severe security violation.</li>
              </ul>
            </div>

            {/* 10. Match Results & Score Verification */}
            <div className="space-y-2">
              <h3 className="font-headline font-bold text-white uppercase text-sm sm:text-base">
                10. Match Results & Score Verification
              </h3>
              <p className="text-[#8e9dae]">
                Following match conclusion, match standings are established through authoritative referee verification:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-[#8e9dae]">
                <li>Captains or designated players submit match scorecards with reported placement, kill totals, and full-screen result screenshot proof.</li>
                <li>Referees review all submissions and authoritatively finalize match standings using the platform's scoring calculation engine.</li>
                <li>Submitting fabricated scores, altered screenshots, or fraudulent evidence results in immediate match disqualification and forfeiture of prizes.</li>
                <li>Score verification is conducted methodically following match completion; the platform does not guarantee arbitrary or instant verification timeframes.</li>
              </ul>
            </div>

            {/* 11. OCR / Evidence */}
            <div className="space-y-2">
              <h3 className="font-headline font-bold text-white uppercase text-sm sm:text-base">
                11. OCR / Evidence
              </h3>
              <p className="text-[#8e9dae]">
                MJ ESPORTS incorporates in-memory Optical Character Recognition (OCR) technology to assist referees by extracting placement and kill data from submitted match result screenshots. OCR serves purely as an operational validation aid and does not override human referee review or administrative judgment. Players remain strictly responsible for providing clear, unedited, full-screen screenshot proof. Illegible, cropped, or blurred screenshots may be rejected.
              </p>
            </div>

            {/* 12. Incidents & Remakes */}
            <div className="space-y-2">
              <h3 className="font-headline font-bold text-white uppercase text-sm sm:text-base">
                12. Incidents & Remakes
              </h3>
              <p className="text-[#8e9dae]">
                If a match encounters significant operational disruption, captains may file an official incident report through the platform:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-[#8e9dae]">
                <li>Eligible incident reports include room configuration discrepancies, widespread participant disconnection, or verified room technical failures.</li>
                <li>Incidents are reviewed by platform administrators based on match evidence, telemetry, and room status.</li>
                <li>If a remake is approved, custom room credentials are reset to <code className="text-[#00f2ff]">Draft</code> status, the affected match is declared void, and room credentials and check-in are re-issued for a clean remake.</li>
                <li>Administrative determinations regarding incident reports and remakes are final and binding.</li>
              </ul>
            </div>

            {/* 13. Prize Calculation & Distribution */}
            <div className="space-y-2">
              <h3 className="font-headline font-bold text-white uppercase text-sm sm:text-base">
                13. Prize Calculation & Distribution
              </h3>
              <p className="text-[#8e9dae]">
                Tournament prize pools are calculated strictly according to the published tournament prize model (such as placement-based rewards, per-kill bounties, or hybrid scoring), capped by the tournament's authorized prize pool limit:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-[#8e9dae]">
                <li>Prize distributions are processed after official results have been verified and finalized by platform referees.</li>
                <li>Approved prize winnings are credited directly to verified winning players' or captains' in-app platform wallets.</li>
                <li>The platform does not guarantee fixed payout processing timeframes (such as within 24 hours); distributions proceed systematically upon complete referee score finalization.</li>
              </ul>
            </div>

            {/* 14. Wallet & Withdrawals */}
            <div className="space-y-2">
              <h3 className="font-headline font-bold text-white uppercase text-sm sm:text-base">
                14. Wallet & Withdrawals
              </h3>
              <p className="text-[#8e9dae]">
                The in-app wallet maintains a verified record of your platform funds resulting from tournament winnings, approved cancellation refunds, or direct top-ups:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-[#8e9dae]">
                <li>
                  <strong className="text-white">Immutable Ledger:</strong> All balance modifications are recorded permanently in the platform ledger (<code className="text-[#00f2ff]">wallet_ledger</code>).
                </li>
                <li>
                  <strong className="text-white">Withdrawal Eligibility:</strong> Registered users with an active, verified wallet balance may request a withdrawal.
                </li>
                <li>
                  <strong className="text-white">Minimum Withdrawal:</strong> The minimum withdrawal threshold is ₹100, and withdrawal requests must be in whole rupee amounts.
                </li>
                <li>
                  <strong className="text-white">Payout Methods:</strong> Withdrawals are disbursed via external banking channels (UPI ID or Direct Bank Transfer with Account Number and IFSC Code) following administrative review. A transaction UTR reference is recorded upon disbursement.
                </li>
                <li>
                  <strong className="text-white">Prohibited Conduct:</strong> Users must provide accurate payout details. Submitting false beneficiary information, attempting fraudulent withdrawals, or manipulating ledger records is strictly prohibited.
                </li>
              </ul>
            </div>

            {/* 15. Disqualification & Account Suspension */}
            <div className="space-y-2">
              <h3 className="font-headline font-bold text-white uppercase text-sm sm:text-base">
                15. Disqualification & Account Suspension
              </h3>
              <p className="text-[#8e9dae]">
                MJ ESPORTS reserves the right to restrict tournament entry, invalidate match scorecards, forfeit entry fees and prize entitlements, and suspend or terminate user accounts for:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-[#8e9dae]">
                <li>Cheating, hacking, or utilizing unauthorized game modifications or scripts.</li>
                <li>Submitting fraudulent Free Fire UIDs, falsified scorecards, or manipulated match proof.</li>
                <li>Match-fixing, collusion, intentional feeding, or deliberate match sabotage.</li>
                <li>Abusive, toxic, threatening, or vulgar behavior directed toward players or staff.</li>
                <li>Payment fraud, unauthorized chargebacks, or wallet exploitation.</li>
                <li>Repeated breaches of the Tournament Rulebook or these Terms.</li>
              </ul>
            </div>

            {/* 16. Multiple Accounts & Abuse */}
            <div className="space-y-2">
              <h3 className="font-headline font-bold text-white uppercase text-sm sm:text-base">
                16. Multiple Accounts & Abuse
              </h3>
              <p className="text-[#8e9dae]">
                Users may not create or operate multiple accounts to circumvent disciplinary restrictions, manipulate tournament registrations, farm promotional balances, or gain an unfair competitive advantage. Automated bot scripts, scraping tools, and scripted request submissions are strictly prohibited. While the platform employs database constraints and operational checks, MJ ESPORTS does not represent that all fraudulent or duplicate accounts are automatically detected in real time without referee intervention.
              </p>
            </div>

            {/* 17. Technical Issues */}
            <div className="space-y-2">
              <h3 className="font-headline font-bold text-white uppercase text-sm sm:text-base">
                17. Technical Issues
              </h3>
              <p className="text-[#8e9dae]">
                Online esports competitions depend on external infrastructure including Garena Free Fire game servers, mobile cellular networks, local internet service providers, and third-party payment gateways. System-wide match disruptions are addressed through the platform's official incident and remake protocols. MJ ESPORTS is not liable for, and does not provide financial compensation for, individual player connection drops, cellular packet loss, device crashes, or publisher-side emergency server outages beyond our direct operational control.
              </p>
            </div>

            {/* 18. Tournament Rule Changes & Cancellation */}
            <div className="space-y-2">
              <h3 className="font-headline font-bold text-white uppercase text-sm sm:text-base">
                18. Tournament Rule Changes & Cancellation
              </h3>
              <p className="text-[#8e9dae]">
                Specific tournaments may implement unique competition parameters (such as designated maps, weapon restrictions, or per-kill point multipliers) published in the tournament details. In the event of an operational conflict, tournament-specific parameters take precedence over general defaults. Organizers reserve the right to reschedule or cancel tournaments due to operational necessity, technical constraints, or insufficient entries. Cancelled events are handled in strict adherence to our cancellation and wallet refund policy.
              </p>
            </div>

            {/* 19. Platform Availability */}
            <div className="space-y-2">
              <h3 className="font-headline font-bold text-white uppercase text-sm sm:text-base">
                19. Platform Availability
              </h3>
              <p className="text-[#8e9dae]">
                MJ ESPORTS services are provided on an "as is" and "as available" basis. We do not warrant that platform operations will be uninterrupted, error-free, or continuously accessible. Platform access may be temporarily suspended without prior notice for scheduled system maintenance, critical security patches, or emergency infrastructure remediation.
              </p>
            </div>

            {/* 20. User Responsibilities */}
            <div className="space-y-2">
              <h3 className="font-headline font-bold text-white uppercase text-sm sm:text-base">
                20. User Responsibilities
              </h3>
              <p className="text-[#8e9dae]">
                As a user of MJ ESPORTS, you agree to:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-[#8e9dae]">
                <li>Safeguard your account login credentials and notify us immediately of any unauthorized access.</li>
                <li>Provide accurate, genuine personal, Free Fire character, and withdrawal payout details.</li>
                <li>Comply with all tournament rules, schedule deadlines, and fair play requirements.</li>
                <li>Join assigned custom room lobby slots punctually and behave respectfully toward fellow competitors.</li>
                <li>Promptly report technical glitches, payment issues, or suspected rule violations via official support channels.</li>
              </ul>
            </div>

            {/* 21. Support & Disputes */}
            <div className="space-y-2">
              <h3 className="font-headline font-bold text-white uppercase text-sm sm:text-base">
                21. Support & Disputes
              </h3>
              <p className="text-[#8e9dae]">
                For assistance regarding account management, payment confirmation, tournament disputes, result verification, or privacy questions, players may contact our official support team at:
              </p>
              <div className="p-3.5 bg-[#1c1b1c] rounded border border-[#27272a] inline-block space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#8e9dae] block">Official Support & Disputes Contact:</span>
                <a
                  href="mailto:support.mjesports@gmail.com?subject=MJ%20ESPORTS%20Support%20or%20Dispute"
                  className="text-[#00f2ff] font-mono font-bold hover:underline break-all"
                >
                  support.mjesports@gmail.com
                </a>
              </div>
              <p className="text-[11px] text-[#8e9dae]">
                Match score disputes must be submitted promptly with complete screenshot or video evidence for referee review.
              </p>
            </div>

            {/* 22. Changes to Terms */}
            <div className="space-y-2">
              <h3 className="font-headline font-bold text-white uppercase text-sm sm:text-base">
                22. Changes to Terms
              </h3>
              <p className="text-[#8e9dae]">
                MJ ESPORTS reserves the right to revise or update these Terms of Service periodically to reflect changes in tournament operations, platform features, or applicable requirements. The revised Terms will be posted on this page with an updated "Last Updated" date. Continued use of the platform following the publication of revised Terms indicates your acceptance of the updated provisions.
              </p>
            </div>

            {/* 23. Last Updated */}
            <div className="space-y-2 border-t border-[#27272a] pt-4">
              <h3 className="font-headline font-bold text-white uppercase text-sm sm:text-base">
                23. Last Updated
              </h3>
              <p className="text-[#8e9dae]">
                These Terms of Service were last audited and updated on <strong className="text-white">September 18, 2026</strong>.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'contact' && (
          <div className="bg-[#141416] border border-[#27272a] rounded p-5 sm:p-8 space-y-6 text-xs sm:text-sm text-[#e1e2e7] text-left shadow-xl break-words">
            <h2 className="font-headline text-lg sm:text-xl font-bold text-white uppercase border-b border-[#27272a] pb-3 text-[#00f2ff]">
              OFFICIAL SUPPORT & CONTACT
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-[#1c1b1c] rounded border border-[#27272a] space-y-1">
                <span className="text-[#8e9dae] font-bold uppercase text-[10px] block">Support Email</span>
                <a href="mailto:support.mjesports@gmail.com?subject=MJ%20ESPORTS%20Support%20Request" className="text-[#00f2ff] font-mono font-bold hover:underline break-all">
                  support.mjesports@gmail.com
                </a>
              </div>

              <div className="p-4 bg-[#1c1b1c] rounded border border-[#27272a] space-y-1">
                <span className="text-[#8e9dae] font-bold uppercase text-[10px] block">Community & Disputes</span>
                <a href="mailto:support.mjesports@gmail.com?subject=MJ%20ESPORTS%20Match%20Dispute" className="text-[#00f2ff] font-mono font-bold hover:underline break-all">
                  support.mjesports@gmail.com
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
