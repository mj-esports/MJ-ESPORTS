import React from 'react'
import EmptyState from '../common/EmptyState'

interface FinanceEmptyStateProps {
  message?: string
  subtitle?: string
}

export const FinanceEmptyState: React.FC<FinanceEmptyStateProps> = ({ message, subtitle }) => {
  return (
    <EmptyState
      type="finance"
      title={message || 'No Payment Data Available Yet'}
      subtitle={subtitle || 'Verified Razorpay tournament slot registrations will automatically populate here in real time.'}
    />
  )
}
