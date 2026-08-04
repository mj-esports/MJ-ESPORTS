import React from 'react'
import { CreditCard, IndianRupee, CheckCircle2, AlertCircle } from 'lucide-react'

export default function PaymentOverview({ totalRevenue = 0, pendingPayments = 0, loading }) {
  return (
    <div className="bg-[#18181b]/60 backdrop-blur-md border border-[#27272a] rounded-2xl p-5 space-y-4 shadow-xl">
      <div className="flex items-center gap-2 border-b border-[#27272a] pb-3">
        <CreditCard className="w-4 h-4 text-[#00ff9d]" />
        <h3 className="font-headline text-sm font-bold text-white uppercase tracking-wider">
          Payment Overview
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Total Revenue Box */}
        <div className="p-4 bg-[#09090b] border border-[#27272a] rounded-xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-[#a1a1aa] font-mono uppercase font-bold block">Gross Revenue</span>
            <span className="text-xl font-bold text-[#00ff9d] font-mono">
              {loading ? '...' : `₹${totalRevenue.toLocaleString()}`}
            </span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-[#00ff9d]/10 flex items-center justify-center text-[#00ff9d]">
            <IndianRupee className="w-4 h-4" />
          </div>
        </div>

        {/* Pending Payments Box */}
        <div className="p-4 bg-[#09090b] border border-[#27272a] rounded-xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-[#a1a1aa] font-mono uppercase font-bold block">Pending Invoices</span>
            <span className="text-xl font-bold text-[#fe6b00] font-mono">
              {loading ? '...' : pendingPayments}
            </span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-[#fe6b00]/10 flex items-center justify-center text-[#fe6b00]">
            <AlertCircle className="w-4 h-4" />
          </div>
        </div>
      </div>

      <div className="p-3 bg-[#00ff9d]/5 border border-[#00ff9d]/20 rounded-xl flex items-center gap-2 text-[#00ff9d] text-[10px] font-mono font-bold uppercase tracking-wider">
        <CheckCircle2 className="w-4 h-4 shrink-0" />
        <span>Secure Ledger Synchronized &bull; SSL Encrypted</span>
      </div>
    </div>
  )
}
