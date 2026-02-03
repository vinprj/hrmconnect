import { describe, it, expect } from 'vitest'
import { calculateReadiness, getQuickReadiness } from '../readiness'
import type { SessionStats } from '../stats'
import type { AdvancedStats } from '../advancedStats'

describe('readiness', () => {
    // Default baseline: avgRmssd: 40, avgRestingHR: 65, avgSdnn: 50
    const emptyStats: SessionStats = {
        minHr: 0,
        maxHr: 0,
        avgHr: 0,
        sdnn: 0,
        rmssd: 0,
        duration: 0
    }

    const emptyAdvancedStats: AdvancedStats = {
        pnn50: 0,
        stressIndex: 0,
        lf: 0,
        hf: 0,
        lfHfRatio: 0,
        respirationRate: 0
    }

    describe('calculateReadiness', () => {
        it('returns low score when stats are empty/zero', () => {
            const result = calculateReadiness(emptyStats, emptyAdvancedStats)

            expect(result.score).toBe(0)
            expect(result.status).toBe('poor')
        })

        it('returns high score with good metrics (high RMSSD, low HR, high SDNN)', () => {
            const goodStats: SessionStats = {
                minHr: 55,
                maxHr: 65,
                avgHr: 60, // Below baseline of 65
                sdnn: 60,  // Above baseline of 50
                rmssd: 50, // Above baseline of 40
                duration: 300
            }

            const goodAdvancedStats: AdvancedStats = {
                pnn50: 25, // Indicates data is valid
                stressIndex: 20,
                lf: 100,
                hf: 200,
                lfHfRatio: 0.5,
                respirationRate: 14
            }

            const result = calculateReadiness(goodStats, goodAdvancedStats)

            expect(result.score).toBeGreaterThanOrEqual(80)
            expect(result.status).toBe('excellent')
            expect(result.color).toBe('#22c55e')
        })

        it('returns low score with poor metrics (low RMSSD, high HR, low SDNN)', () => {
            const poorStats: SessionStats = {
                minHr: 85,
                maxHr: 95,
                avgHr: 90, // Above baseline of 65
                sdnn: 20,  // Below baseline of 50
                rmssd: 15, // Below baseline of 40
                duration: 300
            }

            const poorAdvancedStats: AdvancedStats = {
                pnn50: 5, // Valid data
                stressIndex: 80,
                lf: 300,
                hf: 50,
                lfHfRatio: 6,
                respirationRate: 20
            }

            const result = calculateReadiness(poorStats, poorAdvancedStats)

            // Algorithm: RMSSD (40%), HR (35%), SDNN (25%)
            // RMSSD: 15/40 * 100 = 37.5, contribution = 37.5 * 0.4 = 15
            // HR: 65/90 * 100 = 72.2, contribution = 72.2 * 0.35 = 25.3
            // SDNN: 20/50 * 100 = 40, contribution = 40 * 0.25 = 10
            // Total ≈ 50 (fair range)
            expect(result.score).toBeLessThan(60)
            expect(result.status).toBe('fair')
            expect(result.color).toBe('#eab308')
        })

        it('score is bounded between 0 and 100', () => {
            // Extremely good metrics (should not exceed 100)
            const excellentStats: SessionStats = {
                minHr: 40,
                maxHr: 50,
                avgHr: 45, // Very low
                sdnn: 150, // Very high
                rmssd: 120, // Very high
                duration: 300
            }

            const excellentAdvancedStats: AdvancedStats = {
                pnn50: 50,
                stressIndex: 10,
                lf: 50,
                hf: 300,
                lfHfRatio: 0.2,
                respirationRate: 12
            }

            const result = calculateReadiness(excellentStats, excellentAdvancedStats)

            expect(result.score).toBeLessThanOrEqual(100)
            expect(result.score).toBeGreaterThanOrEqual(0)
        })

        it('returns correct status for score ranges', () => {
            // Create stats that produce predictable scores
            // Algorithm: RMSSD (40%), HR (35%), SDNN (25%)
            // Default baseline: avgRmssd: 40, avgRestingHR: 65, avgSdnn: 50
            const createStatsForScore = (rmssd: number, avgHr: number, sdnn: number) => {
                const stats: SessionStats = {
                    minHr: avgHr - 5,
                    maxHr: avgHr + 5,
                    avgHr,
                    sdnn,
                    rmssd,
                    duration: 300
                }
                const advancedStats: AdvancedStats = {
                    pnn50: 10, // Non-zero to trigger RMSSD calculation
                    stressIndex: 30,
                    lf: 100,
                    hf: 100,
                    lfHfRatio: 1,
                    respirationRate: 15
                }
                return { stats, advancedStats }
            }

            // Score thresholds: 80+ excellent, 60-79 good, 40-59 fair, <40 poor

            // Target ~90 (excellent): high RMSSD, low HR, high SDNN
            // RMSSD: 48/40=1.2 -> 100*0.4=40, HR: 65/55=1.18 -> 100*0.35=35, SDNN: 60/50=1.2 -> 100*0.25=25
            const excellent = createStatsForScore(48, 55, 60)
            const excellentResult = calculateReadiness(excellent.stats, excellent.advancedStats)
            expect(excellentResult.status).toBe('excellent')

            // Target ~65 (good): need lower values
            // RMSSD: 30/40=0.75 -> 75*0.4=30, HR: 65/70=0.93 -> 93*0.35=32.5, SDNN: 35/50=0.7 -> 70*0.25=17.5
            // Total ≈ 80 - still excellent
            // Need much lower to get 'good' (60-79)
            // RMSSD: 28/40=0.7 -> 70*0.4=28, HR: 65/75=0.87 -> 87*0.35=30.4, SDNN: 30/50=0.6 -> 60*0.25=15
            // Total ≈ 73 (good)
            const good = createStatsForScore(28, 75, 30)
            const goodResult = calculateReadiness(good.stats, good.advancedStats)
            expect(goodResult.status).toBe('good')

            // Target ~50 (fair): below average metrics
            // RMSSD: 20/40=0.5 -> 50*0.4=20, HR: 65/85=0.76 -> 76*0.35=26.6, SDNN: 20/50=0.4 -> 40*0.25=10
            // Total ≈ 57 (fair)
            const fair = createStatsForScore(20, 85, 20)
            const fairResult = calculateReadiness(fair.stats, fair.advancedStats)
            expect(fairResult.status).toBe('fair')
        })

        it('includes factor breakdown in result', () => {
            const stats: SessionStats = {
                minHr: 60,
                maxHr: 70,
                avgHr: 65,
                sdnn: 40,
                rmssd: 35,
                duration: 300
            }

            const advancedStats: AdvancedStats = {
                pnn50: 15,
                stressIndex: 40,
                lf: 150,
                hf: 150,
                lfHfRatio: 1,
                respirationRate: 15
            }

            const result = calculateReadiness(stats, advancedStats)

            expect(result.factors).toBeDefined()
            expect(result.factors.rmssd).toBeDefined()
            expect(result.factors.rmssd.value).toBe(35)
            expect(result.factors.restingHR).toBeDefined()
            expect(result.factors.restingHR.value).toBe(65)
            expect(result.factors.hrv).toBeDefined()
            expect(result.factors.hrv.value).toBe(40)
        })

        it('uses custom baseline when provided', () => {
            const stats: SessionStats = {
                minHr: 55,
                maxHr: 65,
                avgHr: 60,
                sdnn: 40,
                rmssd: 30,
                duration: 300
            }

            const advancedStats: AdvancedStats = {
                pnn50: 15,
                stressIndex: 40,
                lf: 150,
                hf: 150,
                lfHfRatio: 1,
                respirationRate: 15
            }

            // With default baseline (avgRmssd: 40), rmssd of 30 is below baseline
            const defaultResult = calculateReadiness(stats, advancedStats)

            // With custom baseline where 30 is at baseline
            const customBaseline = {
                avgRmssd: 30,
                avgRestingHR: 60,
                avgSdnn: 40
            }
            const customResult = calculateReadiness(stats, advancedStats, customBaseline)

            // Custom result should have higher RMSSD contribution
            expect(customResult.factors.rmssd.contribution).toBeGreaterThan(defaultResult.factors.rmssd.contribution)
        })
    })

    describe('getQuickReadiness', () => {
        it('returns high score with good RMSSD and low HR', () => {
            const score = getQuickReadiness(60, 55)
            // RMSSD: (60/50)*100 = 120 -> capped at 100
            // HR: (60/55)*100 ≈ 109 -> capped at 100
            // Score = 100*0.6 + 100*0.4 = 100
            expect(score).toBeGreaterThanOrEqual(90)
        })

        it('returns low score with low RMSSD and high HR', () => {
            const score = getQuickReadiness(20, 90)
            // RMSSD: (20/50)*100 = 40
            // HR: (60/90)*100 ≈ 67
            // Score = 40*0.6 + 67*0.4 ≈ 51
            expect(score).toBeLessThan(60)
        })

        it('returns moderate score with average values', () => {
            const score = getQuickReadiness(40, 70)
            // RMSSD: (40/50)*100 = 80
            // HR: (60/70)*100 ≈ 86
            // Score = 80*0.6 + 86*0.4 ≈ 82
            expect(score).toBeGreaterThan(50)
            expect(score).toBeLessThan(90)
        })

        it('weights RMSSD more heavily (60%) than HR (40%)', () => {
            // Same RMSSD contribution, different HR
            const highHR = getQuickReadiness(50, 80) // HR contribution lower
            const lowHR = getQuickReadiness(50, 60) // HR contribution higher

            expect(lowHR).toBeGreaterThan(highHR)
            // The difference should be about 40% of the HR score difference
        })
    })
})
