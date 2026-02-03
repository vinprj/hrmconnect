import { describe, it, expect, beforeEach } from 'vitest'
import { AdvancedStatsCalculator } from '../advancedStats'

describe('AdvancedStatsCalculator', () => {
    let calculator: AdvancedStatsCalculator

    beforeEach(() => {
        calculator = new AdvancedStatsCalculator()
    })

    describe('calculate', () => {
        it('returns zeros with insufficient data (< 2 intervals)', () => {
            calculator.addRRIntervals([800])

            const stats = calculator.calculate()
            expect(stats.pnn50).toBe(0)
            expect(stats.stressIndex).toBe(0)
            expect(stats.lf).toBe(0)
            expect(stats.hf).toBe(0)
            expect(stats.lfHfRatio).toBe(0)
            expect(stats.respirationRate).toBe(0)
        })

        it('returns zeros with no data', () => {
            const stats = calculator.calculate()
            expect(stats.pnn50).toBe(0)
            expect(stats.stressIndex).toBe(0)
            expect(stats.lf).toBe(0)
            expect(stats.hf).toBe(0)
            expect(stats.lfHfRatio).toBe(0)
            expect(stats.respirationRate).toBe(0)
        })
    })

    describe('pNN50', () => {
        it('calculates correct percentage when all differences > 50ms', () => {
            // All consecutive differences are > 50ms
            calculator.addRRIntervals([800, 900, 1000, 1100])

            const stats = calculator.calculate()
            // 3 differences: 100, 100, 100 - all > 50
            // pNN50 = 3/3 * 100 = 100%
            expect(stats.pnn50).toBe(100)
        })

        it('calculates correct percentage when no differences > 50ms', () => {
            // All consecutive differences are <= 50ms
            calculator.addRRIntervals([800, 820, 840, 860])

            const stats = calculator.calculate()
            // 3 differences: 20, 20, 20 - none > 50
            // pNN50 = 0/3 * 100 = 0%
            expect(stats.pnn50).toBe(0)
        })

        it('calculates correct percentage for mixed differences', () => {
            // Some differences > 50ms, some <= 50ms
            calculator.addRRIntervals([800, 900, 920, 1000])

            const stats = calculator.calculate()
            // 3 differences: 100 (>50), 20 (<=50), 80 (>50)
            // pNN50 = 2/3 * 100 ≈ 66.67%
            expect(stats.pnn50).toBeGreaterThan(66)
            expect(stats.pnn50).toBeLessThan(67)
        })
    })

    describe('stressIndex', () => {
        it('returns 0 with less than 30 RR intervals', () => {
            // Add only 20 intervals
            const intervals = Array(20).fill(800)
            calculator.addRRIntervals(intervals)

            const stats = calculator.calculate()
            expect(stats.stressIndex).toBe(0)
        })

        it('calculates stress index with sufficient data', () => {
            // Add 50 intervals with some variation
            const intervals: number[] = []
            for (let i = 0; i < 50; i++) {
                intervals.push(800 + Math.sin(i) * 50)
            }
            calculator.addRRIntervals(intervals)

            const stats = calculator.calculate()
            expect(stats.stressIndex).toBeGreaterThanOrEqual(0)
        })

        it('returns 0 when all intervals are identical', () => {
            // All identical intervals = MxDMn is 0
            const intervals = Array(50).fill(800)
            calculator.addRRIntervals(intervals)

            const stats = calculator.calculate()
            expect(stats.stressIndex).toBe(0)
        })
    })

    describe('frequencyDomain', () => {
        it('returns zeros with less than 60 RR intervals', () => {
            // Add only 50 intervals
            const intervals = Array(50).fill(800)
            calculator.addRRIntervals(intervals)

            const stats = calculator.calculate()
            expect(stats.lf).toBe(0)
            expect(stats.hf).toBe(0)
            expect(stats.lfHfRatio).toBe(0)
            expect(stats.respirationRate).toBe(0)
        })

        it('calculates frequency domain metrics with sufficient data', () => {
            // Generate realistic RR intervals with some variation
            // ~75 BPM = ~800ms average RR interval
            const intervals: number[] = []
            for (let i = 0; i < 100; i++) {
                // Add some natural variation
                intervals.push(800 + Math.sin(i * 0.5) * 30 + Math.sin(i * 0.1) * 50)
            }
            calculator.addRRIntervals(intervals)

            const stats = calculator.calculate()
            // With variation, we should get some LF/HF power
            expect(stats.lf).toBeGreaterThanOrEqual(0)
            expect(stats.hf).toBeGreaterThanOrEqual(0)
        })
    })

    describe('reset', () => {
        it('clears all accumulated intervals', () => {
            calculator.addRRIntervals([800, 900, 1000])

            calculator.reset()

            const stats = calculator.calculate()
            expect(stats.pnn50).toBe(0)
            expect(stats.stressIndex).toBe(0)
        })
    })

    describe('addRRIntervals', () => {
        it('accumulates intervals from multiple calls', () => {
            calculator.addRRIntervals([800, 900])
            calculator.addRRIntervals([1000, 1100])

            const stats = calculator.calculate()
            // 3 differences: 100, 100, 100 - all > 50
            expect(stats.pnn50).toBe(100)
        })
    })
})
