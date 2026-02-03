import { X } from 'lucide-react';

interface TutorialModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function TutorialModal({ isOpen, onClose }: TutorialModalProps) {
    if (!isOpen) return null;

    return (
        <>
            <div
                onClick={onClose}
                style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 1040,
                    background: 'rgba(0, 0, 0, 0.6)',
                    backdropFilter: 'blur(4px)'
                }}
            />
            <div
                style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 1050,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1rem'
                }}
            >
                <div
                    className="glass-card"
                    style={{
                        width: '100%',
                        maxWidth: '42rem',
                        maxHeight: '80vh',
                        overflowY: 'auto',
                        background: 'var(--card-back-bg)'
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Understanding Your Heart Metrics</h2>
                        <button
                            onClick={onClose}
                            aria-label="Close tutorial"
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-secondary)',
                                fontSize: '1.5rem',
                                cursor: 'pointer',
                                padding: '0.25rem 0.5rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <X size={24} />
                        </button>
                    </div>

                    <div className="space-y-8">
                        <section>
                            <h3 className="text-xl font-semibold text-blue-400" style={{ marginBottom: '0.5rem' }}>
                                Heart Rate Variability (HRV)
                            </h3>
                            <p style={{ lineHeight: '1.7', color: 'var(--text-secondary)' }}>
                                Imagine your heart is like a car engine. A steady beat (low HRV) is like cruise control on a highway—efficient but rigid. A variable beat (high HRV) is like driving in the city—responsive and adaptable.
                                <br /><br />
                                <strong style={{ color: 'var(--text-primary)' }}>High HRV</strong> means your body is ready to handle stress and perform well.
                                <br />
                                <strong style={{ color: 'var(--text-primary)' }}>Low HRV</strong> suggests you might be tired, stressed, or recovering from a workout.
                            </p>
                        </section>

                        <section>
                            <h3 className="text-xl font-semibold text-yellow-400" style={{ marginBottom: '0.5rem' }}>
                                Stress Index
                            </h3>
                            <p style={{ lineHeight: '1.7', color: 'var(--text-secondary)' }}>
                                This measures how "rigid" your heart rhythm is. When you are stressed, your heart beats like a metronome (very steady). When you are relaxed, it's more chaotic.
                                <br /><br />
                                <strong>50-150:</strong> Normal Zone. Balanced.
                                <br />
                                <strong>&gt; 150:</strong> Stress Zone. Your body is working hard.
                                <br />
                                <strong>&lt; 50:</strong> Recovery Zone. Deep relaxation or sleep.
                            </p>
                        </section>

                        <section>
                            <h3 className="text-xl font-semibold text-purple-400" style={{ marginBottom: '0.5rem' }}>
                                LF/HF Ratio (Balance)
                            </h3>
                            <p style={{ lineHeight: '1.7', color: 'var(--text-secondary)' }}>
                                This is the battle between your "Fight or Flight" (Sympathetic) and "Rest and Digest" (Parasympathetic) systems.
                                <br /><br />
                                <strong>High Ratio (&gt; 2.0):</strong> Sympathetic dominance (Alert, Stressed, Active).
                                <br />
                                <strong>Low Ratio (&lt; 1.0):</strong> Parasympathetic dominance (Relaxed, Recovering).
                            </p>
                        </section>
                    </div>

                    <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                            onClick={onClose}
                            style={{ padding: '0.75rem 1.5rem' }}
                        >
                            Got it!
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
