import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Sun, ArrowUp, CheckCircle, Activity, Heart, Zap, TrendingUp } from 'lucide-react';
import { BluetoothService, type HeartRateData } from '../services/bluetooth';
import { saveMorningTest, type MorningTestResult } from '../services/storage';

interface MorningTestProps {
    isOpen: boolean;
    onClose: () => void;
    bluetoothService: BluetoothService | null;
    isConnected: boolean;
    onConnect: () => Promise<void>;
}

type TestPhase = 'intro' | 'lying' | 'transition' | 'standing' | 'results';

interface PhaseData {
    hrReadings: number[];
    rrIntervals: number[];
}

const LYING_DURATION = 120; // 2 minutes
const TRANSITION_DURATION = 10; // 10 seconds to stand up
const STANDING_DURATION = 60; // 1 minute

export function MorningTest({ isOpen, onClose, bluetoothService, isConnected, onConnect }: MorningTestProps) {
    const [phase, setPhase] = useState<TestPhase>('intro');
    const [countdown, setCountdown] = useState(0);
    const [currentHr, setCurrentHr] = useState(0);
    const [lyingData, setLyingData] = useState<PhaseData>({ hrReadings: [], rrIntervals: [] });
    const [standingData, setStandingData] = useState<PhaseData>({ hrReadings: [], rrIntervals: [] });
    const [results, setResults] = useState<MorningTestResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const dataCallbackRef = useRef<((data: HeartRateData) => void) | null>(null);
    const startTimeRef = useRef<number>(0);

    // Calculate averages
    const calcAvg = (arr: number[]) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

    // Calculate RMSSD from RR intervals
    const calcRMSSD = (intervals: number[]): number => {
        if (intervals.length < 2) return 0;
        let sumSquaredDiffs = 0;
        for (let i = 1; i < intervals.length; i++) {
            const diff = intervals[i] - intervals[i - 1];
            sumSquaredDiffs += diff * diff;
        }
        return Math.round(Math.sqrt(sumSquaredDiffs / (intervals.length - 1)));
    };

    // Calculate readiness score (0-100)
    const calcReadinessScore = (
        lyingRMSSD: number,
        lyingAvgHr: number,
        standingAvgHr: number
    ): number => {
        const hrDelta = standingAvgHr - lyingAvgHr;

        // RMSSD score (50% weight) - higher is better, typical range 20-80ms
        const rmssdScore = Math.min(100, Math.max(0, (lyingRMSSD - 10) * 1.5));

        // HR delta score (30% weight) - lower is better, typical range 10-30 bpm
        const deltaScore = Math.min(100, Math.max(0, 100 - (hrDelta - 5) * 3));

        // Resting HR score (20% weight) - lower is better, typical range 50-80
        const restingScore = Math.min(100, Math.max(0, (90 - lyingAvgHr) * 2.5));

        return Math.round(rmssdScore * 0.5 + deltaScore * 0.3 + restingScore * 0.2);
    };

    // Get readiness label
    const getReadinessLabel = (score: number): { label: string; color: string } => {
        if (score >= 80) return { label: 'Excellent', color: '#22c55e' };
        if (score >= 60) return { label: 'Good', color: '#84cc16' };
        if (score >= 40) return { label: 'Moderate', color: '#eab308' };
        if (score >= 20) return { label: 'Low', color: '#f97316' };
        return { label: 'Poor', color: '#ef4444' };
    };

    // Handle incoming HR data
    const handleData = useCallback((data: HeartRateData) => {
        setCurrentHr(data.heartRate);

        if (phase === 'lying') {
            setLyingData(prev => ({
                hrReadings: [...prev.hrReadings, data.heartRate],
                rrIntervals: data.rrIntervals
                    ? [...prev.rrIntervals, ...data.rrIntervals]
                    : prev.rrIntervals
            }));
        } else if (phase === 'standing') {
            setStandingData(prev => ({
                hrReadings: [...prev.hrReadings, data.heartRate],
                rrIntervals: data.rrIntervals
                    ? [...prev.rrIntervals, ...data.rrIntervals]
                    : prev.rrIntervals
            }));
        }
    }, [phase]);

    // Store callback ref so it updates with phase
    useEffect(() => {
        dataCallbackRef.current = handleData;
    }, [handleData]);

    // Subscribe to bluetooth data when test starts
    useEffect(() => {
        if (!bluetoothService || phase === 'intro' || phase === 'results') return;

        const wrappedCallback = (data: HeartRateData) => {
            dataCallbackRef.current?.(data);
        };

        bluetoothService.addDataListener(wrappedCallback);
        return () => bluetoothService.removeDataListener(wrappedCallback);
    }, [bluetoothService, phase]);

    // Phase timer
    useEffect(() => {
        if (phase === 'intro' || phase === 'results') return;

        let duration = 0;
        if (phase === 'lying') duration = LYING_DURATION;
        else if (phase === 'transition') duration = TRANSITION_DURATION;
        else if (phase === 'standing') duration = STANDING_DURATION;

        setCountdown(duration);

        const interval = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    // Move to next phase
                    if (phase === 'lying') {
                        setPhase('transition');
                    } else if (phase === 'transition') {
                        setPhase('standing');
                    } else if (phase === 'standing') {
                        // Calculate and show results
                        const lyingAvgHr = calcAvg(lyingData.hrReadings);
                        const standingAvgHr = calcAvg(standingData.hrReadings);
                        const lyingRMSSD = calcRMSSD(lyingData.rrIntervals);
                        const standingRMSSD = calcRMSSD(standingData.rrIntervals);
                        const readinessScore = calcReadinessScore(lyingRMSSD, lyingAvgHr, standingAvgHr);

                        const testResult: MorningTestResult = {
                            timestamp: startTimeRef.current,
                            lyingAvgHr,
                            standingAvgHr,
                            hrDelta: standingAvgHr - lyingAvgHr,
                            lyingRMSSD,
                            standingRMSSD,
                            readinessScore
                        };

                        setResults(testResult);

                        // Save to storage
                        saveMorningTest(testResult).catch(err => {
                            console.error('Failed to save morning test:', err);
                        });

                        setPhase('results');
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [phase, lyingData, standingData]);

    const startTest = async () => {
        if (!isConnected) {
            try {
                await onConnect();
            } catch {
                setError('Failed to connect. Please try again.');
                return;
            }
        }

        setError(null);
        setLyingData({ hrReadings: [], rrIntervals: [] });
        setStandingData({ hrReadings: [], rrIntervals: [] });
        setResults(null);
        startTimeRef.current = Date.now();
        setPhase('lying');
    };

    const resetTest = () => {
        setPhase('intro');
        setCountdown(0);
        setCurrentHr(0);
        setLyingData({ hrReadings: [], rrIntervals: [] });
        setStandingData({ hrReadings: [], rrIntervals: [] });
        setResults(null);
        setError(null);
    };

    const handleClose = () => {
        resetTest();
        onClose();
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getPhaseProgress = () => {
        if (phase === 'lying') return ((LYING_DURATION - countdown) / LYING_DURATION) * 100;
        if (phase === 'transition') return ((TRANSITION_DURATION - countdown) / TRANSITION_DURATION) * 100;
        if (phase === 'standing') return ((STANDING_DURATION - countdown) / STANDING_DURATION) * 100;
        return 0;
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="modal-overlay"
                onClick={handleClose}
                style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0, 0, 0, 0.8)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 100,
                    padding: '1rem'
                }}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    onClick={e => e.stopPropagation()}
                    className="glass-card"
                    style={{
                        width: '100%',
                        maxWidth: '500px',
                        maxHeight: '90vh',
                        overflow: 'auto',
                        position: 'relative'
                    }}
                >
                    {/* Close Button */}
                    <button
                        onClick={handleClose}
                        className="icon-btn"
                        style={{
                            position: 'absolute',
                            top: '1rem',
                            right: '1rem',
                            zIndex: 10
                        }}
                    >
                        <X size={20} />
                    </button>

                    {/* Intro Phase */}
                    {phase === 'intro' && (
                        <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                            <motion.div
                                animate={{
                                    scale: [1, 1.1, 1],
                                    rotate: [0, 5, -5, 0]
                                }}
                                transition={{ duration: 2, repeat: Infinity }}
                                style={{ marginBottom: '1.5rem' }}
                            >
                                <Sun size={64} style={{ color: '#fbbf24' }} />
                            </motion.div>

                            <h2 style={{
                                fontSize: '1.75rem',
                                fontWeight: 700,
                                marginBottom: '0.75rem',
                                color: 'var(--text-primary)'
                            }}>
                                Morning Readiness Test
                            </h2>

                            <p style={{
                                color: 'var(--text-secondary)',
                                marginBottom: '2rem',
                                lineHeight: 1.6
                            }}>
                                A 3-minute orthostatic test to measure your recovery and readiness for the day.
                            </p>

                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '1rem',
                                marginBottom: '2rem',
                                textAlign: 'left'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '50%',
                                        background: 'rgba(59, 130, 246, 0.2)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#3b82f6',
                                        fontWeight: 700
                                    }}>1</div>
                                    <div>
                                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Lie Down (2 min)</div>
                                        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Relax and breathe normally</div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '50%',
                                        background: 'rgba(234, 179, 8, 0.2)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#eab308',
                                        fontWeight: 700
                                    }}>2</div>
                                    <div>
                                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Stand Up (10 sec)</div>
                                        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Rise smoothly when prompted</div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '50%',
                                        background: 'rgba(34, 197, 94, 0.2)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#22c55e',
                                        fontWeight: 700
                                    }}>3</div>
                                    <div>
                                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Stand Still (1 min)</div>
                                        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Stay relaxed while standing</div>
                                    </div>
                                </div>
                            </div>

                            {error && (
                                <div style={{
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    borderRadius: '12px',
                                    padding: '0.75rem 1rem',
                                    marginBottom: '1rem',
                                    color: '#f87171',
                                    fontSize: '0.875rem'
                                }}>
                                    {error}
                                </div>
                            )}

                            <button
                                onClick={startTest}
                                style={{
                                    width: '100%',
                                    padding: '1rem',
                                    borderRadius: '14px',
                                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                    border: 'none',
                                    color: 'white',
                                    fontWeight: 700,
                                    fontSize: '1rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                <Play size={20} />
                                {isConnected ? 'Start Test' : 'Connect & Start'}
                            </button>
                        </div>
                    )}

                    {/* Active Test Phases */}
                    {(phase === 'lying' || phase === 'transition' || phase === 'standing') && (
                        <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                            {/* Phase Icon */}
                            <motion.div
                                key={phase}
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                style={{ marginBottom: '1rem' }}
                            >
                                {phase === 'lying' && (
                                    <div style={{
                                        width: '80px',
                                        height: '80px',
                                        borderRadius: '50%',
                                        background: 'rgba(59, 130, 246, 0.2)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        margin: '0 auto'
                                    }}>
                                        <Activity size={40} style={{ color: '#3b82f6' }} />
                                    </div>
                                )}
                                {phase === 'transition' && (
                                    <motion.div
                                        animate={{ y: [0, -10, 0] }}
                                        transition={{ duration: 0.5, repeat: Infinity }}
                                        style={{
                                            width: '80px',
                                            height: '80px',
                                            borderRadius: '50%',
                                            background: 'rgba(234, 179, 8, 0.2)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            margin: '0 auto'
                                        }}
                                    >
                                        <ArrowUp size={40} style={{ color: '#eab308' }} />
                                    </motion.div>
                                )}
                                {phase === 'standing' && (
                                    <div style={{
                                        width: '80px',
                                        height: '80px',
                                        borderRadius: '50%',
                                        background: 'rgba(34, 197, 94, 0.2)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        margin: '0 auto'
                                    }}>
                                        <Activity size={40} style={{ color: '#22c55e' }} />
                                    </div>
                                )}
                            </motion.div>

                            {/* Phase Title */}
                            <h2 style={{
                                fontSize: '1.5rem',
                                fontWeight: 700,
                                marginBottom: '0.5rem',
                                color: 'var(--text-primary)'
                            }}>
                                {phase === 'lying' && 'Lie Down & Relax'}
                                {phase === 'transition' && 'Stand Up Now!'}
                                {phase === 'standing' && 'Stand Still'}
                            </h2>

                            <p style={{
                                color: 'var(--text-secondary)',
                                marginBottom: '1.5rem'
                            }}>
                                {phase === 'lying' && 'Breathe normally and stay relaxed'}
                                {phase === 'transition' && 'Rise smoothly to standing position'}
                                {phase === 'standing' && 'Stay relaxed while standing'}
                            </p>

                            {/* Countdown */}
                            <div style={{
                                fontSize: '4rem',
                                fontWeight: 800,
                                color: phase === 'lying' ? '#3b82f6' : phase === 'transition' ? '#eab308' : '#22c55e',
                                marginBottom: '1rem',
                                fontFamily: 'var(--font-display)'
                            }}>
                                {formatTime(countdown)}
                            </div>

                            {/* Progress Bar */}
                            <div style={{
                                height: '8px',
                                background: 'rgba(255, 255, 255, 0.1)',
                                borderRadius: '4px',
                                overflow: 'hidden',
                                marginBottom: '1.5rem'
                            }}>
                                <motion.div
                                    style={{
                                        height: '100%',
                                        background: phase === 'lying' ? '#3b82f6' : phase === 'transition' ? '#eab308' : '#22c55e',
                                        borderRadius: '4px'
                                    }}
                                    animate={{ width: `${getPhaseProgress()}%` }}
                                    transition={{ duration: 0.5 }}
                                />
                            </div>

                            {/* Current HR */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                padding: '1rem',
                                background: 'rgba(239, 68, 68, 0.1)',
                                borderRadius: '12px',
                                border: '1px solid rgba(239, 68, 68, 0.2)'
                            }}>
                                <motion.div
                                    animate={{ scale: [1, 1.2, 1] }}
                                    transition={{ duration: currentHr ? 60 / currentHr : 1, repeat: Infinity }}
                                >
                                    <Heart size={24} style={{ color: '#ef4444', fill: '#ef4444' }} />
                                </motion.div>
                                <span style={{
                                    fontSize: '2rem',
                                    fontWeight: 700,
                                    color: '#ef4444'
                                }}>
                                    {currentHr}
                                </span>
                                <span style={{ color: '#f87171', fontWeight: 600 }}>BPM</span>
                            </div>

                            {/* Phase Indicator */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                marginTop: '1.5rem'
                            }}>
                                {['lying', 'transition', 'standing'].map((p, i) => (
                                    <div
                                        key={p}
                                        style={{
                                            width: '12px',
                                            height: '12px',
                                            borderRadius: '50%',
                                            background: phase === p
                                                ? (p === 'lying' ? '#3b82f6' : p === 'transition' ? '#eab308' : '#22c55e')
                                                : ['lying', 'transition', 'standing'].indexOf(phase) > i
                                                    ? 'var(--text-muted)'
                                                    : 'rgba(255, 255, 255, 0.1)',
                                            transition: 'all 0.3s'
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Results Phase */}
                    {phase === 'results' && results && (
                        <div style={{ padding: '2rem 1rem' }}>
                            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: 'spring', bounce: 0.5 }}
                                >
                                    <CheckCircle size={64} style={{ color: '#22c55e', marginBottom: '1rem' }} />
                                </motion.div>

                                <h2 style={{
                                    fontSize: '1.5rem',
                                    fontWeight: 700,
                                    marginBottom: '0.5rem',
                                    color: 'var(--text-primary)'
                                }}>
                                    Test Complete!
                                </h2>
                            </div>

                            {/* Readiness Score */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                style={{
                                    textAlign: 'center',
                                    padding: '1.5rem',
                                    background: `rgba(${results.readinessScore >= 60 ? '34, 197, 94' : results.readinessScore >= 40 ? '234, 179, 8' : '239, 68, 68'}, 0.1)`,
                                    borderRadius: '16px',
                                    border: `1px solid rgba(${results.readinessScore >= 60 ? '34, 197, 94' : results.readinessScore >= 40 ? '234, 179, 8' : '239, 68, 68'}, 0.3)`,
                                    marginBottom: '1.5rem'
                                }}
                            >
                                <div style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                                    Readiness Score
                                </div>
                                <div style={{
                                    fontSize: '4rem',
                                    fontWeight: 800,
                                    color: getReadinessLabel(results.readinessScore).color,
                                    lineHeight: 1
                                }}>
                                    {results.readinessScore}
                                </div>
                                <div style={{
                                    color: getReadinessLabel(results.readinessScore).color,
                                    fontWeight: 600,
                                    marginTop: '0.5rem'
                                }}>
                                    {getReadinessLabel(results.readinessScore).label}
                                </div>
                            </motion.div>

                            {/* Metrics Grid */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(2, 1fr)',
                                gap: '1rem',
                                marginBottom: '1.5rem'
                            }}>
                                <div className="glass-card" style={{ padding: '1rem', textAlign: 'center' }}>
                                    <Heart size={20} style={{ color: '#3b82f6', marginBottom: '0.5rem' }} />
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Lying HR</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                        {results.lyingAvgHr} <span style={{ fontSize: '0.875rem', fontWeight: 400 }}>bpm</span>
                                    </div>
                                </div>

                                <div className="glass-card" style={{ padding: '1rem', textAlign: 'center' }}>
                                    <Heart size={20} style={{ color: '#22c55e', marginBottom: '0.5rem' }} />
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Standing HR</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                        {results.standingAvgHr} <span style={{ fontSize: '0.875rem', fontWeight: 400 }}>bpm</span>
                                    </div>
                                </div>

                                <div className="glass-card" style={{ padding: '1rem', textAlign: 'center' }}>
                                    <TrendingUp size={20} style={{ color: '#f97316', marginBottom: '0.5rem' }} />
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>HR Delta</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                        +{results.hrDelta} <span style={{ fontSize: '0.875rem', fontWeight: 400 }}>bpm</span>
                                    </div>
                                </div>

                                <div className="glass-card" style={{ padding: '1rem', textAlign: 'center' }}>
                                    <Zap size={20} style={{ color: '#8b5cf6', marginBottom: '0.5rem' }} />
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Lying RMSSD</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                        {results.lyingRMSSD} <span style={{ fontSize: '0.875rem', fontWeight: 400 }}>ms</span>
                                    </div>
                                </div>
                            </div>

                            {/* Interpretation */}
                            <div style={{
                                padding: '1rem',
                                background: 'rgba(99, 102, 241, 0.1)',
                                borderRadius: '12px',
                                marginBottom: '1.5rem'
                            }}>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                                    💡 What this means
                                </div>
                                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                    {results.readinessScore >= 70
                                        ? "You're well-recovered! Great day for intense training or challenging work."
                                        : results.readinessScore >= 50
                                            ? "Moderate recovery. Consider a lighter day or active recovery."
                                            : "Your body needs rest. Focus on recovery activities today."}
                                </p>
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button
                                    onClick={resetTest}
                                    className="btn-secondary"
                                    style={{ flex: 1, padding: '0.875rem' }}
                                >
                                    Retake Test
                                </button>
                                <button
                                    onClick={handleClose}
                                    style={{
                                        flex: 1,
                                        padding: '0.875rem',
                                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                        border: 'none',
                                        borderRadius: '14px',
                                        color: 'white',
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                    }}
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
