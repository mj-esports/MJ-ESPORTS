import { CheckCircle2, Circle, ChevronRight } from 'lucide-react'
import { normalizeLifecycleStatus } from '../../../constants/tournamentLifecycle'

export const OPERATIONAL_LIFECYCLE_STAGES = [
  { id: 'CREATE', label: 'CREATE', stages: ['Draft'] },
  { id: 'REGISTRATION', label: 'REGISTRATION', stages: ['Published', 'Registration Open', 'Registration Closed'] },
  { id: 'CHECK_IN', label: 'CHECK-IN', stages: ['Check-in Open', 'Check-in Closed'] },
  { id: 'ROOM', label: 'ROOM', stages: ['Room Released'] },
  { id: 'LIVE', label: 'LIVE', stages: ['Live'] },
  { id: 'RESULTS', label: 'RESULTS', stages: ['Results Pending'] },
  { id: 'COMPLETE', label: 'COMPLETE', stages: ['Completed', 'Prize Distributed', 'Archived'] },
]

export default function TournamentLifecycleTracker({ currentStatus = 'Draft', onAdvanceStage, isAdvancing = false }) {
  const canonical = normalizeLifecycleStatus(currentStatus)

  // Find active stage index in operational steps
  const activeStepIndex = OPERATIONAL_LIFECYCLE_STAGES.findIndex((step) =>
    step.stages.includes(canonical)
  )

  const currentStepObj = OPERATIONAL_LIFECYCLE_STAGES[activeStepIndex !== -1 ? activeStepIndex : 0]

  return (
    <div className="bg-[#0e1217] border border-[#3a494b]/60 rounded-xl p-4 space-y-3 shadow-xl">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono font-bold text-[#8e9dae] uppercase tracking-wider">
          TOURNAMENT LIFECYCLE PROGRESSION
        </span>
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/30 uppercase">
          STAGE: {canonical}
        </span>
      </div>

      {/* Visual Stepper Tracker */}
      <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1 pt-1 text-xs font-mono">
        {OPERATIONAL_LIFECYCLE_STAGES.map((step, idx) => {
          const isCompleted = activeStepIndex > idx
          const isCurrent = activeStepIndex === idx

          return (
            <div key={step.id} className="flex items-center gap-1 shrink-0">
              <div
                className={`px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all ${
                  isCurrent
                    ? 'bg-[#00f2ff] text-black border-[#00f2ff] font-extrabold shadow-[0_0_12px_rgba(0,242,255,0.4)]'
                    : isCompleted
                    ? 'bg-[#00ff9d]/10 text-[#00ff9d] border-[#00ff9d]/40 font-bold'
                    : 'bg-[#151a21] text-[#8e9dae] border-[#3a494b]/60 font-semibold'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#00ff9d]" />
                ) : isCurrent ? (
                  <div className="w-2 h-2 rounded-full bg-black animate-ping" />
                ) : (
                  <Circle className="w-3 h-3 text-[#8e9dae]" />
                )}
                <span>{step.label}</span>
              </div>

              {idx < OPERATIONAL_LIFECYCLE_STAGES.length - 1 && (
                <ChevronRight className="w-3.5 h-3.5 text-[#3a494b] shrink-0" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
