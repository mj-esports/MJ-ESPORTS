import { useState, useMemo } from 'react'
import {
  Award,
  Plus,
  Building2,
  Sparkles,
  Shield,
  DollarSign,
  Calendar,
  ExternalLink,
  X,
  CheckCircle2,
  Trash2,
  Search
} from 'lucide-react'
import { useToast } from '../../contexts/ToastContext'

export default function SponsorshipsView({ tournaments = [] }) {
  const { showSuccess } = useToast()
  const [sponsors, setSponsors] = useState([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [tierFilter, setTierFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  const [formData, setFormData] = useState({
    brand: '',
    tier: 'Title Sponsor',
    dealValue: '1000000',
    duration: 'Season 2026',
    contractStatus: 'Active Contract',
    paymentStatus: 'Full Paid',
    linkedTournamentId: '',
    logoUrl: '',
    deliverables: 'Hero Banner, Room Name Rights, Broadcast Stingers',
  })
  const [formError, setFormError] = useState('')

  // Executive Metrics
  const activeSponsorsCount = useMemo(() => {
    return sponsors.filter((s) => s.contractStatus === 'Active Contract').length
  }, [sponsors])

  const totalSponsorshipValueSum = useMemo(() => {
    if (sponsors.length === 0) return '₹0'
    let total = 0
    sponsors.forEach((s) => {
      const num = parseInt(String(s.dealValue || '0').replace(/[^0-9]/g, ''), 10)
      if (!isNaN(num)) total += num
    })
    return total > 0 ? `₹${total.toLocaleString()}` : '₹0'
  }, [sponsors])

  const totalImpressionsSum = useMemo(() => {
    if (sponsors.length === 0) return '0'
    const total = sponsors.length * 150000
    return total.toLocaleString()
  }, [sponsors])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setFormError('')
  }

  const handleAddSponsor = (e) => {
    e.preventDefault()
    if (!formData.brand.trim()) {
      setFormError('Please enter a brand partner name.')
      return
    }

    const valNum = parseInt(formData.dealValue.replace(/[^0-9]/g, ''), 10) || 0

    const newSponsor = {
      id: `sp-${Date.now()}`,
      brand: formData.brand.trim(),
      tier: formData.tier,
      dealValue: valNum > 0 ? `₹${valNum.toLocaleString()}` : '₹0',
      duration: formData.duration.trim() || 'Season 2026',
      contractStatus: formData.contractStatus,
      paymentStatus: formData.paymentStatus,
      linkedTournamentId: formData.linkedTournamentId,
      logoUrl: formData.logoUrl.trim() || '',
      deliverables: formData.deliverables
        ? formData.deliverables.split(',').map((d) => d.trim()).filter(Boolean)
        : ['Brand Logo Placement', 'Social Media Shoutouts'],
      impressions: '150,000+',
    }

    setSponsors((prev) => [newSponsor, ...prev])
    setShowAddModal(false)
    showSuccess(`Brand partner "${newSponsor.brand}" added successfully!`, 'Sponsorship Added')
    setFormData({
      brand: '',
      tier: 'Title Sponsor',
      dealValue: '1000000',
      duration: 'Season 2026',
      contractStatus: 'Active Contract',
      paymentStatus: 'Full Paid',
      linkedTournamentId: '',
      logoUrl: '',
      deliverables: 'Hero Banner, Room Name Rights, Broadcast Stingers',
    })
  }

  const handleDeleteSponsor = (id) => {
    setSponsors((prev) => prev.filter((s) => s.id !== id))
    showSuccess('Brand partner removed.', 'Sponsor Removed')
  }

  // Filtered Sponsors
  const filteredSponsors = useMemo(() => {
    return sponsors.filter((s) => {
      if (tierFilter !== 'ALL' && s.tier !== tierFilter) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchBrand = s.brand.toLowerCase().includes(q)
        const matchTier = s.tier.toLowerCase().includes(q)
        if (!matchBrand && !matchTier) return false
      }
      return true
    })
  }, [sponsors, tierFilter, searchQuery])

  return (
    <div className="space-y-6">
      
      {/* 1. MODULE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#27272A]/60 pb-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-none bg-[#FF8C00]/10 border border-[#FF8C00]/30 text-[#FF8C00] text-xs font-mono font-bold uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>SPONSORSHIP & BRAND OPERATIONS</span>
          </div>
          <h2 className="font-display-lg text-xl sm:text-2xl font-extrabold text-white uppercase tracking-tight flex items-center gap-2">
            <Award className="w-6 h-6 text-[#FF8C00]" />
            <span>BRAND PARTNERSHIPS & CONTRACTS</span>
          </h2>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 bg-[#FF8C00] hover:bg-[#FF8C00] text-slate-950 font-extrabold text-xs uppercase tracking-wider rounded-none  transition-all flex items-center gap-1.5 shrink-0 min-h-[40px]"
        >
          <Plus className="w-4 h-4" />
          <span>Add Brand Partner</span>
        </button>
      </div>

      {/* 2. EXECUTIVE SPONSORSHIP METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs font-mono">
        <div className="bg-[#111215] border border-[#27272A]/60 rounded-none p-4 space-y-1 shadow-lg">
          <span className="text-[#A1A1AA] uppercase font-bold block text-[10px]">Active Sponsors</span>
          <span className="font-display-lg text-2xl font-extrabold text-[#FFB900]">{activeSponsorsCount}</span>
        </div>
        <div className="bg-[#111215] border border-[#27272A]/60 rounded-none p-4 space-y-1 shadow-lg">
          <span className="text-[#A1A1AA] uppercase font-bold block text-[10px]">Total Sponsorship Value</span>
          <span className="font-display-lg text-2xl font-extrabold text-[#10B981]">{totalSponsorshipValueSum}</span>
        </div>
        <div className="bg-[#111215] border border-[#27272A]/60 rounded-none p-4 space-y-1 shadow-lg">
          <span className="text-[#A1A1AA] uppercase font-bold block text-[10px]">Brand Reach Impressions</span>
          <span className="font-display-lg text-2xl font-extrabold text-[#FF8C00]">{totalImpressionsSum}</span>
        </div>
        <div className="bg-[#111215] border border-[#27272A]/60 rounded-none p-4 space-y-1 shadow-lg">
          <span className="text-[#A1A1AA] uppercase font-bold block text-[10px]">Contract Lifecycle</span>
          <span className="font-display-lg text-sm sm:text-base font-extrabold text-white">Season 2026</span>
        </div>
      </div>

      {/* 3. FILTER BAR */}
      {sponsors.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#111215] p-3 rounded-none border border-[#27272A]/60">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-[#A1A1AA] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sponsor brand..."
              className="w-full pl-9 pr-3 py-1.5 bg-[#000000] border border-[#27272A] rounded-none text-xs text-white placeholder-[#A1A1AA] focus:outline-none focus:border-[#FF8C00]"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto text-xs font-mono w-full sm:w-auto">
            {['ALL', 'Title Sponsor', 'Energy Partner', 'Peripherals Sponsor', 'Media Partner'].map((t) => (
              <button
                key={`tier-${t}`}
                onClick={() => setTierFilter(t)}
                className={`px-3 py-1.5 rounded-none uppercase font-bold shrink-0 transition-colors ${
                  tierFilter === t
                    ? 'bg-[#FF8C00] text-slate-950 font-extrabold'
                    : 'bg-[#000000] text-[#A1A1AA] border border-[#27272A] hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 4. MAIN CONTENT AREA / EXACT REQUIRED EMPTY STATE */}
      {sponsors.length === 0 ? (
        <div className="bg-[#111215] border border-[#27272A]/60 rounded-none p-12 text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 rounded-none bg-[#FF8C00]/10 border border-[#FF8C00]/30 flex items-center justify-center mx-auto text-[#FF8C00]">
            <Building2 className="w-8 h-8" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="font-display-lg text-lg font-bold text-white uppercase tracking-wider">
              No sponsors added yet.
            </h3>
            <p className="text-xs text-[#A1A1AA]">
              No sponsors added yet. Manage official brand partnerships here.
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-5 py-2.5 bg-[#FF8C00] hover:bg-[#FF8C00] text-slate-950 font-extrabold text-xs uppercase tracking-wider rounded-none  transition-all inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Brand Partner</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filteredSponsors.map((item) => {
            const linkedTourn = tournaments.find((t) => t.id === item.linkedTournamentId)
            return (
              <div
                key={item.id}
                className="bg-[#111215] border border-[#27272A]/60 hover:border-[#FF8C00]/60 rounded-none p-5 space-y-4 shadow-xl transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-[#27272A]/40 pb-3">
                    <span className="px-2.5 py-0.5 rounded-none text-[10px] font-mono font-extrabold bg-[#FF8C00]/10 text-[#FF8C00] border border-[#FF8C00]/30 uppercase">
                      {item.tier}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-none text-[9px] font-mono font-extrabold uppercase border bg-[#10B981]/10 text-[#10B981] border-[#10B981]/40">
                        {item.contractStatus}
                      </span>
                      <button
                        onClick={() => handleDeleteSponsor(item.id)}
                        className="text-[#A1A1AA] hover:text-[#EF4444] transition-colors p-1"
                        title="Delete Sponsor"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-none bg-[#000000] border border-[#27272A] flex items-center justify-center text-[#FF8C00] shrink-0 overflow-hidden">
                      {item.logoUrl ? (
                        <img src={item.logoUrl} alt={item.brand} className="w-full h-full object-cover" />
                      ) : (
                        <Building2 className="w-6 h-6" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-display-lg text-base font-extrabold text-white">{item.brand}</h3>
                      <span className="font-mono text-sm font-extrabold text-[#FFB900] block">{item.dealValue}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono pt-1">
                    <div className="p-2 bg-[#000000] rounded-none border border-[#27272A]/60">
                      <span className="text-[#A1A1AA] block">PAYMENT STATUS</span>
                      <span className="font-bold text-[#10B981]">{item.paymentStatus}</span>
                    </div>
                    <div className="p-2 bg-[#000000] rounded-none border border-[#27272A]/60">
                      <span className="text-[#A1A1AA] block">LINKED TOURNAMENT</span>
                      <span className="font-bold text-white truncate block">
                        {linkedTourn?.title || 'All Competitions'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-[#A1A1AA] pt-1">
                    <span className="font-label-caps text-[10px] text-[#e1e2e7] font-bold block uppercase">Key Deliverables</span>
                    <ul className="space-y-1 list-disc pl-4 text-[11px]">
                      {item.deliverables.map((d, idx) => (
                        <li key={`deliv-${idx}`}>{d}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#27272A]/40 flex justify-between items-center text-[10px] font-mono text-[#A1A1AA]">
                  <span>Reach: {item.impressions} Views</span>
                  <span className="text-[#FF8C00] font-bold">{item.duration}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 5. ADD SPONSOR MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#111215] border border-[#27272A] rounded-none p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#27272A]/60 pb-3">
              <h3 className="font-display-lg text-base font-extrabold text-white uppercase flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#FF8C00]" />
                <span>Add Brand Partner & Contract</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-[#A1A1AA] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-950/60 border border-red-800 rounded-none text-red-400 text-xs font-bold">
                {formError}
              </div>
            )}

            <form onSubmit={handleAddSponsor} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-[#A1A1AA] font-bold uppercase text-[10px] block">Brand Name *</label>
                <input
                  type="text"
                  name="brand"
                  value={formData.brand}
                  onChange={handleInputChange}
                  placeholder="e.g. ROG Republic of Gamers"
                  className="w-full px-3 py-2 bg-[#000000] border border-[#27272A] rounded-none text-white focus:outline-none focus:border-[#FF8C00]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[#A1A1AA] font-bold uppercase text-[10px] block">Sponsorship Tier</label>
                  <select
                    name="tier"
                    value={formData.tier}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-[#000000] border border-[#27272A] rounded-none text-white focus:outline-none focus:border-[#FF8C00]"
                  >
                    <option value="Title Sponsor">Title Sponsor</option>
                    <option value="Energy Partner">Energy Partner</option>
                    <option value="Peripherals Sponsor">Peripherals Sponsor</option>
                    <option value="Media Partner">Media Partner</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[#A1A1AA] font-bold uppercase text-[10px] block">Deal Value (INR ₹)</label>
                  <input
                    type="text"
                    name="dealValue"
                    value={formData.dealValue}
                    onChange={handleInputChange}
                    placeholder="e.g. 1000000"
                    className="w-full px-3 py-2 bg-[#000000] border border-[#27272A] rounded-none text-white focus:outline-none focus:border-[#FF8C00]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[#A1A1AA] font-bold uppercase text-[10px] block">Contract Lifecycle</label>
                  <select
                    name="contractStatus"
                    value={formData.contractStatus}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-[#000000] border border-[#27272A] rounded-none text-white focus:outline-none focus:border-[#FF8C00]"
                  >
                    <option value="Active Contract">Active Contract</option>
                    <option value="In Renewal">In Renewal</option>
                    <option value="Pending Signoff">Pending Signoff</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[#A1A1AA] font-bold uppercase text-[10px] block">Payment Milestone</label>
                  <select
                    name="paymentStatus"
                    value={formData.paymentStatus}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-[#000000] border border-[#27272A] rounded-none text-white focus:outline-none focus:border-[#FF8C00]"
                  >
                    <option value="Full Paid">Full Paid</option>
                    <option value="Milestone 1 Paid">Milestone 1 Paid</option>
                    <option value="Invoice Issued">Invoice Issued</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[#A1A1AA] font-bold uppercase text-[10px] block">Logo Image URL</label>
                <input
                  type="text"
                  name="logoUrl"
                  value={formData.logoUrl}
                  onChange={handleInputChange}
                  placeholder="https://..."
                  className="w-full px-3 py-2 bg-[#000000] border border-[#27272A] rounded-none text-white focus:outline-none focus:border-[#FF8C00]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[#A1A1AA] font-bold uppercase text-[10px] block">Deliverables (comma separated)</label>
                <input
                  type="text"
                  name="deliverables"
                  value={formData.deliverables}
                  onChange={handleInputChange}
                  placeholder="e.g. Hero Banner, Room Name Rights, Broadcast Stingers"
                  className="w-full px-3 py-2 bg-[#000000] border border-[#27272A] rounded-none text-white focus:outline-none focus:border-[#FF8C00]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-[#000000] border border-[#27272A] text-[#A1A1AA] hover:text-white rounded-none font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#FF8C00] hover:bg-[#FF8C00] text-slate-950 font-extrabold rounded-none"
                >
                  Save Partner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
