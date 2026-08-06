import React from 'react'
import { Wallet, ArrowDownLeft, ArrowUpRight, CheckCircle2, Clock, XCircle, DollarSign } from 'lucide-react'

const mockTransactions = [
  {
    id: 'tx_8801',
    user: 'AlphaSniper_99',
    type: 'Entry Fee Debit',
    amount: '₹100',
    date: '2026-08-06 12:40 PM',
    status: 'Completed'
  },
  {
    id: 'tx_8802',
    user: 'ProGamerX',
    type: 'Deposit (UPI)',
    amount: '₹500',
    date: '2026-08-06 11:15 AM',
    status: 'Pending Approval'
  },
  {
    id: 'tx_8803',
    user: 'TeamApex',
    type: 'Prize Credit',
    amount: '₹5,000',
    date: '2026-08-05 06:30 PM',
    status: 'Completed'
  }
]

export default function WalletMenu() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-white tracking-wide flex items-center gap-2">
          <Wallet className="w-5 h-5 text-emerald-400" />
          Wallet & Transactions V2
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Inspect platform financial ledger, approve deposits/withdrawals, and manage prize distribution.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-emerald-500/30">
          <span className="text-xs text-slate-400 font-semibold">Total Escrow Balance</span>
          <div className="text-2xl font-black text-white mt-1">₹3,42,800</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-cyan-500/30">
          <span className="text-xs text-slate-400 font-semibold">Today's Deposits</span>
          <div className="text-2xl font-black text-cyan-400 mt-1">₹18,500</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-amber-500/30">
          <span className="text-xs text-slate-400 font-semibold">Pending Approvals</span>
          <div className="text-2xl font-black text-amber-400 mt-1">8 Requests</div>
        </div>
      </div>

      <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 overflow-hidden">
        <div className="p-4 border-b border-slate-800/80 font-bold text-sm text-white">
          Recent Wallet Transactions
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800/80 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Tx ID</th>
                <th className="px-4 py-3.5">User</th>
                <th className="px-4 py-3.5">Type</th>
                <th className="px-4 py-3.5">Amount</th>
                <th className="px-4 py-3.5">Date</th>
                <th className="px-4 py-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {mockTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-950/40 transition-colors">
                  <td className="px-6 py-4 font-mono font-bold text-cyan-400">{tx.id}</td>
                  <td className="px-4 py-4 font-semibold text-white">{tx.user}</td>
                  <td className="px-4 py-4">{tx.type}</td>
                  <td className="px-4 py-4 font-mono font-bold text-emerald-400">{tx.amount}</td>
                  <td className="px-4 py-4 font-mono text-slate-400">{tx.date}</td>
                  <td className="px-4 py-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                        tx.status === 'Completed'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}
                    >
                      {tx.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
