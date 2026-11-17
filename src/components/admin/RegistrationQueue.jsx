import React from 'react'
import { ClipboardList, ShieldCheck } from 'lucide-react'

export default function RegistrationQueue({ registrations = [], loading, onVerifyClick }) {
  const getStatusStyle = (status) => {
    switch (status) {
      case 'Confirmed':
      case 'Approved':
        return 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/40'
      case 'Pending':
        return 'bg-[#FF8C00]/10 text-[#FF8C00] border-[#FF8C00]/40'
      default:
        return 'bg-[#ef4444]/10 text-[#ef4444] border-[#ef4444]/40'
    }
  }

  return (
    <div className="bg-[#18181B]/60 backdrop-blur-md border border-[#27272A] rounded-none p-5 space-y-4 shadow-xl">
      <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-[#FF8C00]" />
          <h3 className="font-headline text-sm font-bold text-white uppercase tracking-wider">
            Recent Team Signups
          </h3>
        </div>
        {onVerifyClick && (
          <button
            onClick={onVerifyClick}
            className="text-[10px] font-mono font-bold text-[#FFB900] hover:underline flex items-center gap-1 uppercase tracking-wider cursor-pointer"
          >
            <span>Verify Queue &rarr;</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-8 text-center text-[#A1A1AA] text-xs space-y-2">
          <div className="w-6 h-6 border-2 border-[#FFB900] border-t-transparent rounded-none animate-spin mx-auto"></div>
          <span className="font-mono">Syncing registrations...</span>
        </div>
      ) : registrations.length === 0 ? (
        <div className="py-8 text-center bg-[#000000] border border-[#27272A] rounded-none space-y-2 p-4">
          <ShieldCheck className="w-8 h-8 text-[#A1A1AA] mx-auto" />
          <p className="text-xs font-bold text-white uppercase">No Active Registrations</p>
          <p className="text-[10px] text-[#A1A1AA] font-mono">Player registry queue is empty.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {registrations.map((reg) => (
            <div
              key={`dash-reg-${reg.id}`}
              className="p-3.5 bg-[#000000] border border-[#27272A] hover:border-[#FFB900]/40 rounded-none text-xs flex items-center justify-between gap-3 shadow-md transition-all font-mono"
            >
              <div className="space-y-1 overflow-hidden">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-headline font-black text-white text-sm truncate">{reg.teamName}</span>
                  <span className="text-[9px] text-[#A1A1AA] truncate bg-[#18181B] border border-[#27272A] px-1.5 py-0.5 rounded-none">
                    {reg.tournamentTitle}
                  </span>
                  <span className={`px-2 py-0.5 rounded-none text-[9px] font-bold uppercase border ${getStatusStyle(reg.status)}`}>
                    {reg.status}
                  </span>
                </div>
                <p className="text-[11px] text-[#A1A1AA]">
                  Captain: <strong className="text-white">{reg.captainName}</strong> &bull; FF UID:{' '}
                  <span className="text-[#FFB900]">{reg.freeFireUid}</span>
                </p>
              </div>
              <span className="text-[10px] text-[#A1A1AA] whitespace-nowrap shrink-0">
                {reg.registeredAt}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
