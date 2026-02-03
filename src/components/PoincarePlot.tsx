import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Info, X } from 'lucide-react';
import { useState, useMemo, memo } from 'react';

interface PoincarePlotProps {
    rrIntervals: number[];
}

export const PoincarePlot = memo(function PoincarePlot({ rrIntervals }: PoincarePlotProps) {
    const [isFlipped, setIsFlipped] = useState(false);

    // Calculate Metrics
    const { data, sd1, sd2, ratio, shape } = useMemo(() => {
        // We only take the last 500 points to keep performance high
        const recentRRs = rrIntervals.slice(-500);

        // Prepare data for plot
        const plotData = recentRRs.slice(0, -1).map((rr, i) => ({
            x: rr,
            y: recentRRs[i + 1]
        }));

        if (recentRRs.length < 20) {
            return { data: plotData, sd1: 0, sd2: 0, ratio: 0, shape: 'Gathering Data...' };
        }

        // Calculate SD1 and SD2
        // SD1^2 = 0.5 * Var(RR_n+1 - RR_n)
        // SD2^2 = 0.5 * Var(RR_n+1 + RR_n)

        const diffs = [];
        const sums = [];
        for (let i = 0; i < recentRRs.length - 1; i++) {
            diffs.push(recentRRs[i + 1] - recentRRs[i]);
            sums.push(recentRRs[i + 1] + recentRRs[i]);
        }

        const variance = (arr: number[]) => {
            const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
            return arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / arr.length;
        };

        const varDiff = variance(diffs);
        const varSum = variance(sums);

        const sd1Val = Math.sqrt(varDiff * 0.5);
        const sd2Val = Math.sqrt(varSum * 0.5);
        const ratioVal = sd1Val > 0 ? sd2Val / sd1Val : 0;

        let shapeDesc = 'Analyzing...';
        if (sd1Val < 20) shapeDesc = 'Low HRV (Stress)';
        else if (ratioVal > 1.5) shapeDesc = 'Torpedo (Healthy)';
        else shapeDesc = 'Fan/Round (Irregular)';

        return {
            data: plotData,
            sd1: Math.round(sd1Val),
            sd2: Math.round(sd2Val),
            ratio: ratioVal.toFixed(2),
            shape: shapeDesc
        };
    }, [rrIntervals]);

    return (
        <div className={`flip-card responsive-card ${isFlipped ? 'flipped' : ''}`}>
            <div className="flip-card-inner">
                {/* Front */}
                <div className="flip-card-front glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem', padding: '0 0.5rem' }}>
                        <div>
                            <h3 className="text-slate-400 font-medium text-sm uppercase tracking-wider">Poincaré Plot</h3>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="text-xs font-bold text-white px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                    {shape}
                                </span>
                            </div>
                        </div>
                        <button
                            className="info-btn no-drag"
                            onClick={(e) => { e.stopPropagation(); setIsFlipped(true); }}
                            title="More Info"
                            aria-label="Show more information"
                        >
                            <Info size={16} />
                        </button>
                    </div>

                    <div style={{ flex: 1, width: '100%', minHeight: 0, position: 'relative' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis
                                    type="number"
                                    dataKey="x"
                                    name="RRn"
                                    unit="ms"
                                    stroke="#94a3b8"
                                    domain={['dataMin - 50', 'dataMax + 50']}
                                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    type="number"
                                    dataKey="y"
                                    name="RRn+1"
                                    unit="ms"
                                    stroke="#94a3b8"
                                    domain={['dataMin - 50', 'dataMax + 50']}
                                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                                    tickLine={false}
                                    axisLine={false}
                                    width={30}
                                />
                                <Tooltip
                                    cursor={{ strokeDasharray: '3 3' }}
                                    contentStyle={{
                                        backgroundColor: 'var(--card-bg)',
                                        border: '1px solid var(--card-border)',
                                        borderRadius: '8px',
                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                        color: 'var(--text-primary)'
                                    }}
                                    itemStyle={{ color: 'var(--text-primary)' }}
                                    labelStyle={{ color: 'var(--text-secondary)' }}
                                />
                                <Scatter name="RR Intervals" data={data} fill="#8884d8" fillOpacity={0.6} />
                            </ScatterChart>
                        </ResponsiveContainer>

                        {/* Metrics Overlay */}
                        <div style={{
                            position: 'absolute',
                            bottom: 10,
                            right: 10,
                            background: 'var(--card-bg)',
                            backdropFilter: 'blur(4px)',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            border: '1px solid var(--card-border)',
                            fontSize: '0.7rem',
                            color: 'var(--text-secondary)',
                            display: 'flex',
                            gap: '8px'
                        }}>
                            <span>SD1: <strong style={{ color: 'var(--text-primary)' }}>{sd1}</strong></span>
                            <span>SD2: <strong style={{ color: 'var(--text-primary)' }}>{sd2}</strong></span>
                        </div>
                    </div>
                </div>

                {/* Back */}
                <div className="flip-card-back" style={{ background: 'var(--card-back-bg)' }}>
                    <button
                        className="info-btn no-drag"
                        onClick={(e) => { e.stopPropagation(); setIsFlipped(false); }}
                        title="Close"
                        aria-label="Close information"
                    >
                        <X size={16} />
                    </button>
                    <div style={{ padding: '1rem', width: '100%' }}>
                        <h3 className="text-lg font-bold mb-3" style={{ color: 'var(--text-primary)' }}>Poincaré Analysis</h3>
                        <p className="text-xs leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
                            Visualizes the correlation between consecutive heartbeats.
                        </p>
                        <div className="text-left space-y-2 text-xs p-3 rounded-lg border" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}>
                            <div className="flex justify-between">
                                <span>SD1 (Short-term):</span>
                                <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{sd1} ms</span>
                            </div>
                            <div className="flex justify-between">
                                <span>SD2 (Long-term):</span>
                                <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{sd2} ms</span>
                            </div>
                            <div className="flex justify-between border-t pt-1 mt-1" style={{ borderColor: 'var(--card-border)' }}>
                                <span>Ratio (SD2/SD1):</span>
                                <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{ratio}</span>
                            </div>
                        </div>
                        <div className="mt-3 text-left">
                            <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>Interpretation</p>
                            <ul className="text-xs space-y-1 list-disc pl-3" style={{ color: 'var(--text-secondary)' }}>
                                <li><strong>Torpedo:</strong> Healthy, good variability.</li>
                                <li><strong>Fan:</strong> Potential arrhythmia.</li>
                                <li><strong>Cluster:</strong> High stress / exertion.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
})
