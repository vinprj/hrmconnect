/**
 * Storage Service for HRM Connect
 *
 * Provides persistent storage for heart rate monitoring sessions using IndexedDB.
 * Supports saving, retrieving, and exporting session data including:
 * - Heart rate measurements over time
 * - RR intervals for HRV analysis
 * - Computed statistics (SDNN, RMSSD, etc.)
 * - Advanced metrics (stress index, frequency domain analysis)
 *
 * @module services/storage
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { SessionStats } from '../utils/stats';
import type { AdvancedStats } from '../utils/advancedStats';

/**
 * Represents a complete heart rate monitoring session.
 * Contains all data collected during a single monitoring period.
 */
export interface Session {
    /** Unique identifier for the session (timestamp + random string) */
    id: string;
    /** Unix timestamp when monitoring started */
    startTime: number;
    /** Unix timestamp when monitoring ended */
    endTime: number;
    /** Array of heart rate readings with timestamps */
    hrData: { time: number; hr: number }[];
    /** Array of RR intervals in milliseconds */
    rrIntervals: number[];
    /** Basic session statistics (min/max/avg HR, HRV metrics) */
    stats: SessionStats;
    /** Advanced analytics (stress index, frequency domain) */
    advancedStats: AdvancedStats;
    /** Type of session - regular monitoring or morning test */
    testType?: 'regular' | 'morning';
}

/**
 * Results from a Morning Readiness Test (orthostatic test).
 */
export interface MorningTestResult {
    /** Unique identifier */
    id?: string;
    /** Unix timestamp when test was taken */
    timestamp: number;
    /** Average heart rate while lying down */
    lyingAvgHr: number;
    /** Average heart rate while standing */
    standingAvgHr: number;
    /** Difference between standing and lying HR */
    hrDelta: number;
    /** RMSSD while lying down (parasympathetic activity) */
    lyingRMSSD: number;
    /** RMSSD while standing */
    standingRMSSD: number;
    /** Calculated readiness score (0-100) */
    readinessScore: number;
}

interface HRMConnectDB extends DBSchema {
    sessions: {
        key: string;
        value: Session;
        indexes: { 'by-start-time': number };
    };
    morningTests: {
        key: string;
        value: MorningTestResult;
        indexes: { 'by-timestamp': number };
    };
    settings: {
        key: string;
        value: unknown;
    };
}

const DB_NAME = 'hrm-connect';
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<HRMConnectDB>> | null = null;

function getDB(): Promise<IDBPDatabase<HRMConnectDB>> {
    if (!dbPromise) {
        dbPromise = openDB<HRMConnectDB>(DB_NAME, DB_VERSION, {
            upgrade(db) {
                // Sessions store
                if (!db.objectStoreNames.contains('sessions')) {
                    const sessionStore = db.createObjectStore('sessions', { keyPath: 'id' });
                    sessionStore.createIndex('by-start-time', 'startTime');
                }
                // Morning tests store
                if (!db.objectStoreNames.contains('morningTests')) {
                    const morningStore = db.createObjectStore('morningTests', { keyPath: 'id' });
                    morningStore.createIndex('by-timestamp', 'timestamp');
                }
                // Settings store
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings');
                }
            },
        });
    }
    return dbPromise;
}

// Generate unique ID
function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Saves a new monitoring session to the database.
 * @param session - Session data without ID (ID is auto-generated)
 * @returns The generated session ID
 */
export async function saveSession(session: Omit<Session, 'id'>): Promise<string> {
    const db = await getDB();
    const id = generateId();
    const fullSession: Session = { ...session, id };
    await db.put('sessions', fullSession);
    return id;
}

/**
 * Retrieves all saved sessions, sorted by most recent first.
 * @returns Array of sessions ordered by start time (descending)
 */
export async function getSessions(): Promise<Session[]> {
    const db = await getDB();
    const sessions = await db.getAllFromIndex('sessions', 'by-start-time');
    return sessions.reverse(); // Most recent first
}

/**
 * Retrieves a specific session by ID.
 * @param id - The session ID to retrieve
 * @returns The session if found, undefined otherwise
 */
