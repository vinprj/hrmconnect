/**
 * Heart Rate Training Zones Calculator
 * Uses the Karvonen formula: Max HR = 220 - Age
 * 
 * Zone 1: 50-60% (Very Light - Warm-up/Recovery)
 * Zone 2: 60-70% (Light - Fat Burn)
 * Zone 3: 70-80% (Moderate - Aerobic/Cardio)
 * Zone 4: 80-90% (Hard - Anaerobic/Threshold)
 * Zone 5: 90-100% (Maximum - Peak Performance)
 */

export interface Zone {
    number: 1 | 2 | 3 | 4 | 5;
    name: string;
    description: string;
    minPercent: number;
    maxPercent: number;
    color: string;
}

export const ZONES: Zone[] = [
    { number: 1, name: 'Recovery', description: 'Warm-up, cool-down', minPercent: 50, maxPercent: 60, color: '#94a3b8' },
    { number: 2, name: 'Fat Burn', description: 'Light effort, fat burning', minPercent: 60, maxPercent: 70, color: '#22c55e' },
    { number: 3, name: 'Cardio', description: 'Moderate effort, aerobic', minPercent: 70, maxPercent: 80, color: '#eab308' },
    { number: 4, name: 'Threshold', description: 'Hard effort, anaerobic', minPercent: 80, maxPercent: 90, color: '#f97316' },
    { number: 5, name: 'Peak', description: 'Maximum effort', minPercent: 90, maxPercent: 100, color: '#ef4444' },
];

export interface ZoneInfo {
    zone: Zone;
    hrMin: number;
    hrMax: number;
    percentOfMax: number;
}

/**
 * Calculate max heart rate using age
 * @param age User's age in years
 * @returns Estimated maximum heart rate
 */
export function getMaxHR(age: number): number {
    return 220 - age;
}

/**
 * Get HR range for a specific zone
 */
export function getZoneHRRange(zone: Zone, maxHR: number): { min: number; max: number } {
    return {
        min: Math.round(maxHR * (zone.minPercent / 100)),
        max: Math.round(maxHR * (zone.maxPercent / 100)),
    };
}

/**
 * Get all zones with HR ranges for a given age
 */
export function getZonesWithHRRanges(age: number): (Zone & { hrMin: number; hrMax: number })[] {
    const maxHR = getMaxHR(age);
    return ZONES.map(zone => {
        const range = getZoneHRRange(zone, maxHR);
        return {
            ...zone,
            hrMin: range.min,
            hrMax: range.max,
        };
    });
}

/**
 * Determine which zone a heart rate falls into
 * @param hr Current heart rate
 * @param age User's age
 * @returns Zone information or null if below Zone 1
 */
export function getCurrentZone(hr: number, age: number): ZoneInfo | null {
    const maxHR = getMaxHR(age);
    const percentOfMax = (hr / maxHR) * 100;

    // Below Zone 1
    if (percentOfMax < 50) {
        return null;
    }

    // Find matching zone
    for (const zone of ZONES) {
        if (percentOfMax >= zone.minPercent && percentOfMax < zone.maxPercent) {
            const range = getZoneHRRange(zone, maxHR);
            return {
                zone,
                hrMin: range.min,
                hrMax: range.max,
                percentOfMax: Math.round(percentOfMax),
            };
        }
    }

    // Above Zone 5 max (100%+)
    const zone5 = ZONES[4];
    const range = getZoneHRRange(zone5, maxHR);
    return {
        zone: zone5,
        hrMin: range.min,
        hrMax: range.max,
        percentOfMax: Math.round(percentOfMax),
    };
}

/**
 * Get a color that interpolates between zones based on HR
 */
export function getZoneColor(hr: number, age: number): string {
    const zoneInfo = getCurrentZone(hr, age);
    if (!zoneInfo) {
        return '#64748b'; // Gray for below Zone 1
    }
    return zoneInfo.zone.color;
}

/**
 * Default age if not provided
 */
export const DEFAULT_AGE = 30;
