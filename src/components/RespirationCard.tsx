import { Wind, Info, X } from 'lucide-react';
import { useState, memo } from 'react';
import { motion } from 'framer-motion';

interface RespirationCardProps {
    rate: number; // Breaths per minute
}

export const RespirationCard = memo(function RespirationCard({ rate }: RespirationCardProps) {
    const [isFlipped, setIsFlipped] = useState(false);



    return (
        <div className={`flip-card responsive-card ${isFlipped ? 'flipped' : ''}`}>
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
                        <div className="flex items-center gap-2 mb-2">
                            <motion.div
                                animate={rate > 0 ? {
                                    scale: [1, 1.2, 1],
                                    opacity: [0.5, 1, 0.5]
                                } : {}}
                                transition={{
                                    duration: rate > 0 ? (60 / rate) : 4,
                                    repeat: Infinity,
                                    ease: "easeInOut"
                                }}
                            >
                                <Wind size={20} className="text-cyan-400" />
                            </motion.div>
                            <h3 className="responsive-title uppercase tracking-wider text-slate-400">
                                Respiration
                            </h3>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                            <span className="responsive-value font-bold" style={{ color: 'var(--text-primary)' }}>
                                {rate > 0 ? rate : '--'}
                            </span>
                            <span className="responsive-unit text-slate-400">Br/Min</span>
                        </div>

                        {rate > 0 && (
                            <div className="mt-2 text-xs text-cyan-300/80">
                                {rate < 12 ? 'Slow / Relaxed' : rate > 20 ? 'Fast / Active' : 'Normal'}
                            </div>
                        )}
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
                        <h3 className="text-lg font-bold mb-3" style={{ color: 'var(--text-primary)' }}>Respiration Rate</h3>
                        <p className="text-xs leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
                            Estimated from Heart Rate Variability (RSA). When you inhale, your heart rate speeds up; when you exhale, it slows down.
                        </p>
                        <div className="text-left space-y-2 text-xs p-3 rounded-lg border" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}>
                            <div className="flex justify-between">
                                <span>Normal (Rest):</span>
                                <span className="font-mono" style={{ color: 'var(--text-primary)' }}>12-20</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Relaxed:</span>
                                <span className="font-mono" style={{ color: 'var(--text-primary)' }}>&lt; 12</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Active/Stress:</span>
                                <span className="font-mono" style={{ color: 'var(--text-primary)' }}>&gt; 20</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <style>{`
                @keyframes breathe {
                    0%, 100% { transform: scale(1); opacity: 0.5; }
                    50% { transform: scale(1.2); opacity: 0.8; }
                }
            `}</style>
        </div>
    );
})
