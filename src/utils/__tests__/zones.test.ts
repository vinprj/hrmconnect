import { describe, it, expect } from 'vitest'
import {
    getMaxHR,
    getZoneHRRange,
    getZonesWithHRRanges,
    getCurrentZone,
    getZoneColor,
    ZONES,
    DEFAULT_AGE
} from '../zones'

describe('zones', () => {
    describe('getMaxHR', () => {
        it('calculates max HR using 220 - age formula', () => {
            expect(getMaxHR(30)).toBe(190)
            expect(getMaxHR(40)).toBe(180)
            expect(getMaxHR(20)).toBe(200)
        })

        it('handles edge case ages', () => {
            expect(getMaxHR(1)).toBe(219)
            expect(getMaxHR(120)).toBe(100)
        })
    })

    describe('getZoneHRRange', () => {
        it('calculates correct HR range for Zone 1 (50-60%)', () => {
            const zone1 = ZONES[0]
            const maxHR = 200

            const range = getZoneHRRange(zone1, maxHR)
            expect(range.min).toBe(100) // 200 * 0.50
            expect(range.max).toBe(120) // 200 * 0.60
        })

        it('calculates correct HR range for Zone 5 (90-100%)', () => {
            const zone5 = ZONES[4]
            const maxHR = 200

            const range = getZoneHRRange(zone5, maxHR)
            expect(range.min).toBe(180) // 200 * 0.90
            expect(range.max).toBe(200) // 200 * 1.00
        })

        it('rounds HR values to integers', () => {
            const zone1 = ZONES[0]
            const maxHR = 185 // Will produce non-integer percentages

            const range = getZoneHRRange(zone1, maxHR)
            expect(Number.isInteger(range.min)).toBe(true)
            expect(Number.isInteger(range.max)).toBe(true)
        })
    })

    describe('getZonesWithHRRanges', () => {
        it('returns all 5 zones with HR ranges', () => {
            const zones = getZonesWithHRRanges(30)
            expect(zones).toHaveLength(5)
        })

        it('calculates correct ranges for age 30 (max HR = 190)', () => {
            const zones = getZonesWithHRRanges(30)

            // Zone 1: 50-60% of 190 = 95-114
            expect(zones[0].hrMin).toBe(95)
            expect(zones[0].hrMax).toBe(114)

            // Zone 5: 90-100% of 190 = 171-190
            expect(zones[4].hrMin).toBe(171)
            expect(zones[4].hrMax).toBe(190)
        })

        it('preserves zone metadata', () => {
            const zones = getZonesWithHRRanges(30)

            expect(zones[0].name).toBe('Recovery')
            expect(zones[1].name).toBe('Fat Burn')
            expect(zones[2].name).toBe('Cardio')
            expect(zones[3].name).toBe('Threshold')
            expect(zones[4].name).toBe('Peak')
        })
    })

    describe('getCurrentZone', () => {
        const age = 30 // Max HR = 190

        it('returns null when HR is below Zone 1 (< 50%)', () => {
            const result = getCurrentZone(90, age) // ~47% of 190
            expect(result).toBeNull()
        })

        it('returns Zone 1 for HR in 50-60% range', () => {
            const result = getCurrentZone(100, age) // ~53% of 190
            expect(result).not.toBeNull()
            expect(result!.zone.number).toBe(1)
        })

        it('returns Zone 2 for HR in 60-70% range', () => {
            const result = getCurrentZone(125, age) // ~66% of 190
            expect(result).not.toBeNull()
            expect(result!.zone.number).toBe(2)
        })

        it('returns Zone 3 for HR in 70-80% range', () => {
            const result = getCurrentZone(145, age) // ~76% of 190
            expect(result).not.toBeNull()
            expect(result!.zone.number).toBe(3)
        })

        it('returns Zone 4 for HR in 80-90% range', () => {
            const result = getCurrentZone(165, age) // ~87% of 190
            expect(result).not.toBeNull()
            expect(result!.zone.number).toBe(4)
        })

        it('returns Zone 5 for HR in 90-100% range', () => {
            const result = getCurrentZone(180, age) // ~95% of 190
            expect(result).not.toBeNull()
            expect(result!.zone.number).toBe(5)
        })

        it('returns Zone 5 for HR above max (> 100%)', () => {
            const result = getCurrentZone(200, age) // ~105% of 190
            expect(result).not.toBeNull()
            expect(result!.zone.number).toBe(5)
            expect(result!.percentOfMax).toBeGreaterThan(100)
        })

        it('calculates correct percentOfMax', () => {
            const result = getCurrentZone(152, age) // 80% of 190
            expect(result).not.toBeNull()
            expect(result!.percentOfMax).toBe(80)
        })

        it('includes correct HR range in result', () => {
            const result = getCurrentZone(140, age)
            expect(result).not.toBeNull()
            expect(result!.hrMin).toBeDefined()
            expect(result!.hrMax).toBeDefined()
        })
    })

    describe('getZoneColor', () => {
        const age = 30

        it('returns gray for HR below Zone 1', () => {
            const color = getZoneColor(80, age)
            expect(color).toBe('#64748b')
        })

        it('returns zone-specific color for valid HR', () => {
            // Zone 1 (Recovery) color
            const color1 = getZoneColor(100, age)
            expect(color1).toBe('#94a3b8')

            // Zone 5 (Peak) color
            const color5 = getZoneColor(180, age)
            expect(color5).toBe('#ef4444')
        })
    })

    describe('DEFAULT_AGE', () => {
        it('is set to 30', () => {
            expect(DEFAULT_AGE).toBe(30)
        })
    })

    describe('ZONES constant', () => {
        it('has 5 zones', () => {
            expect(ZONES).toHaveLength(5)
        })

        it('zones have correct percentage ranges', () => {
            expect(ZONES[0].minPercent).toBe(50)
            expect(ZONES[0].maxPercent).toBe(60)
            expect(ZONES[4].minPercent).toBe(90)
            expect(ZONES[4].maxPercent).toBe(100)
        })

        it('zones have sequential numbers 1-5', () => {
            ZONES.forEach((zone, index) => {
                expect(zone.number).toBe(index + 1)
            })
        })
    })
})
