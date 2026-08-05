import React, { useState, useEffect } from 'react'
import {
  ShieldAlert,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  GripVertical,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Search,
  Filter,
  Shield,
  Zap,
  Info
} from 'lucide-react'

// Default starter rules presets
const DEFAULT_PRESET_RULES = [
  { id: 'rule-1', text: 'No emulators allowed. PC emulators result in immediate match disqualification.', category: 'Device & Emulators', severity: 'Critical' },
  { id: 'rule-[#rule-2]', text: 'Screen recording is mandatory for all team captains during official rounds.', category: 'Fair Play', severity: 'Critical' },
  { id: 'rule-3', text: 'Team captains must submit final score screenshots to referees within 15 minutes post-match.', category: 'Screenshots & Scores', severity: 'Standard' },
  { id: 'rule-4', text: 'Toxic behavior, abusive chat, or stream sniping leads to permanent tournament ban.', category: 'Disqualification', severity: 'Critical' },
  { id: 'rule-5', text: 'Players must join custom room lobby at least 10 minutes prior to scheduled kickoff.', category: 'General', severity: 'Standard' },
]

// Category badge color lookup
const CATEGORY_COLORS = {
  'Fair Play': 'border-[#00f2ff]/40 bg-[#00f2ff]/10 text-[#00f2ff]',
  'Device & Emulators': 'border-[#fe6b00]/40 bg-[#fe6b00]/10 text-[#fe6b00]',
  'Screenshots & Scores': 'border-[#00ff9d]/40 bg-[#00ff9d]/10 text-[#00ff9d]',
  'Disqualification': 'border-[#ff4655]/40 bg-[#ff4655]/10 text-[#ff4655]',
  'General': 'border-[#a855f7]/40 bg-[#a855f7]/10 text-[#a855f7]',
}

