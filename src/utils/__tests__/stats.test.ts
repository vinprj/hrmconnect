import { describe, it, expect, beforeEach } from 'vitest'
import { StatsCalculator } from '../stats'

describe('StatsCalculator', () => {
    let calculator: StatsCalculator

    beforeEach(() => {
        calculator = new StatsCalculator()
    })

    describe('getStats', () => {
        it('returns zeros when no readings have been added', () => {
            const stats = calculator.getStats()
            expect(stats.minHr).toBe(0)
            expect(stats.maxHr).toBe(0)
            expect(stats.avgHr).toBe(0)
            expect(stats.sdnn).toBe(0)
            expect(stats.rmssd).toBe(0)
            expect(stats.duration).toBe(0)
        })
    })

    describe('addReading', () => {
        it('correctly accumulates heart rate values', () => {
            calculator.addReading(70)
            calculator.addReading(75)
            calculator.addReading(80)

            const stats = calculator.getStats()
            expect(stats.minHr).toBe(70)
            expect(stats.maxHr).toBe(80)
            expect(stats.avgHr).toBe(75)
        })

        it('handles RR intervals when provided', () => {
            calculator.addReading(70, [800, 850, 900])
            calculator.addReading(72, [820, 870])

            const stats = calculator.getStats()
            expect(stats.sdnn).toBeGreaterThan(0)
            expect(stats.rmssd).toBeGreaterThan(0)
        })
    })

    describe('HR calculations', () => {
        it('calculates min/max/avg correctly', () => {
            calculator.addReading(60)
            calculator.addReading(100)
            calculator.addReading(80)

            const stats = calculator.getStats()
            expect(stats.minHr).toBe(60)
            expect(stats.maxHr).toBe(100)
            expect(stats.avgHr).toBe(80) // (60 + 100 + 80) / 3 = 80
        })

        it('handles single reading', () => {
            calculator.addReading(72)

            const stats = calculator.getStats()
            expect(stats.minHr).toBe(72)
            expect(stats.maxHr).toBe(72)
            expect(stats.avgHr).toBe(72)
        })
    })

    describe('SDNN calculation', () => {
        it('returns 0 with less than 2 RR intervals', () => {
            calculator.addReading(70, [800])

            const stats = calculator.getStats()
            expect(stats.sdnn).toBe(0)
        })

        it('calculates SDNN correctly for known values', () => {
            // RR intervals: 800, 900, 1000 ms
            // Mean: 900, Variance: ((800-900)^2 + (900-900)^2 + (1000-900)^2) / 3
            // Variance = (10000 + 0 + 10000) / 3 = 6666.67
            // SDNN = sqrt(6666.67) ≈ 82
            calculator.addReading(70, [800, 900, 1000])

            const stats = calculator.getStats()
            expect(stats.sdnn).toBeGreaterThanOrEqual(81)
            expect(stats.sdnn).toBeLessThanOrEqual(82)
        })

        it('returns 0 when all RR intervals are identical', () => {
            calculator.addReading(70, [800, 800, 800, 800])

            const stats = calculator.getStats()
            expect(stats.sdnn).toBe(0)
        })
    })

    describe('RMSSD calculation', () => {
        it('returns 0 with less than 2 RR intervals', () => {
            calculator.addReading(70, [800])

            const stats = calculator.getStats()
            expect(stats.rmssd).toBe(0)
        })

        it('calculates RMSSD correctly for known values', () => {
            // RR intervals: 800, 850, 900 ms
            // Successive differences: 50, 50
            // RMSSD = sqrt((50^2 + 50^2) / 2) = sqrt(2500) = 50
            calculator.addReading(70, [800, 850, 900])

            const stats = calculator.getStats()
            expect(stats.rmssd).toBe(50)
        })

        it('returns 0 when consecutive intervals are identical', () => {
            calculator.addReading(70, [800, 800, 800])

            const stats = calculator.getStats()
            expect(stats.rmssd).toBe(0)
        })
    })

    describe('reset', () => {
        it('clears all accumulated data', () => {
            calculator.addReading(70, [800])
            calculator.addReading(80, [850])

            calculator.reset()

            const stats = calculator.getStats()
            expect(stats.minHr).toBe(0)
            expect(stats.maxHr).toBe(0)
            expect(stats.avgHr).toBe(0)
            expect(stats.sdnn).toBe(0)
            expect(stats.rmssd).toBe(0)
        })
    })

    describe('duration', () => {
        it('calculates duration from first reading', async () => {
            calculator.addReading(70)

            // Wait a bit
            await new Promise(resolve => setTimeout(resolve, 100))

            const stats = calculator.getStats()
            expect(stats.duration).toBeGreaterThanOrEqual(0)
        })
    })
})
