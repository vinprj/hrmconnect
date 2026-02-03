/**
 * Morning Readiness Score Calculator
 * 
 * Calculates a readiness score (0-100) based on HRV metrics.
 * Higher scores indicate better recovery and readiness for training.
 * 
 * Based on research correlating RMSSD and resting HR with recovery status.
 */

import type { SessionStats } from './stats';
import type { AdvancedStats } from './advancedStats';

export interface ReadinessResult {
    score: number;           // 0-100
    status: 'poor' | 'fair' | 'good' | 'excellent';
    color: string;
    recommendation: string;
    factors: {
        rmssd: { value: number; contribution: number; label: string };
        restingHR: { value: number; contribution: number; label: string };
        hrv: { value: number; contribution: number; label: string };  // SDNN
    };
}

interface PersonalBaseline {
    avgRmssd: number;
    avgRestingHR: number;
    avgSdnn: number;
}

// Default baseline for new users (typical healthy adult values)
const DEFAULT_BASELINE: PersonalBaseline = {
    avgRmssd: 40,     // ms
    avgRestingHR: 65, // BPM
    avgSdnn: 50       // ms
};

/**
 * Calculate readiness score from current metrics vs baseline
 * @param stats Current session stats
 * @param advancedStats Current advanced stats
 * @param baseline Personal baseline (optional, uses defaults if not provided)
 * @returns Readiness result with score, status, and recommendations
 */
export function calculateReadiness(
    stats: SessionStats,
    advancedStats: AdvancedStats,
    baseline: PersonalBaseline = DEFAULT_BASELINE
): ReadinessResult {
    // Calculate individual factor contributions (each 0-100, weighted)

    // RMSSD (40% weight) - Higher is better
    // Score increases as RMSSD approaches or exceeds baseline
    const rmssdRatio = advancedStats.pnn50 > 0 ? stats.rmssd / baseline.avgRmssd : 0;
    const rmssdScore = Math.min(100, Math.max(0, rmssdRatio * 100));
    const rmssdContribution = rmssdScore * 0.40;

    // Resting HR (35% weight) - Lower is better
    // Score increases as HR is at or below baseline
    const hrRatio = stats.avgHr > 0 ? baseline.avgRestingHR / stats.avgHr : 0;
    const hrScore = Math.min(100, Math.max(0, hrRatio * 100));
    const hrContribution = hrScore * 0.35;

    // SDNN (25% weight) - Higher is better
    const sdnnRatio = stats.sdnn > 0 ? stats.sdnn / baseline.avgSdnn : 0;
    const sdnnScore = Math.min(100, Math.max(0, sdnnRatio * 100));
    const sdnnContribution = sdnnScore * 0.25;

    // Total score
    const totalScore = Math.round(rmssdContribution + hrContribution + sdnnContribution);

    // Determine status and recommendations
    let status: ReadinessResult['status'];
    let color: string;
    let recommendation: string;

    if (totalScore >= 80) {
        status = 'excellent';
        color = '#22c55e';
        recommendation = 'Great recovery! You\'re ready for high-intensity training.';
    } else if (totalScore >= 60) {
        status = 'good';
        color = '#84cc16';
        recommendation = 'Good recovery. Normal training is recommended.';
    } else if (totalScore >= 40) {
        status = 'fair';
        color = '#eab308';
        recommendation = 'Moderate recovery. Consider lighter training today.';
    } else {
        status = 'poor';
        color = '#ef4444';
        recommendation = 'Low recovery detected. Rest or very light activity recommended.';
    }

    return {
        score: totalScore,
        status,
        color,
        recommendation,
        factors: {
            rmssd: {
                value: stats.rmssd,
                contribution: Math.round(rmssdContribution),
                label: rmssdScore >= 100 ? 'Above baseline' : rmssdScore >= 70 ? 'Near baseline' : 'Below baseline'
            },
            restingHR: {
                value: stats.avgHr,
                contribution: Math.round(hrContribution),
                label: hrScore >= 100 ? 'Below baseline' : hrScore >= 70 ? 'Near baseline' : 'Above baseline'
            },
            hrv: {
                value: stats.sdnn,
                contribution: Math.round(sdnnContribution),
                label: sdnnScore >= 100 ? 'Above baseline' : sdnnScore >= 70 ? 'Near baseline' : 'Below baseline'
            }
        }
    };
}

/**
 * Get a quick readiness estimate without full baseline
 * Uses population norms as reference
 */
export function getQuickReadiness(rmssd: number, restingHR: number): number {
    // Simple formula: higher RMSSD and lower HR = higher readiness
    const rmssdScore = Math.min(100, (rmssd / 50) * 100); // 50ms as "good" reference
    const hrScore = Math.min(100, (60 / restingHR) * 100); // 60 BPM as "good" reference

    return Math.round((rmssdScore * 0.6) + (hrScore * 0.4));
}
