import { useTournaments } from '../contexts/TournamentContext'
import FinanceDashboardView from '../components/admin/FinanceDashboardView'

export default function AdminFinancePage() {
  const { tournaments } = useTournaments()

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <FinanceDashboardView tournaments={tournaments} />
    </div>
  )
}
