/**
 * Recovery Score Calculator
 * 
 * Combines morning readiness, HRV trends, stress scores, and session consistency
 * into a single 0-100 daily recovery score.
 */

import type { Session, MorningTestResult } from '../services/storage';

export interface RecoveryData {
  score: number;           // 0-100
  zone: 'poor' | 'moderate' | 'good';
  color: string;
  label: string;
  factors: {
    hrvBaseline: number;     // 0-25
    restingHrTrend: number;  // 0-25
    stressHistory: number;   // 0-25
    consistency: number;     // 0-25
  };
}

export interface TrendPoint {
  date: string;
  timestamp: number;
  rmssd: number;
  sdnn: number;
  stressScore: number;
  recoveryScore: number;
  avgHr: number;
}

/**
 * Calculate a daily recovery score from historical sessions and morning tests.
 */
export function calculateRecoveryScore(
  sessions: Session[],
  morningTests: MorningTestResult[],
  days: number = 7
): RecoveryData {
  const now = Date.now();
  const cutoff = now - days * 86400000;

  const recentSessions = sessions.filter(s => s.startTime >= cutoff);
  const recentTests = morningTests.filter(t => t.timestamp >= cutoff);

  if (recentSessions.length === 0 && recentTests.length === 0) {
    return { score: 0, zone: 'poor', color: '#ef4444', label: 'No Data', factors: { hrvBaseline: 0, restingHrTrend: 0, stressHistory: 0, consistency: 0 } };
  }

  // 1. HRV Baseline comparison (0-25) — recent RMSSD/SDNN vs overall baseline
  const allRmssd = sessions.map(s => s.stats.rmssd).filter(v => v > 0);
  const allSdnn = sessions.map(s => s.stats.sdnn).filter(v => v > 0);
  const baselineRmssd = allRmssd.length > 0 ? allRmssd.reduce((a, b) => a + b, 0) / allRmssd.length : 40;
  const baselineSdnn = allSdnn.length > 0 ? allSdnn.reduce((a, b) => a + b, 0) / allSdnn.length : 50;

  const recentRmssd = recentSessions.length > 0
    ? recentSessions.map(s => s.stats.rmssd).reduce((a, b) => a + b, 0) / recentSessions.length
    : (recentTests.length > 0 ? recentTests.map(t => t.lyingRMSSD).reduce((a, b) => a + b, 0) / recentTests.length : 0);
  const recentSdnn = recentSessions.length > 0
    ? recentSessions.map(s => s.stats.sdnn).reduce((a, b) => a + b, 0) / recentSessions.length : 0;

  const rmssdRatio = baselineRmssd > 0 ? Math.min(recentRmssd / baselineRmssd, 1.5) : 0;
  const sdnnRatio = baselineSdnn > 0 ? Math.min(recentSdnn / baselineSdnn, 1.5) : 0;
  const hrvScore = Math.min(25, Math.round(((rmssdRatio * 0.6 + sdnnRatio * 0.4) / 1.5) * 25));

  // 2. Resting HR trend (0-25) — lower recent HR = better
  const recentHrs = recentSessions.map(s => s.stats.avgHr).filter(v => v > 0);
  const morningHrs = recentTests.map(t => t.lyingAvgHr).filter(v => v > 0);
  const allRecentHr = [...recentHrs, ...morningHrs];
  const avgRecentHr = allRecentHr.length > 0 ? allRecentHr.reduce((a, b) => a + b, 0) / allRecentHr.length : 70;
  const baselineHr = sessions.length > 0
    ? sessions.map(s => s.stats.avgHr).filter(v => v > 0).reduce((a, b) => a + b, 0) / sessions.filter(s => s.stats.avgHr > 0).length
    : 70;
  const hrRatio = avgRecentHr > 0 ? Math.min(baselineHr / avgRecentHr, 1.3) : 0;
  const hrScore = Math.min(25, Math.round((hrRatio / 1.3) * 25));

  // 3. Stress history (0-25) — lower recent stress = better recovery
  const recentStress = recentSessions.map(s => s.advancedStats.stressIndex).filter(v => v > 0);
  let stressScore = 20; // default decent if no data
  if (recentStress.length > 0) {
    const avgStress = recentStress.reduce((a, b) => a + b, 0) / recentStress.length;
    // Stress 0-50 = excellent(25), 50-150 = good(15-20), 150-300 = moderate(8-15), 300+ = poor(0-8)
    stressScore = Math.min(25, Math.max(0, Math.round(25 * (1 - Math.min(avgStress / 400, 1)))));
  }

  // 4. Session consistency (0-25) — regular monitoring = better score
  const uniqueDays = new Set(recentSessions.map(s => new Date(s.startTime).toDateString())).size;
  const testDays = new Set(recentTests.map(t => new Date(t.timestamp).toDateString())).size;
  const totalActiveDays = Math.min(uniqueDays + testDays, days);
  const consistencyRatio = totalActiveDays / Math.min(days, 7);
  const consistencyScore = Math.min(25, Math.round(consistencyRatio * 25));

  const totalScore = Math.min(100, hrvScore + hrScore + stressScore + consistencyScore);

  let zone: RecoveryData['zone'];
  let color: string;
  let label: string;
  if (totalScore >= 67) {
    zone = 'good'; color = '#22c55e'; label = 'Good Recovery';
  } else if (totalScore >= 34) {
    zone = 'moderate'; color = '#eab308'; label = 'Moderate';
  } else {
    zone = 'poor'; color = '#ef4444'; label = 'Poor Recovery';
  }

  return {
    score: totalScore,
    zone, color, label,
    factors: {
      hrvBaseline: hrvScore,
      restingHrTrend: hrScore,
      stressHistory: stressScore,
      consistency: consistencyScore,
    }
  };
}

