export interface SessionStats {
    minHr: number;
    maxHr: number;
    avgHr: number;
    sdnn: number; // Standard deviation of NN intervals (HRV)
    rmssd: number; // Root mean square of successive differences (HRV)
    duration: number; // Seconds
}

export class StatsCalculator {
    private heartRates: number[] = [];
    private rrIntervals: number[] = []; // In milliseconds
    private startTime: number = 0;

    reset() {
        this.heartRates = [];
        this.rrIntervals = [];
        this.startTime = Date.now();
    }

    addReading(hr: number, rrs?: number[]) {
        if (this.heartRates.length === 0) {
            this.startTime = Date.now();
        }
        this.heartRates.push(hr);
        if (rrs) {
            this.rrIntervals.push(...rrs);
        }
    }

    getStats(): SessionStats {
        if (this.heartRates.length === 0) {
            return {
                minHr: 0,
                maxHr: 0,
                avgHr: 0,
                sdnn: 0,
                rmssd: 0,
                duration: 0
            };
        }

        const minHr = Math.min(...this.heartRates);
        const maxHr = Math.max(...this.heartRates);
        const avgHr = Math.round(this.heartRates.reduce((a, b) => a + b, 0) / this.heartRates.length);
        const duration = Math.floor((Date.now() - this.startTime) / 1000);

        // HRV Calculations
        let sdnn = 0;
        let rmssd = 0;

        if (this.rrIntervals.length > 1) {
            // SDNN
            const meanRR = this.rrIntervals.reduce((a, b) => a + b, 0) / this.rrIntervals.length;
            const squaredDiffs = this.rrIntervals.map(rr => Math.pow(rr - meanRR, 2));
            const variance = squaredDiffs.reduce((a, b) => a + b, 0) / this.rrIntervals.length;
            sdnn = Math.round(Math.sqrt(variance));

            // RMSSD
            let sumSquaredDiffs = 0;
            for (let i = 1; i < this.rrIntervals.length; i++) {
                const diff = this.rrIntervals[i] - this.rrIntervals[i - 1];
                sumSquaredDiffs += Math.pow(diff, 2);
            }
            rmssd = Math.round(Math.sqrt(sumSquaredDiffs / (this.rrIntervals.length - 1)));
        }

        return {
            minHr,
            maxHr,
            avgHr,
            sdnn,
            rmssd,
            duration
        };
    }
}
