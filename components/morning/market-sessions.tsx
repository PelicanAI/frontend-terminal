'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  MARKETS,
  getMarketStatus,
  formatCountdown,
  formatTimeInZone,
  type MarketStatus,
  type SessionStatus,
} from '@/lib/market-hours';
import { Clock, CaretDown, CaretUp } from '@phosphor-icons/react';
import { PelicanCard } from '@/components/ui/pelican';

const DEFAULT_MARKET_IDS = [
  'us-equities',
  'us-futures',
  'london',
  'tokyo',
  'forex',
  'crypto',
];

const STATUS_COLORS: Record<SessionStatus, string> = {
  open: 'hsl(142, 60%, 50%)',
  'pre-market': 'hsl(45, 80%, 55%)',
  'after-hours': 'hsl(35, 80%, 55%)',
  closed: 'var(--text-muted)',
};

const STATUS_LABELS: Record<SessionStatus, string> = {
  open: 'Open',
  'pre-market': 'Pre-Market',
  'after-hours': 'After-Hours',
  closed: 'Closed',
};

function getPrimaryMarket(statuses: MarketStatus[]): MarketStatus | null {
  if (statuses.length === 0) return null;

  // US Regular session if open
  const usEquities = statuses.find(s => s.market.id === 'us-equities');
  if (usEquities && usEquities.status === 'open') return usEquities;

  // Any US market that's not closed
  const usAny = statuses.find(
    s => s.market.id.startsWith('us') && s.status !== 'closed',
  );
  if (usAny) return usAny;

  // First open market
  const firstOpen = statuses.find(s => s.status === 'open');
  if (firstOpen) return firstOpen;

  // First non-closed
  const firstActive = statuses.find(s => s.status !== 'closed');
  if (firstActive) return firstActive;

  return statuses[0] ?? null;
}

export function MarketSessions() {
  const [now, setNow] = useState(() => new Date());
  const [expanded, setExpanded] = useState(false);

  // Tick every second
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const allStatuses = useMemo(
    () => MARKETS.map(m => getMarketStatus(m, now)),
    [now],
  );

  const visibleStatuses = useMemo(() => {
    if (expanded) return allStatuses;
    return allStatuses.filter(s => DEFAULT_MARKET_IDS.includes(s.market.id));
  }, [allStatuses, expanded]);

  const primary = useMemo(
    () => getPrimaryMarket(allStatuses),
    [allStatuses],
  );

  const hiddenCount = allStatuses.length - DEFAULT_MARKET_IDS.length;

  return (
    <PelicanCard className="p-5">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock
            className="h-4 w-4 text-[var(--accent-primary)]"
            weight="regular"
          />
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Market Sessions
          </h2>
        </div>
        <span className="font-mono tabular-nums text-xs text-[var(--text-muted)]">
          {formatTimeInZone(now, 'America/New_York', 'long')}
        </span>
      </div>

      {/* Market rows */}
      <div className="space-y-1.5">
        {visibleStatuses.map(ms => (
          <MarketRow key={ms.market.id} status={ms} now={now} />
        ))}
      </div>

      {/* Show all / collapse toggle */}
      {hiddenCount > 0 && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="mt-3 flex w-full items-center justify-center gap-1 border-t border-[var(--border-subtle)] pt-3 text-xs text-[var(--text-muted)] transition-colors duration-150 hover:text-[var(--text-secondary)]"
        >
          {expanded ? (
            <>
              Show fewer markets
              <CaretUp className="h-3 w-3" weight="bold" />
            </>
          ) : (
            <>
              Show all markets
              <CaretDown className="h-3 w-3" weight="bold" />
            </>
          )}
        </button>
      )}

      {/* Prominent primary countdown */}
      {primary && primary.nextChangeLabel && (
        <div className="mt-3 flex items-center justify-between border-t border-[var(--border-subtle)] pt-3">
          <div className="flex items-center gap-2">
            <div
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: STATUS_COLORS[primary.status] }}
            />
            <span className="text-xs text-[var(--text-secondary)]">
              {primary.market.name}
            </span>
            {primary.currentSession && (
              <span className="text-xs text-[var(--text-muted)]">
                {primary.currentSession}
              </span>
            )}
          </div>
          <span className="font-mono tabular-nums text-sm font-semibold text-[var(--text-primary)]">
            {primary.nextChangeLabel
              ? `${primary.status === 'closed' ? 'Opens' : 'Closes'} in ${formatCountdown(primary.nextChange, now)}`
              : STATUS_LABELS[primary.status]}
          </span>
        </div>
      )}
    </PelicanCard>
  );
}

// ---------------------------------------------------------------------------
// Individual market row
// ---------------------------------------------------------------------------

function MarketRow({
  status,
  now,
}: {
  status: MarketStatus;
  now: Date;
}) {
  const { market, status: sessionStatus, currentSession, nextChange, nextChangeLabel, holidayName } = status;

  const countdown =
    nextChangeLabel && market.id !== 'crypto'
      ? formatCountdown(nextChange, now)
      : null;

  return (
    <div className="flex items-center justify-between rounded-lg px-3 py-2 transition-colors duration-150 hover:bg-[var(--bg-elevated)]">
      {/* Left: status dot + market name */}
      <div className="flex items-center gap-2.5">
        <div
          className="h-2 w-2 flex-shrink-0 rounded-full"
          style={{ backgroundColor: STATUS_COLORS[sessionStatus] }}
        />
        <span className="text-sm text-[var(--text-primary)]">
          {market.name}
        </span>
      </div>

      {/* Right: session name + countdown */}
      <div className="flex items-center gap-3">
        {holidayName ? (
          <span className="text-xs text-[var(--data-warning)]">
            {holidayName}
          </span>
        ) : currentSession ? (
          <span className="text-xs text-[var(--text-muted)]">
            {currentSession}
          </span>
        ) : (
          <span className="text-xs text-[var(--text-muted)]">
            {STATUS_LABELS[sessionStatus]}
          </span>
        )}
        {countdown && (
          <span className="font-mono tabular-nums text-xs text-[var(--text-secondary)]">
            {countdown}
          </span>
        )}
        {market.id === 'crypto' && (
          <span className="font-mono tabular-nums text-xs text-[var(--text-muted)]">
            --
          </span>
        )}
      </div>
    </div>
  );
}
