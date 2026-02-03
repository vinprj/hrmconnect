import { describe, it, expect, vi } from 'vitest'
import { exportSessionToCSV } from '../storage'
import type { Session } from '../storage'

// Mock idb module since we can't use IndexedDB in tests easily
vi.mock('idb', () => ({
    openDB: vi.fn()
}))

describe('storage', () => {
    // Create a sample session for testing
    const createSampleSession = (overrides: Partial<Session> = {}): Session => ({
        id: 'test-session-123',
        startTime: 1700000000000, // Fixed timestamp
        endTime: 1700000300000, // 5 minutes later
        hrData: [
            { time: 1700000000000, hr: 70 },
            { time: 1700000001000, hr: 72 },
            { time: 1700000002000, hr: 75 }
        ],
        rrIntervals: [857.14, 833.33, 800.00],
        stats: {
            minHr: 70,
            maxHr: 75,
            avgHr: 72,
            sdnn: 25,
            rmssd: 28,
            duration: 300
        },
        advancedStats: {
            pnn50: 15.5,
            stressIndex: 42,
            lf: 150,
            hf: 200,
            lfHfRatio: 0.75,
            respirationRate: 14
        },
        ...overrides
    })

    describe('exportSessionToCSV', () => {
        it('includes session header information', () => {
            const session = createSampleSession()
            const csv = exportSessionToCSV(session)

            expect(csv).toContain('Session Export - HRM Connect')
            expect(csv).toContain('Start Time')
            expect(csv).toContain('End Time')
            expect(csv).toContain('Duration')
        })

        it('includes summary statistics', () => {
            const session = createSampleSession()
            const csv = exportSessionToCSV(session)

            expect(csv).toContain('Summary Statistics')
            expect(csv).toContain('Min HR,70 BPM')
            expect(csv).toContain('Max HR,75 BPM')
            expect(csv).toContain('Avg HR,72 BPM')
            expect(csv).toContain('SDNN,25 ms')
            expect(csv).toContain('RMSSD,28 ms')
            expect(csv).toContain('pNN50,15.5%')
            expect(csv).toContain('Stress Index,42')
            expect(csv).toContain('LF/HF Ratio,0.75')
        })

        it('includes heart rate data section', () => {
            const session = createSampleSession()
            const csv = exportSessionToCSV(session)

            expect(csv).toContain('Heart Rate Data')
            expect(csv).toContain('Timestamp,Heart Rate (BPM)')
            // Check that HR values are present
            expect(csv).toContain(',70')
            expect(csv).toContain(',72')
            expect(csv).toContain(',75')
        })

        it('includes RR intervals section', () => {
            const session = createSampleSession()
            const csv = exportSessionToCSV(session)

            expect(csv).toContain('RR Intervals (ms)')
            expect(csv).toContain('Index,RR Interval')
            // Check that RR values are present (with 2 decimal places)
            expect(csv).toContain('1,857.14')
            expect(csv).toContain('2,833.33')
            expect(csv).toContain('3,800.00')
        })

        it('formats timestamps as ISO strings', () => {
            const session = createSampleSession()
            const csv = exportSessionToCSV(session)

            // Should contain ISO format timestamps
            expect(csv).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
        })

        it('handles empty HR data array', () => {
            const session = createSampleSession({ hrData: [] })
            const csv = exportSessionToCSV(session)

            expect(csv).toContain('Heart Rate Data')
            expect(csv).toContain('Timestamp,Heart Rate (BPM)')
            // Should still produce valid CSV without crashing
            expect(csv).toBeDefined()
        })

        it('handles empty RR intervals array', () => {
            const session = createSampleSession({ rrIntervals: [] })
            const csv = exportSessionToCSV(session)

            expect(csv).toContain('RR Intervals (ms)')
            expect(csv).toContain('Index,RR Interval')
            // Should still produce valid CSV without crashing
            expect(csv).toBeDefined()
        })

        it('produces valid CSV format with newlines', () => {
            const session = createSampleSession()
            const csv = exportSessionToCSV(session)

            // Should have multiple lines
            const lines = csv.split('\n')
            expect(lines.length).toBeGreaterThan(10)

            // No empty sections at the start
            expect(lines[0]).toBe('Session Export - HRM Connect')
        })

        it('calculates duration correctly', () => {
            const session = createSampleSession({
                startTime: 1700000000000,
                endTime: 1700000300000 // 300 seconds = 5 minutes
            })
            const csv = exportSessionToCSV(session)

            expect(csv).toContain('Duration,300 seconds')
        })

        it('includes all required CSV sections in order', () => {
            const session = createSampleSession()
            const csv = exportSessionToCSV(session)

            // Get positions of each section
            const headerPos = csv.indexOf('Session Export - HRM Connect')
            const statsPos = csv.indexOf('Summary Statistics')
            const hrDataPos = csv.indexOf('Heart Rate Data')
            const rrDataPos = csv.indexOf('RR Intervals (ms)')

            // Sections should appear in order
            expect(headerPos).toBeLessThan(statsPos)
            expect(statsPos).toBeLessThan(hrDataPos)
            expect(hrDataPos).toBeLessThan(rrDataPos)
        })
    })

    describe('Session interface', () => {
        it('session has all required fields', () => {
            const session = createSampleSession()

            expect(session.id).toBeDefined()
            expect(session.startTime).toBeDefined()
            expect(session.endTime).toBeDefined()
            expect(session.hrData).toBeDefined()
            expect(session.rrIntervals).toBeDefined()
            expect(session.stats).toBeDefined()
            expect(session.advancedStats).toBeDefined()
        })
    })
})
