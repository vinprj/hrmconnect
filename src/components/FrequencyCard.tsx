import { useState, memo } from 'react';
import { Info, X } from 'lucide-react';

interface FrequencyCardProps {
    lf: number;
    hf: number;
}

export const FrequencyCard = memo(function FrequencyCard({ lf, hf }: FrequencyCardProps) {
    const [isFlipped, setIsFlipped] = useState(false);

    const total = lf + hf || 1;
    const lfPercent = Math.min((lf / total) * 100, 100);
    const hfPercent = Math.min((hf / total) * 100, 100);

    return (
        <div className={`flip-card responsive-card ${isFlipped ? 'flipped' : ''}`} style={{ minHeight: '240px' }}>
            <div className="flip-card-inner">
                {/* Front */}
                <div className="flip-card-front glass-card">
                    <button
                        className="info-btn no-drag"
                        onClick={(e) => { e.stopPropagation(); setIsFlipped(true); }}
                        title="More Info"
                        aria-label="Show more information"
                    >
                        <Info size={16} />
                    </button>

                    <div style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        padding: 'clamp(1rem, 3cqw, 1.5rem)'
                    }}>
                        <h3 className="responsive-title uppercase tracking-wider text-slate-400" style={{ marginBottom: 'clamp(1rem, 3cqw, 1.5rem)' }}>
                            Frequency Domain
                        </h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(1rem, 3cqw, 1.5rem)' }}>
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <span className="responsive-unit text-slate-400" title="Low Frequency: Reflects activity of both sympathetic and parasympathetic nervous systems. Often associated with stress and physical activity.">Low Frequency (LF)</span>
                                    <span className="responsive-unit font-bold" style={{ color: 'var(--text-primary)' }}>{lf}</span>
                                </div>
                                <div style={{ height: 'clamp(6px, 2cqw, 8px)', background: 'var(--text-muted)', opacity: 0.3, borderRadius: '9999px', overflow: 'hidden' }}>
                                    <div
                                        style={{
                                            height: '100%',
                                            background: '#3b82f6',
                                            width: `${lfPercent}%`,
                                            transition: 'width 0.5s ease'
                                        }}
                                    />
                                </div>
                            </div>

                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <span className="responsive-unit" style={{ color: 'var(--text-secondary)' }} title="High Frequency: Primarily reflects parasympathetic (vagal) activity. Often associated with relaxation and calm.">High Frequency (HF)</span>
                                    <span className="responsive-unit font-bold" style={{ color: 'var(--text-primary)' }}>{hf}</span>
                                </div>
                                <div style={{ height: 'clamp(6px, 2cqw, 8px)', background: 'var(--text-muted)', opacity: 0.3, borderRadius: '9999px', overflow: 'hidden' }}>
                                    <div
                                        style={{
                                            height: '100%',
                                            background: '#a855f7',
                                            width: `${hfPercent}%`,
                                            transition: 'width 0.5s ease'
                                        }}
                                    />
                                </div>
                            </div>
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
                    <h3 className="responsive-title font-bold" style={{ marginBottom: 'clamp(0.5rem, 2cqw, 1rem)', color: 'var(--text-primary)' }}>
                        Frequency Analysis
                    </h3>
                    <p className="responsive-text" style={{ color: 'var(--text-secondary)' }}>
                        Think of this as analyzing the "rhythm" of your heartbeat variations.
                        <br /><br />
                        <strong style={{ color: '#3b82f6' }}>LF (Blue):</strong> Linked to stress and physical activity. Higher when you're alert or active.
                        <br /><br />
                        <strong style={{ color: '#a855f7' }}>HF (Purple):</strong> Linked to relaxation and breathing. Higher when you're calm and resting.
                    </p>
                </div>
            </div>
        </div>
    );
})