export default function DynamicRulesManager({
  initialRules = [],
  onChange,
  readOnly = false
}) {
  // Convert string or array initialRules to objects array
  const parseInitialRules = (rulesInput) => {
    if (Array.isArray(rulesInput) && rulesInput.length > 0) {
      return rulesInput.map((r, idx) => {
        if (typeof r === 'object' && r.text) return r
        return {
          id: `rule-init-${idx}-${Date.now()}`,
          text: typeof r === 'string' ? r.replace(/^\d+\.\s*/, '') : String(r),
          category: idx === 0 ? 'Device & Emulators' : idx === 1 ? 'Fair Play' : 'General',
          severity: 'Standard'
        }
      })
    }
    if (typeof rulesInput === 'string' && rulesInput.trim()) {
      return rulesInput.split('\n').filter(Boolean).map((line, idx) => ({
        id: `rule-init-str-${idx}`,
        text: line.replace(/^\d+\.\s*/, '').trim(),
        category: 'General',
        severity: 'Standard'
      }))
    }
    return DEFAULT_PRESET_RULES
  }

  // Local State
  const [rules, setRules] = useState(() => parseInitialRules(initialRules))
  const [newRuleText, setNewRuleText] = useState('')
  const [newRuleCategory, setNewRuleCategory] = useState('Fair Play')
  const [newRuleSeverity, setNewRuleSeverity] = useState('Standard')
  
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL')
  const [draggedIndex, setDraggedIndex] = useState(null)

  // Notify parent component whenever local rules state mutates
  useEffect(() => {
    if (onChange) {
      const formattedLines = rules.map((r, idx) => `${idx + 1}. ${r.text}`)
      onChange(rules, formattedLines.join('\n'))
    }
  }, [rules])

  // Add Rule
  const handleAddRule = (e) => {
    if (e) e.preventDefault()
    if (!newRuleText.trim()) return

    const newRuleObj = {
      id: `rule-${Date.now()}`,
      text: newRuleText.trim(),
      category: newRuleCategory,
      severity: newRuleSeverity
    }

    setRules((prev) => [...prev, newRuleObj])
    setNewRuleText('')
  }

  // Delete Rule
  const handleDeleteRule = (id) => {
    setRules((prev) => prev.filter((r) => r.id !== id))
  }

  // Move Rule Up / Down
  const handleMoveRule = (index, direction) => {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= rules.length) return
    const copy = [...rules]
    const [moved] = copy.splice(index, 1)
    copy.splice(targetIndex, 0, moved)
    setRules(copy)
  }

  // Drag and Drop handlers
  const handleDragStart = (e, index) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return
    const copy = [...rules]
    const [draggedItem] = copy.splice(draggedIndex, 1)
    copy.splice(index, 0, draggedItem)
    setDraggedIndex(index)
    setRules(copy)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  // Preset Add Handler
  const handleAddPreset = (presetText, category, severity) => {
    if (rules.some((r) => r.text.toLowerCase() === presetText.toLowerCase())) return
    const newRuleObj = {
      id: `rule-preset-${Date.now()}-${Math.random()}`,
      text: presetText,
      category: category || 'Fair Play',
      severity: severity || 'Standard'
    }
    setRules((prev) => [...prev, newRuleObj])
  }

  // Filtered rules for search and category select
  const filteredRules = rules.filter((r) => {
    const matchesSearch = r.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          r.category.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCat = selectedCategoryFilter === 'ALL' || r.category === selectedCategoryFilter
    return matchesSearch && matchesCat
  })

  return (
    <div className="space-y-6 text-white font-mono text-xs">
      
      {/* SECTION 1: EDITOR HEADER & ADD RULE INPUT FORM (If not read-only) */}
      {!readOnly && (
        <div className="bg-[#0b0e14] p-5 rounded-2xl border border-[#00f2ff]/30 shadow-[0_0_20px_rgba(0,242,255,0.05)] space-y-4">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#3a494b]/50 pb-3">
            <div className="flex items-center gap-2 text-[#00f2ff]">
              <BookOpen className="w-5 h-5" />
              <h3 className="font-headline text-sm font-black uppercase tracking-wider text-white">
                Dynamic Tournament Rulebook Manager
              </h3>
            </div>
            <span className="text-[10px] text-[#8e9dae] font-semibold uppercase">
              {rules.length} Active Rules
            </span>
          </div>

          {/* Add New Rule Form */}
          <form onSubmit={handleAddRule} className="space-y-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[#8e9dae] uppercase tracking-wide block">
                Rule Description / Requirement Statement
              </label>
              <textarea
                rows={2}
                value={newRuleText}
                onChange={(e) => setNewRuleText(e.target.value)}
                placeholder="e.g., Emulators are strictly banned. Players must submit match screenshots within 15 minutes."
                className="w-full bg-[#151a21] border border-[#3a494b] rounded-xl p-3 text-white text-xs placeholder-[#8e9dae] focus:outline-none focus:border-[#00f2ff] focus:ring-1 focus:ring-[#00f2ff] transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] text-[#8e9dae] font-bold uppercase block mb-1">Category</label>
                <select
                  value={newRuleCategory}
                  onChange={(e) => setNewRuleCategory(e.target.value)}
                  className="w-full bg-[#151a21] border border-[#3a494b] rounded-lg px-3 py-2 text-xs text-white focus:border-[#00f2ff] focus:outline-none"
                >
                  <option value="Fair Play">Fair Play & Conduct</option>
                  <option value="Device & Emulators">Device & Emulators</option>
                  <option value="Screenshots & Scores">Screenshots & Scores</option>
                  <option value="Disqualification">Disqualification & Penalties</option>
                  <option value="General">General Operational</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-[#8e9dae] font-bold uppercase block mb-1">Severity Priority</label>
                <select
                  value={newRuleSeverity}
                  onChange={(e) => setNewRuleSeverity(e.target.value)}
                  className="w-full bg-[#151a21] border border-[#3a494b] rounded-lg px-3 py-2 text-xs text-white focus:border-[#00f2ff] focus:outline-none"
                >
                  <option value="Critical">Critical (Immediate DQ)</option>
                  <option value="Standard">Standard Regulation</option>
                  <option value="Information">Informational Notice</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={!newRuleText.trim()}
                  className="w-full py-2.5 px-4 bg-[#00f2ff] hover:bg-[#00d0dd] disabled:opacity-40 text-black font-extrabold text-xs uppercase rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer h-[38px]"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Rule</span>
                </button>
              </div>
            </div>
          </form>

          {/* Quick Presets */}
          <div className="pt-2 border-t border-[#3a494b]/40 space-y-1.5">
            <span className="text-[10px] font-bold text-[#8e9dae] uppercase block">Quick Preset Additions:</span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { text: 'No emulators allowed on PC/Mac.', cat: 'Device & Emulators', sev: 'Critical' },
                { text: 'Screen recording mandatory for team captains.', cat: 'Fair Play', sev: 'Critical' },
                { text: 'Score screenshot required within 15 minutes.', cat: 'Screenshots & Scores', sev: 'Standard' },
                { text: 'Toxic behavior leads to immediate DQ.', cat: 'Disqualification', sev: 'Critical' },
                { text: 'Join custom room 10m before kickoff.', cat: 'General', sev: 'Standard' }
              ].map((p, idx) => (
                <button
                  key={`preset-rule-${idx}`}
                  type="button"
                  onClick={() => handleAddPreset(p.text, p.cat, p.sev)}
                  className="px-2.5 py-1 rounded bg-[#151a21] hover:bg-[#00f2ff]/20 border border-[#3a494b] hover:border-[#00f2ff]/40 text-[#8e9dae] hover:text-[#00f2ff] text-[10px] font-semibold transition-all cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3 h-3 text-[#00f2ff]" />
                  <span>{p.text}</span>
                </button>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* SECTION 2: RULEBOOK VIEW & DYNAMIC REORDERING LIST */}
      <div className="bg-[#07090c] border border-[#3a494b]/60 rounded-2xl p-5 md:p-6 space-y-4 shadow-2xl">
        
        {/* Header & Filter Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#3a494b]/60 pb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[#00f2ff]" />
            <h4 className="font-headline text-sm font-black text-white uppercase tracking-wider">
              {readOnly ? 'Official Tournament Rulebook' : 'Active Rules & Drag Ordering'}
            </h4>
          </div>

          {/* Search & Filter */}
          <div className="flex items-center gap-2">
            <div className="relative w-44">
              <Search className="w-3.5 h-3.5 text-[#8e9dae] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search rules..."
                className="w-full bg-[#151a21] border border-[#3a494b] rounded-lg pl-8 pr-2 py-1.5 text-xs text-white placeholder-[#8e9dae] focus:border-[#00f2ff] focus:outline-none"
              />
            </div>

            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="bg-[#151a21] border border-[#3a494b] rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-[#00f2ff] focus:outline-none"
            >
              <option value="ALL">All Categories</option>
              <option value="Fair Play">Fair Play</option>
              <option value="Device & Emulators">Device & Emulators</option>
              <option value="Screenshots & Scores">Screenshots</option>
              <option value="Disqualification">Disqualification</option>
              <option value="General">General</option>
            </select>
          </div>
        </div>

        {/* RULE CARDS LIST */}
        <div className="space-y-3 pt-1">
          {filteredRules.length > 0 ? (
            filteredRules.map((rule, idx) => {
              const realIndex = rules.findIndex((r) => r.id === rule.id)
              const categoryStyle = CATEGORY_COLORS[rule.category] || CATEGORY_COLORS['General']
              const isDragging = draggedIndex === realIndex

              return (
                <div
                  key={rule.id}
                  draggable={!readOnly}
                  onDragStart={(e) => handleDragStart(e, realIndex)}
                  onDragOver={(e) => handleDragOver(e, realIndex)}
                  onDragEnd={handleDragEnd}
                  className={`p-3.5 rounded-xl border transition-all flex items-start gap-3 relative ${
                    isDragging
                      ? 'opacity-40 border-[#00f2ff] bg-[#00f2ff]/10 scale-98'
                      : 'bg-[#151a21]/90 border-[#3a494b]/60 hover:border-[#3a494b] hover:bg-[#151a21]'
                  }`}
                >
                  {/* Drag Handle & Numbering */}
                  <div className="flex items-center gap-2 pt-0.5 shrink-0 select-none">
                    {!readOnly && (
                      <div className="text-[#8e9dae] hover:text-[#00f2ff] cursor-grab active:cursor-grabbing p-0.5" title="Drag to reorder">
                        <GripVertical className="w-4 h-4" />
                      </div>
                    )}
                    <span className="w-6 h-6 rounded-lg bg-[#07090c] border border-[#3a494b]/60 flex items-center justify-center font-mono font-bold text-xs text-[#00f2ff]">
                      {realIndex + 1}
                    </span>
                  </div>

                  {/* Rule Body */}
                  <div className="flex-1 space-y-1">
                    <p className="text-xs text-white leading-relaxed font-sans font-medium">
                      {rule.text}
                    </p>

                    <div className="flex items-center gap-2 pt-1">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${categoryStyle}`}>
                        {rule.category}
                      </span>

                      {rule.severity === 'Critical' && (
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-[#ff4655]/10 text-[#ff4655] border border-[#ff4655]/30">
                          Critical (DQ)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions: Reorder Buttons & Delete */}
                  {!readOnly && (
                    <div className="flex items-center gap-1 shrink-0 pt-0.5">
                      <button
                        type="button"
                        disabled={realIndex === 0}
                        onClick={() => handleMoveRule(realIndex, -1)}
                        className="p-1 rounded bg-[#07090c] border border-[#3a494b] text-[#8e9dae] hover:text-[#00f2ff] disabled:opacity-30 transition-all"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        disabled={realIndex === rules.length - 1}
                        onClick={() => handleMoveRule(realIndex, 1)}
                        className="p-1 rounded bg-[#07090c] border border-[#3a494b] text-[#8e9dae] hover:text-[#00f2ff] disabled:opacity-30 transition-all"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteRule(rule.id)}
                        className="p-1 rounded bg-[#07090c] border border-[#3a494b] text-[#8e9dae] hover:text-[#ff4655] hover:border-[#ff4655]/40 transition-all ml-1"
                        title="Delete Rule"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )
            })
          ) : (
            <div className="p-8 text-center bg-[#151a21] border border-[#3a494b]/60 rounded-xl text-[#8e9dae] text-xs">
              No rules matched your current search filter.
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div className="pt-3 border-t border-[#3a494b]/60 flex items-center justify-between text-[10px] text-[#8e9dae]">
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-[#00f2ff]" />
            <span>Enforced strictly by MJ ESPORTS Referees during official matches</span>
          </div>
          <span className="text-white font-bold">
            Total Rules: {rules.length}
          </span>
        </div>

      </div>

    </div>
  )
}