export async function getSession(id: string): Promise<Session | undefined> {
    const db = await getDB();
    return db.get('sessions', id);
}

/**
 * Deletes a session from the database.
 * @param id - The session ID to delete
 */
export async function deleteSession(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('sessions', id);
}

/**
 * Deletes all sessions from the database. Use with caution.
 */
export async function clearAllSessions(): Promise<void> {
    const db = await getDB();
    await db.clear('sessions');
}

// Morning Test Operations

/**
 * Saves a morning test result to the database.
 * @param result - Morning test result data
 * @returns The generated test ID
 */
export async function saveMorningTest(result: Omit<MorningTestResult, 'id'>): Promise<string> {
    const db = await getDB();
    const id = generateId();
    const fullResult: MorningTestResult = { ...result, id };
    await db.put('morningTests', fullResult);
    return id;
}

/**
 * Retrieves all morning test results, sorted by most recent first.
 * @returns Array of morning test results ordered by timestamp (descending)
 */
export async function getMorningTests(): Promise<MorningTestResult[]> {
    const db = await getDB();
    const tests = await db.getAllFromIndex('morningTests', 'by-timestamp');
    return tests.reverse(); // Most recent first
}

/**
 * Retrieves a specific morning test by ID.
 * @param id - The test ID to retrieve
 * @returns The test result if found, undefined otherwise
 */
export async function getMorningTest(id: string): Promise<MorningTestResult | undefined> {
    const db = await getDB();
    return db.get('morningTests', id);
}

/**
 * Deletes a morning test from the database.
 * @param id - The test ID to delete
 */
export async function deleteMorningTest(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('morningTests', id);
}

// Settings Operations
export async function getSetting<T>(key: string): Promise<T | undefined> {
    const db = await getDB();
    return db.get('settings', key) as Promise<T | undefined>;
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
    const db = await getDB();
    await db.put('settings', value, key);
}

/**
 * Exports a session to CSV format for external analysis.
 * Includes summary statistics, heart rate data, and RR intervals.
 * @param session - The session to export
 * @returns CSV-formatted string ready for download
 */
export function exportSessionToCSV(session: Session): string {
    const lines: string[] = [];

    // Header
    lines.push('Session Export - HRM Connect');
    lines.push(`Start Time,${new Date(session.startTime).toLocaleString()}`);
    lines.push(`End Time,${new Date(session.endTime).toLocaleString()}`);
    lines.push(`Duration,${Math.floor((session.endTime - session.startTime) / 1000)} seconds`);
    lines.push('');

    // Summary Stats
    lines.push('Summary Statistics');
    lines.push(`Min HR,${session.stats.minHr} BPM`);
    lines.push(`Max HR,${session.stats.maxHr} BPM`);
    lines.push(`Avg HR,${session.stats.avgHr} BPM`);
    lines.push(`SDNN,${session.stats.sdnn} ms`);
    lines.push(`RMSSD,${session.stats.rmssd} ms`);
    lines.push(`pNN50,${session.advancedStats.pnn50.toFixed(1)}%`);
    lines.push(`Stress Index,${session.advancedStats.stressIndex}`);
    lines.push(`LF/HF Ratio,${session.advancedStats.lfHfRatio}`);
    lines.push('');

    // Heart Rate Data
    lines.push('Heart Rate Data');
    lines.push('Timestamp,Heart Rate (BPM)');
    session.hrData.forEach(point => {
        lines.push(`${new Date(point.time).toISOString()},${point.hr}`);
    });
    lines.push('');

    // RR Intervals
    lines.push('RR Intervals (ms)');
    lines.push('Index,RR Interval');
    session.rrIntervals.forEach((rr, i) => {
        lines.push(`${i + 1},${rr.toFixed(2)}`);
    });

    return lines.join('\n');
}

/**
 * Downloads content as a CSV file to the user's device.
 * @param content - The CSV content string
 * @param filename - The filename for the downloaded file (should end in .csv)
 */
export function downloadCSV(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
}
