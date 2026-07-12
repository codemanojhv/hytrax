import type { OutcomeRecord } from '../knowledge/types.js';

export interface OutcomeStats {
  total: number;
  accepted: number;
  rejected: number;
  failed: number;
  verified: number;
  acceptanceRate: string;
  failureRate: string;
  byArea: Record<string, { total: number; failed: number }>;
  recentFailures: OutcomeRecord[];
}

export function buildStats(outcomes: OutcomeRecord[]): OutcomeStats {
  const stats: OutcomeStats = {
    total: outcomes.length,
    accepted: 0,
    rejected: 0,
    failed: 0,
    verified: 0,
    acceptanceRate: '0%',
    failureRate: '0%',
    byArea: {},
    recentFailures: [],
  };

  for (const o of outcomes) {
    if (o.status === 'ACCEPTED') stats.accepted++;
    else if (o.status === 'REJECTED') stats.rejected++;
    else if (o.status === 'FAILED') stats.failed++;
    else if (o.status === 'VERIFIED') stats.verified++;

    if (o.area) {
      if (!stats.byArea[o.area]) stats.byArea[o.area] = { total: 0, failed: 0 };
      stats.byArea[o.area].total++;
      if (o.status === 'FAILED' || o.status === 'REJECTED') {
        stats.byArea[o.area].failed++;
      }
    }
  }

  if (stats.total > 0) {
    stats.acceptanceRate = `${Math.round((stats.accepted / stats.total) * 100)}%`;
    stats.failureRate = `${Math.round(((stats.failed + stats.rejected) / stats.total) * 100)}%`;
  }

  // Recent failures (last 5)
  stats.recentFailures = outcomes
    .filter(o => o.status === 'FAILED' || o.status === 'REJECTED')
    .slice(-5)
    .reverse();

  return stats;
}
