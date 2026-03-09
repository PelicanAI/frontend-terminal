'use client'

import { ConnectedBrokers } from '@/components/broker/connected-brokers'

export function BrokersSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Broker Connections</h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Connect your brokerage accounts to automatically sync positions into Pelican.
        </p>
      </div>
      <ConnectedBrokers />
    </div>
  )
}
