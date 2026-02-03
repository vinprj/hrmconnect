import { useState, memo } from 'react';
import { motion } from 'framer-motion';
import { Info, X } from 'lucide-react';

interface StatCardProps {
    label: string;
    value: string | number;
    unit?: string;
    delay?: number;
    description?: string;
}

export const StatCard = memo(function StatCard({ label, value, unit, description }: StatCardProps) {
    const [isFlipped, setIsFlipped] = useState(false);

    return (
        <motion.div
            className={`flip-card responsive-card ${isFlipped ? 'flipped' : ''}`}
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
                        position: 'relative',
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        padding: 'clamp(1rem, 3cqw, 1.5rem)'
                    }}>
                        <h3 className="responsive-title uppercase tracking-wider text-slate-400" style={{ marginBottom: '0.5rem', letterSpacing: '0.1em' }}>
                            {label}
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                            <motion.span
                                className="responsive-value font-bold"
                                style={{
                                    background: 'linear-gradient(135deg, var(--accent-secondary), var(--accent-primary))',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text'
                                }}
                                key={String(value)}
                                initial={{ opacity: 0.5, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.3 }}
                            >
                                {value}
                            </motion.span>
                            {unit && <span className="responsive-unit" style={{ color: 'var(--text-muted)' }}>{unit}</span>}
                        </div>
                    </div>
                </div>

                {/* Back */}
                <div className="flip-card-back">
                    <button
                        className="info-btn no-drag"
                        onClick={(e) => { e.stopPropagation(); setIsFlipped(false); }}
                        title="Close"
                        aria-label="Close information"
                    >
                        <X size={16} />
                    </button>
                    <h3 className="responsive-title font-bold" style={{ marginBottom: 'clamp(0.5rem, 2cqw, 1rem)', color: 'var(--text-primary)' }}>
                        {label}
                    </h3>
                    <p className="responsive-text" style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                        {description || "No description available."}
                    </p>
                </div>
            </div>
        </motion.div>
    );
})