/**
 * Build trend data points from sessions and morning tests for charting.
 */
export function buildTrendData(
  sessions: Session[],
  morningTests: MorningTestResult[],
  days: number = 30
): TrendPoint[] {
  const now = Date.now();
  const cutoff = now - days * 86400000;

  // Group sessions by date
  const byDate = new Map<string, { sessions: Session[]; tests: MorningTestResult[] }>();

  for (const s of sessions) {
    if (s.startTime < cutoff) continue;
    const date = new Date(s.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (!byDate.has(date)) byDate.set(date, { sessions: [], tests: [] });
    byDate.get(date)!.sessions.push(s);
  }

  for (const t of morningTests) {
    if (t.timestamp < cutoff) continue;
    const date = new Date(t.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (!byDate.has(date)) byDate.set(date, { sessions: [], tests: [] });
    byDate.get(date)!.tests.push(t);
  }

  // Sort by date
  const entries = Array.from(byDate.entries()).sort((a, b) => {
    const aTime = a[1].sessions[0]?.startTime ?? a[1].tests[0]?.timestamp ?? 0;
    const bTime = b[1].sessions[0]?.startTime ?? b[1].tests[0]?.timestamp ?? 0;
    return aTime - bTime;
  });

  return entries.map(([date, data]) => {
    const ss = data.sessions;
    const ts = data.tests;

    const rmssd = ss.length > 0
      ? Math.round(ss.reduce((a, s) => a + s.stats.rmssd, 0) / ss.length * 10) / 10
      : (ts.length > 0 ? Math.round(ts.reduce((a, t) => a + t.lyingRMSSD, 0) / ts.length * 10) / 10 : 0);

    const sdnn = ss.length > 0
      ? Math.round(ss.reduce((a, s) => a + s.stats.sdnn, 0) / ss.length * 10) / 10 : 0;

    const stressScore = ss.length > 0
      ? Math.round(ss.reduce((a, s) => a + s.advancedStats.stressIndex, 0) / ss.length) : 0;

    const avgHr = ss.length > 0
      ? Math.round(ss.reduce((a, s) => a + s.stats.avgHr, 0) / ss.length)
      : (ts.length > 0 ? Math.round(ts.reduce((a, t) => a + t.lyingAvgHr, 0) / ts.length) : 0);

    // Mini recovery calc for this day
    const dayRecovery = calculateRecoveryScore(
      [...sessions], [...morningTests], 1
    );

    const timestamp = ss[0]?.startTime ?? ts[0]?.timestamp ?? 0;

    return {
      date,
      timestamp,
      rmssd,
      sdnn,
      stressScore,
      recoveryScore: dayRecovery.score,
      avgHr,
    };
  });
}

/**
 * Calculate trend direction from data points.
 */
export function getTrendDirection(values: number[]): 'improving' | 'declining' | 'stable' {
  if (values.length < 2) return 'stable';
  const half = Math.floor(values.length / 2);
  const firstHalf = values.slice(0, half);
  const secondHalf = values.slice(half);
  const avg1 = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const avg2 = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
  const change = ((avg2 - avg1) / (avg1 || 1)) * 100;
  if (change > 5) return 'improving';
  if (change < -5) return 'declining';
  return 'stable';
}
