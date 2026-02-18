export interface SessionWindow {
  name: string;
  open: string;   // "HH:MM" in exchange local time
  close: string;  // "HH:MM"
}

export interface MarketDefinition {
  id: string;
  name: string;
  exchange: string;
  timezone: string;
  sessions: SessionWindow[];
  daysOfWeek: number[];  // 0=Sun ... 6=Sat
  color: string;
}

export const MARKETS: MarketDefinition[] = [
  {
    id: 'us-equities',
    name: 'US Equities',
    exchange: 'NYSE / NASDAQ',
    timezone: 'America/New_York',
    sessions: [
      { name: 'Pre-Market', open: '04:00', close: '09:30' },
      { name: 'Regular', open: '09:30', close: '16:00' },
      { name: 'After-Hours', open: '16:00', close: '20:00' },
    ],
    daysOfWeek: [1, 2, 3, 4, 5],
    color: 'hsl(217, 70%, 55%)',
  },
  {
    id: 'us-futures',
    name: 'US Futures',
    exchange: 'CME / CBOT',
    timezone: 'America/New_York',
    sessions: [
      { name: 'Globex', open: '18:00', close: '17:00' },
    ],
    daysOfWeek: [0, 1, 2, 3, 4, 5],
    color: 'hsl(35, 80%, 55%)',
  },
  {
    id: 'london',
    name: 'London',
    exchange: 'LSE',
    timezone: 'Europe/London',
    sessions: [
      { name: 'Regular', open: '08:00', close: '16:30' },
    ],
    daysOfWeek: [1, 2, 3, 4, 5],
    color: 'hsl(0, 65%, 55%)',
  },
  {
    id: 'europe',
    name: 'Europe',
    exchange: 'Xetra / Euronext',
    timezone: 'Europe/Berlin',
    sessions: [
      { name: 'Regular', open: '09:00', close: '17:30' },
    ],
    daysOfWeek: [1, 2, 3, 4, 5],
    color: 'hsl(45, 70%, 50%)',
  },
  {
    id: 'tokyo',
    name: 'Tokyo',
    exchange: 'TSE',
    timezone: 'Asia/Tokyo',
    sessions: [
      { name: 'Morning', open: '09:00', close: '11:30' },
      { name: 'Afternoon', open: '12:30', close: '15:00' },
    ],
    daysOfWeek: [1, 2, 3, 4, 5],
    color: 'hsl(350, 65%, 55%)',
  },
  {
    id: 'hong-kong',
    name: 'Hong Kong',
    exchange: 'HKEX',
    timezone: 'Asia/Hong_Kong',
    sessions: [
      { name: 'Morning', open: '09:30', close: '12:00' },
      { name: 'Afternoon', open: '13:00', close: '16:00' },
    ],
    daysOfWeek: [1, 2, 3, 4, 5],
    color: 'hsl(15, 75%, 55%)',
  },
  {
    id: 'forex',
    name: 'Forex',
    exchange: 'Interbank',
    timezone: 'America/New_York',
    sessions: [
      { name: 'Global', open: '17:00', close: '17:00' },
    ],
    daysOfWeek: [0, 1, 2, 3, 4, 5],
    color: 'hsl(160, 60%, 45%)',
  },
  {
    id: 'crypto',
    name: 'Crypto',
    exchange: '24/7',
    timezone: 'UTC',
    sessions: [
      { name: 'Always Open', open: '00:00', close: '23:59' },
    ],
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    color: 'hsl(40, 90%, 55%)',
  },
];

export const US_HOLIDAYS_2026 = [
  { date: '2026-01-01', name: "New Year's Day" },
  { date: '2026-01-19', name: 'Martin Luther King Jr. Day' },
  { date: '2026-02-16', name: "Presidents' Day" },
  { date: '2026-04-03', name: 'Good Friday' },
  { date: '2026-05-25', name: 'Memorial Day' },
  { date: '2026-06-19', name: 'Juneteenth' },
  { date: '2026-07-03', name: 'Independence Day (observed)' },
  { date: '2026-09-07', name: 'Labor Day' },
  { date: '2026-11-26', name: 'Thanksgiving' },
  { date: '2026-12-25', name: 'Christmas' },
];

