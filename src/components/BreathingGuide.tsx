import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw } from 'lucide-react';

type BreathingPreset = 'box' | '4-7-8' | 'coherence';

interface BreathingPattern {
    name: string;
    inhale: number;
    hold1: number;
    exhale: number;
    hold2: number;
    description: string;
}

const PATTERNS: Record<BreathingPreset, BreathingPattern> = {
    box: {
        name: 'Box Breathing',
        inhale: 4,
        hold1: 4,
        exhale: 4,
        hold2: 4,
        description: 'Equal phases for calm & focus'
    },
    '4-7-8': {
        name: '4-7-8 Relaxing',
        inhale: 4,
        hold1: 7,
        exhale: 8,
        hold2: 0,
        description: 'Deep relaxation & sleep'
    },
    coherence: {
        name: 'Coherence',
        inhale: 5,
        hold1: 0,
        exhale: 5,
        hold2: 0,
        description: 'HRV optimization (6 BPM)'
    }
};

type Phase = 'inhale' | 'hold1' | 'exhale' | 'hold2' | 'idle';

const PHASE_LABELS: Record<Phase, string> = {
    inhale: 'Breathe In',
    hold1: 'Hold',
    exhale: 'Breathe Out',
    hold2: 'Hold',
    idle: 'Ready'
};

const PHASE_COLORS: Record<Phase, string> = {
    inhale: '#22c55e',
    hold1: '#eab308',
    exhale: '#3b82f6',
    hold2: '#eab308',
    idle: '#64748b'
};

export function BreathingGuide() {
    const [preset, setPreset] = useState<BreathingPreset>('coherence');
    const [isRunning, setIsRunning] = useState(false);
    const [phase, setPhase] = useState<Phase>('idle');
    const [countdown, setCountdown] = useState(0);
    const [cycleCount, setCycleCount] = useState(0);

    const pattern = PATTERNS[preset];


    useEffect(() => {
        if (!isRunning) {
            setPhase('idle');
            setCountdown(0);
            return;
        }

        let timeInPhase = 0;
        let currentPhase: Phase = 'inhale';
        setPhase('inhale');
        setCountdown(pattern.inhale);

        const interval = setInterval(() => {
            timeInPhase++;

            // Determine current phase and time remaining
            let phaseDuration = 0;
            if (currentPhase === 'inhale') phaseDuration = pattern.inhale;
            else if (currentPhase === 'hold1') phaseDuration = pattern.hold1;
            else if (currentPhase === 'exhale') phaseDuration = pattern.exhale;
            else if (currentPhase === 'hold2') phaseDuration = pattern.hold2;

            const remaining = phaseDuration - timeInPhase;
            setCountdown(remaining);

            if (remaining <= 0) {
                // Move to next phase
                timeInPhase = 0;
                if (currentPhase === 'inhale') {
                    currentPhase = pattern.hold1 > 0 ? 'hold1' : 'exhale';
                } else if (currentPhase === 'hold1') {
                    currentPhase = 'exhale';
                } else if (currentPhase === 'exhale') {
                    currentPhase = pattern.hold2 > 0 ? 'hold2' : 'inhale';
                    if (pattern.hold2 === 0) {
                        setCycleCount(prev => prev + 1);
                    }
                } else if (currentPhase === 'hold2') {
                    currentPhase = 'inhale';
                    setCycleCount(prev => prev + 1);
                }
                setPhase(currentPhase);

                // Set countdown for new phase
                if (currentPhase === 'inhale') setCountdown(pattern.inhale);
                else if (currentPhase === 'hold1') setCountdown(pattern.hold1);
                else if (currentPhase === 'exhale') setCountdown(pattern.exhale);
                else if (currentPhase === 'hold2') setCountdown(pattern.hold2);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [isRunning, preset, pattern]);

    const reset = () => {
        setIsRunning(false);
        setPhase('idle');
        setCountdown(0);
        setCycleCount(0);
    };

    // Calculate scale for the breathing circle
    const getScale = () => {
        if (phase === 'inhale') return 1.3;
        if (phase === 'exhale') return 0.8;
        return 1.0; // hold phases
    };

    return (
        <div style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            padding: '1rem'
        }}>
            {/* Preset Selector */}
            <div style={{
                display: 'flex',
                gap: '0.5rem',
                marginBottom: '1rem',
                flexWrap: 'wrap'
            }}>
                {(Object.keys(PATTERNS) as BreathingPreset[]).map(p => (
                    <button
                        key={p}
                        onClick={() => { setPreset(p); reset(); }}
                        className={`no-drag ${preset === p ? '' : 'btn-secondary'}`}
                        style={{
                            padding: '0.35rem 0.85rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                    >
                        {PATTERNS[p].name}
                    </button>
                ))}
            </div>

            {/* Breathing Animation */}
            <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative'
            }}>
                {/* Outer ring */}
                <motion.div
                    style={{
                        width: '140px',
                        height: '140px',
                        borderRadius: '50%',
                        border: '3px solid',
                        borderColor: PHASE_COLORS[phase],
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative'
                    }}
                    animate={{
                        scale: getScale(),
                        borderColor: PHASE_COLORS[phase]
                    }}
                    transition={{
                        scale: {
                            duration: phase === 'inhale' ? pattern.inhale :
                                phase === 'exhale' ? pattern.exhale : 0.3,
                            ease: 'easeInOut'
                        }
                    }}
                >
                    {/* Inner content */}
                    <div style={{ textAlign: 'center' }}>
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={phase}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                style={{
                                    color: PHASE_COLORS[phase],
                                    fontWeight: 600,
                                    fontSize: '0.875rem',
                                    marginBottom: '0.25rem'
                                }}
                            >
                                {PHASE_LABELS[phase]}
                            </motion.div>
                        </AnimatePresence>
                        {phase !== 'idle' && (
                            <motion.div
                                key={countdown}
                                initial={{ scale: 1.2, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                style={{
                                    fontSize: '2rem',
                                    fontWeight: 700,
                                    color: 'var(--text-primary)'
                                }}
                            >
                                {countdown}
                            </motion.div>
                        )}
                    </div>
                </motion.div>
            </div>

            {/* Controls */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '1rem'
            }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    Cycles: {cycleCount}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        onClick={reset}
                        className="icon-btn no-drag"
                        style={{ width: '40px', height: '40px' }}
                        title="Reset Session"
                    >
                        <RotateCcw size={18} />
                    </button>
                    <button
                        onClick={() => setIsRunning(!isRunning)}
                        className={`no-drag ${isRunning ? 'btn-danger' : ''}`}
                        style={{
                            padding: '0.5rem 1.25rem',
                            borderRadius: '9999px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.65rem'
                        }}
                    >
                        {isRunning ? <Pause size={18} /> : <Play size={18} />}
                        <span style={{ fontWeight: 600 }}>{isRunning ? 'Stop' : 'Start'}</span>
                    </button>
                </div>
            </div>

            {/* Pattern description */}
            <div style={{
                marginTop: '0.75rem',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '0.75rem'
            }}>
                {pattern.description}
            </div>
        </div>
    );
}
