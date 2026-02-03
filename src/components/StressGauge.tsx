import { useState, memo } from 'react';
import { motion } from 'framer-motion';
import { Info, X } from 'lucide-react';

interface StressGaugeProps {
    value: number;
}

export const StressGauge = memo(function StressGauge({ value }: StressGaugeProps) {
    const [isFlipped, setIsFlipped] = useState(false);
    const percentage = Math.min(Math.max((value / 500) * 100, 0), 100);

    let status = 'Normal';
    let color = '#22c55e';

    if (value < 50) {
        status = 'Recovery';
        color = '#22d3ee'; // accent-secondary
    } else if (value > 150 && value <= 300) {
        status = 'Elevated';
        color = '#fbbf24';
    } else if (value > 300) {
        status = 'High Stress';
        color = '#f87171';
    }

    const arcLength = (percentage / 100) * 283;

    return (
        <motion.div
            className={`flip-card responsive-card ${isFlipped ? 'flipped' : ''}`}
            style={{ minHeight: '240px' }}
            whileHover={{ scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
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
                        alignItems: 'center',
                        padding: 'clamp(1rem, 3cqw, 1.5rem)'
                    }}>
                        <h3 className="responsive-title uppercase tracking-wider" style={{ marginBottom: 'clamp(1rem, 3cqw, 1.5rem)', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
                            Stress Index
                        </h3>

                        <div style={{ position: 'relative', width: 'min(200px, 80cqw)', height: 'min(100px, 40cqw)', overflow: 'hidden' }}>
                            <svg width="100%" height="100%" viewBox="0 0 200 100" preserveAspectRatio="xMidYMid meet">
                                <path
                                    d="M 10 100 A 90 90 0 0 1 190 100"
                                    fill="none"
                                    stroke="rgba(255,255,255,0.08)"
                                    strokeWidth="14"
                                    strokeLinecap="round"
                                />
                                <motion.path
                                    d="M 10 100 A 90 90 0 0 1 190 100"
                                    fill="none"
                                    stroke={color}
                                    strokeWidth="14"
                                    strokeLinecap="round"
                                    initial={{ strokeDasharray: '0 283' }}
                                    animate={{ strokeDasharray: `${arcLength} 283` }}
                                    transition={{ duration: 0.8, ease: 'easeOut' }}
                                    style={{
                                        // Removed drop-shadow
                                    }}
                                />
                            </svg>
                        </div>

                        <div style={{ marginTop: 'clamp(0.5rem, 2cqw, 1rem)', textAlign: 'center' }}>
                            <motion.div
                                className="responsive-value font-bold"
                                style={{ color: 'var(--text-primary)' }}
                                key={Math.round(value)}
                                initial={{ opacity: 0.5, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.3 }}
                            >
                                {Math.round(value)}
                            </motion.div>
                            <div
                                className="responsive-unit font-semibold"
                                style={{ color, marginTop: '0.25rem' }}
                            >
                                {status}
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
                        Stress Index
                    </h3>
                    <p className="responsive-text" style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                        Measures heart rate rigidity. Stressed = very steady heartbeat. Relaxed = more natural variation.
                        <br /><br />
                        <strong style={{ color: '#22c55e' }}>50-150:</strong> Normal<br />
                        <strong style={{ color: '#fbbf24' }}>&gt;150:</strong> Elevated<br />
                        <strong style={{ color: '#22d3ee' }}>&lt;50:</strong> Recovery
                    </p>
                </div>
            </div>
        </motion.div>
    );
})