export type SessionStatus = 'open' | 'pre-market' | 'after-hours' | 'closed';

export interface MarketStatus {
  market: MarketDefinition;
  status: SessionStatus;
  currentSession: string | null;
  nextChange: Date;
  nextChangeLabel: string;
  holidayName?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse "HH:MM" into minutes since midnight */
function parseHHMM(s: string): number {
  const [h, m] = s.split(':').map(Number);
  return h! * 60 + m!;
}

/** Get time parts in a given IANA timezone using Intl */
function getTimeParts(date: Date, timezone: string) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'short',
  });

  const parts = fmt.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find(p => p.type === type)?.value ?? '0';

  const dayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };

  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    hour: Number(get('hour')),
    minute: Number(get('minute')),
    second: Number(get('second')),
    dow: dayMap[get('weekday')] ?? 0,
    minutesSinceMidnight: Number(get('hour')) * 60 + Number(get('minute')),
  };
}

/** Get the date string (YYYY-MM-DD) in a timezone */
function getDateStringInTZ(date: Date, timezone: string): string {
  const p = getTimeParts(date, timezone);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

/** Check if a date falls on a US holiday */
function isUSHoliday(date: Date): { isHoliday: boolean; name?: string } {
  const dateStr = getDateStringInTZ(date, 'America/New_York');
  const holiday = US_HOLIDAYS_2026.find(h => h.date === dateStr);
  return holiday ? { isHoliday: true, name: holiday.name } : { isHoliday: false };
}

/** Map session name to a SessionStatus */
function sessionNameToStatus(name: string): SessionStatus {
  switch (name) {
    case 'Pre-Market':
      return 'pre-market';
    case 'After-Hours':
      return 'after-hours';
    default:
      return 'open';
  }
}

/** Create a Date for the next occurrence of a given HH:MM in a timezone, starting from `after` */
function nextTimeInTZ(hhMM: string, timezone: string, after: Date, targetDow?: number[]): Date {
  // Start from current time, step by minutes to find next match
  const targetMinutes = parseHHMM(hhMM);
  const result = new Date(after.getTime());

  // First, try today: set to target time
  const parts = getTimeParts(result, timezone);
  const nowMinutes = parts.minutesSinceMidnight;

  if (nowMinutes < targetMinutes) {
    // Target time is later today
    const diffMs = (targetMinutes - nowMinutes) * 60_000 - parts.second * 1000;
    result.setTime(after.getTime() + diffMs);
    if (targetDow) {
      const rp = getTimeParts(result, timezone);
      if (targetDow.includes(rp.dow)) return result;
    } else {
      return result;
    }
  }

  // Otherwise, advance day by day up to 8 days to find the next valid day
  const baseDate = new Date(after.getTime());
  // Jump to next midnight + target minutes
  const msTillMidnight = ((24 * 60) - nowMinutes) * 60_000 - parts.second * 1000;
  baseDate.setTime(after.getTime() + msTillMidnight + targetMinutes * 60_000);

  for (let i = 0; i < 8; i++) {
    const candidate = new Date(baseDate.getTime() + i * 86_400_000);
    const cp = getTimeParts(candidate, timezone);
    if (!targetDow || targetDow.includes(cp.dow)) {
      return candidate;
    }
  }

  // Fallback: return 24h from now
  return new Date(after.getTime() + 86_400_000);
}

// ---------------------------------------------------------------------------
// Main status function
// ---------------------------------------------------------------------------

export function getMarketStatus(market: MarketDefinition, now: Date): MarketStatus {
  const { timezone, sessions, daysOfWeek } = market;
  const parts = getTimeParts(now, timezone);
  const nowMin = parts.minutesSinceMidnight;

  // Crypto is always open
  if (market.id === 'crypto') {
    return {
      market,
      status: 'open',
      currentSession: 'Always Open',
      nextChange: new Date(now.getTime() + 365 * 86_400_000),
      nextChangeLabel: '',
    };
  }

  // Check US holidays for US markets
  if (market.id.startsWith('us')) {
    const holiday = isUSHoliday(now);
    if (holiday.isHoliday) {
      // Find next trading day open
      const nextOpen = nextTimeInTZ(
        sessions[0]!.open,
        timezone,
        now,
        daysOfWeek,
      );
      return {
        market,
        status: 'closed',
        currentSession: null,
        nextChange: nextOpen,
        nextChangeLabel: 'opens in',
        holidayName: holiday.name,
      };
    }
  }

  // Forex: open Sun 5pm ET to Fri 5pm ET
  if (market.id === 'forex') {
    const etParts = getTimeParts(now, 'America/New_York');
    const etMin = etParts.minutesSinceMidnight;
    const dow = etParts.dow;

    // Closed: Fri after 5pm, all day Sat, Sun before 5pm
    const fridayClose = 17 * 60; // 5pm
    const sundayOpen = 17 * 60;  // 5pm

    const isClosed =
      (dow === 5 && etMin >= fridayClose) ||
      (dow === 6) ||
      (dow === 0 && etMin < sundayOpen);

    if (isClosed) {
      const nextOpen = nextTimeInTZ('17:00', 'America/New_York', now, [0]);
      return {
        market,
        status: 'closed',
        currentSession: null,
        nextChange: nextOpen,
        nextChangeLabel: 'opens in',
      };
    }

    // Open — next close is Friday 5pm ET
    const nextClose = nextTimeInTZ('17:00', 'America/New_York', now, [5]);
    return {
      market,
      status: 'open',
      currentSession: 'Global',
      nextChange: nextClose,
      nextChangeLabel: 'closes in',
    };
  }

  // US Futures (CME Globex): open Sun 6pm to Fri 5pm, maintenance 5-6pm Mon-Thu
  if (market.id === 'us-futures') {
    const etParts = getTimeParts(now, 'America/New_York');
    const etMin = etParts.minutesSinceMidnight;
    const dow = etParts.dow;

    const maintenanceStart = 17 * 60; // 5pm
    const maintenanceEnd = 18 * 60;   // 6pm
    const sundayOpen = 18 * 60;       // 6pm
    const fridayClose = 17 * 60;      // 5pm

    // Closed all day Saturday
    if (dow === 6) {
      const nextOpen = nextTimeInTZ('18:00', 'America/New_York', now, [0]);
      return {
        market,
        status: 'closed',
        currentSession: null,
        nextChange: nextOpen,
        nextChangeLabel: 'opens in',
      };
    }

    // Sunday before 6pm
    if (dow === 0 && etMin < sundayOpen) {
      const nextOpen = nextTimeInTZ('18:00', 'America/New_York', now, [0]);
      return {
        market,
        status: 'closed',
        currentSession: null,
        nextChange: nextOpen,
        nextChangeLabel: 'opens in',
      };
    }

    // Friday after 5pm
    if (dow === 5 && etMin >= fridayClose) {
      const nextOpen = nextTimeInTZ('18:00', 'America/New_York', now, [0]);
      return {
        market,
        status: 'closed',
        currentSession: null,
        nextChange: nextOpen,
        nextChangeLabel: 'opens in',
      };
    }

    // Mon-Thu maintenance window 5-6pm
    if (dow >= 1 && dow <= 4 && etMin >= maintenanceStart && etMin < maintenanceEnd) {
      const reopenMs = (maintenanceEnd - etMin) * 60_000;
      return {
        market,
        status: 'closed',
        currentSession: null,
        nextChange: new Date(now.getTime() + reopenMs),
        nextChangeLabel: 'opens in',
      };
    }

    // Otherwise open — find next close/maintenance
    let nextClose: Date;
    if (dow === 5) {
      // Closes at 5pm today
      const remaining = (fridayClose - etMin) * 60_000;
      nextClose = new Date(now.getTime() + remaining);
    } else if (dow >= 1 && dow <= 4) {
      // Maintenance at 5pm today
      const remaining = (maintenanceStart - etMin) * 60_000;
      if (remaining > 0) {
        nextClose = new Date(now.getTime() + remaining);
      } else {
        // After 6pm, next maintenance is tomorrow 5pm (if weekday) or Friday close
        nextClose = nextTimeInTZ('17:00', 'America/New_York', now);
      }
    } else {
      // Sunday evening — next maintenance is Mon 5pm
      nextClose = nextTimeInTZ('17:00', 'America/New_York', now, [1]);
    }

    return {
      market,
      status: 'open',
      currentSession: 'Globex',
      nextChange: nextClose,
      nextChangeLabel: 'closes in',
    };
  }

  // Standard markets: check day of week
  if (!daysOfWeek.includes(parts.dow)) {
    const nextOpen = nextTimeInTZ(sessions[0]!.open, timezone, now, daysOfWeek);
    return {
      market,
      status: 'closed',
      currentSession: null,
      nextChange: nextOpen,
      nextChangeLabel: 'opens in',
    };
  }

  // Check each session window
  for (const session of sessions) {
    const openMin = parseHHMM(session.open);
    const closeMin = parseHHMM(session.close);

    // Normal session (open < close)
    if (openMin < closeMin) {
      if (nowMin >= openMin && nowMin < closeMin) {
        const remainingMs = (closeMin - nowMin) * 60_000 - parts.second * 1000;
        return {
          market,
          status: sessionNameToStatus(session.name),
          currentSession: session.name,
          nextChange: new Date(now.getTime() + remainingMs),
          nextChangeLabel: 'closes in',
        };
      }
    } else {
      // Overnight session (close < open, wraps past midnight)
      if (nowMin >= openMin || nowMin < closeMin) {
        let remainingMin: number;
        if (nowMin >= openMin) {
          remainingMin = (24 * 60 - nowMin) + closeMin;
        } else {
          remainingMin = closeMin - nowMin;
        }
        const remainingMs = remainingMin * 60_000 - parts.second * 1000;
        return {
          market,
          status: sessionNameToStatus(session.name),
          currentSession: session.name,
          nextChange: new Date(now.getTime() + remainingMs),
          nextChangeLabel: 'closes in',
        };
      }
    }
  }

  // Not in any session — find the next session that opens
  // Sort sessions by open time, find the first one that opens after now
  const sortedSessions = [...sessions].sort(
    (a, b) => parseHHMM(a.open) - parseHHMM(b.open),
  );

  const nextSession = sortedSessions.find(s => parseHHMM(s.open) > nowMin);
  if (nextSession) {
    const remainingMs = (parseHHMM(nextSession.open) - nowMin) * 60_000 - parts.second * 1000;
    return {
      market,
      status: 'closed',
      currentSession: null,
      nextChange: new Date(now.getTime() + remainingMs),
      nextChangeLabel: 'opens in',
    };
  }

  // All sessions have passed today — next open is tomorrow (or next trading day)
  const nextOpen = nextTimeInTZ(sortedSessions[0]!.open, timezone, now, daysOfWeek);
  return {
    market,
    status: 'closed',
    currentSession: null,
    nextChange: nextOpen,
    nextChangeLabel: 'opens in',
  };
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

export function formatCountdown(target: Date, now: Date): string {
  const diffMs = Math.max(0, target.getTime() - now.getTime());
  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export function formatTimeInZone(
  date: Date,
  timezone: string,
  format: 'short' | 'long' = 'short',
): string {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  };

  if (format === 'long') {
    options.timeZoneName = 'short';
  }

  return new Intl.DateTimeFormat('en-US', options).format(date);
}
