import FFT from 'fft.js';

export interface AdvancedStats {
    pnn50: number; // Percentage of successive RR intervals > 50ms
    stressIndex: number; // Baevsky Stress Index
    lf: number; // Low Frequency Power
    hf: number; // High Frequency Power
    lfHfRatio: number; // Balance
    respirationRate: number; // Breaths per minute (derived from RSA)
}

export class AdvancedStatsCalculator {
    private rrIntervals: number[] = []; // In milliseconds

    // Cache for expensive FFT calculations (throttled to every 5 seconds)
    private cachedFrequencyDomain: { lf: number; hf: number; lfHfRatio: number; respirationRate: number } = {
        lf: 0, hf: 0, lfHfRatio: 0, respirationRate: 0
    };
    private lastFrequencyCalculation: number = 0;
    private readonly FREQUENCY_CALCULATION_INTERVAL_MS = 5000; // 5 seconds

    addRRIntervals(rrs: number[]) {
        this.rrIntervals.push(...rrs);
    }

    reset() {
        this.rrIntervals = [];
        this.cachedFrequencyDomain = { lf: 0, hf: 0, lfHfRatio: 0, respirationRate: 0 };
        this.lastFrequencyCalculation = 0;
    }

    calculate(): AdvancedStats {
        if (this.rrIntervals.length < 2) {
            return { pnn50: 0, stressIndex: 0, lf: 0, hf: 0, lfHfRatio: 0, respirationRate: 0 };
        }

        // Throttle expensive FFT calculations
        const now = Date.now();
        if (now - this.lastFrequencyCalculation > this.FREQUENCY_CALCULATION_INTERVAL_MS) {
            this.cachedFrequencyDomain = this.calculateFrequencyDomain();
            this.lastFrequencyCalculation = now;
        }

        return {
            pnn50: this.calculatePNN50(),
            stressIndex: this.calculateStressIndex(),
            ...this.cachedFrequencyDomain
        };
    }

    private calculatePNN50(): number {
        let nn50 = 0;
        for (let i = 1; i < this.rrIntervals.length; i++) {
            const diff = Math.abs(this.rrIntervals[i] - this.rrIntervals[i - 1]);
            if (diff > 50) nn50++;
        }
        return (nn50 / (this.rrIntervals.length - 1)) * 100;
    }

    private calculateStressIndex(): number {
        // Baevsky Stress Index (SI) = AMo / (2 * Mo * MxDMn)
        // AMo: Mode Amplitude (percent of intervals in the mode bin)
        // Mo: Mode (most frequent bin)
        // MxDMn: Max - Min difference (Variational Range)

        if (this.rrIntervals.length < 30) return 0; // Need some data

        // Create histogram with 50ms bins
        const binSize = 50;
        const bins: Record<number, number> = {};
        let minRR = Infinity;
        let maxRR = -Infinity;

        this.rrIntervals.forEach(rr => {
            if (rr < minRR) minRR = rr;
            if (rr > maxRR) maxRR = rr;

            // Round to nearest 50ms bin
            const bin = Math.round(rr / binSize) * binSize;
            bins[bin] = (bins[bin] || 0) + 1;
        });

        const total = this.rrIntervals.length;
        let maxCount = 0;
        let mode = 0;

        for (const [bin, count] of Object.entries(bins)) {
            if (count > maxCount) {
                maxCount = count;
                mode = Number(bin);
            }
        }

        const AMo = (maxCount / total) * 100; // Percent
        const Mo = mode / 1000; // Seconds
        const MxDMn = (maxRR - minRR) / 1000; // Seconds

        if (MxDMn === 0 || Mo === 0) return 0;

        return Math.round(AMo / (2 * Mo * MxDMn));
    }

    private calculateFrequencyDomain(): { lf: number, hf: number, lfHfRatio: number, respirationRate: number } {
        // Requires resampling to evenly spaced series (e.g., 4Hz)
        // This is a simplified approximation for real-time demo

        if (this.rrIntervals.length < 60) {
            return { lf: 0, hf: 0, lfHfRatio: 0, respirationRate: 0 };
        }

        // 1. Interpolate RR intervals to 4Hz (0.25s)
        const samplingRate = 4;
        const durationSec = this.rrIntervals.reduce((a, b) => a + b, 0) / 1000;
        const numSamples = Math.floor(durationSec * samplingRate);
        const interpolated: number[] = [];

        let rrIndex = 0;
        let currentRRStartTime = 0;

        for (let i = 0; i < numSamples; i++) {
            const t = i / samplingRate;

            // Find which RR interval covers time 't'
            while (rrIndex < this.rrIntervals.length && currentRRStartTime + (this.rrIntervals[rrIndex] / 1000) < t) {
                currentRRStartTime += (this.rrIntervals[rrIndex] / 1000);
                rrIndex++;
            }

            if (rrIndex < this.rrIntervals.length) {
                interpolated.push(this.rrIntervals[rrIndex]);
            }
        }

        // 2. Apply Window (Hamming) to reduce spectral leakage
        const windowed = interpolated.map((val, i) => {
            return val * (0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (interpolated.length - 1)));
        });

        // 3. FFT
        const n = 1024; // Power of 2
        // Zero padding
        const input = new Array(n).fill(0);
        for (let i = 0; i < windowed.length && i < n; i++) input[i] = windowed[i];

        const f = new FFT(n);
        const out = f.createComplexArray();
        f.realTransform(out, input);
        f.completeSpectrum(out);

        // 4. Integrate Bands
        // LF: 0.04 - 0.15 Hz
        // HF: 0.15 - 0.4 Hz
        const resolution = samplingRate / n;
        let lfPower = 0;
        let hfPower = 0;

        // For Respiration: Find peak frequency in HF band (0.15 - 0.4 Hz)
        // This corresponds to 9 - 24 breaths per minute
        let maxHfPower = 0;
        let peakHfFreq = 0;

        for (let i = 0; i < n / 2; i++) {
            const freq = i * resolution;
            // Magnitude squared
            const real = out[2 * i];
            const imag = out[2 * i + 1];
            const power = (real * real + imag * imag);

            if (freq >= 0.04 && freq < 0.15) lfPower += power;
            if (freq >= 0.15 && freq < 0.4) {
                hfPower += power;
                if (power > maxHfPower) {
                    maxHfPower = power;
                    peakHfFreq = freq;
                }
            }
        }

        const lfHfRatio = hfPower > 0 ? Math.round((lfPower / hfPower) * 100) / 100 : 0;

        // Convert peak frequency to Breaths Per Minute (BPM)
        // If no significant HF power, return 0
        const respirationRate = maxHfPower > 0 ? Math.round(peakHfFreq * 60) : 0;

        return {
            lf: Math.round(lfPower),
            hf: Math.round(hfPower),
            lfHfRatio,
            respirationRate
        };
    }
}
