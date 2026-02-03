import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Trash2, Clock, Activity, Calendar } from 'lucide-react';
import { getSessions, deleteSession, exportSessionToCSV, downloadCSV, type Session } from '../services/storage';

interface SessionHistoryProps {
    isOpen: boolean;
    onClose: () => void;
}

export function SessionHistory({ isOpen, onClose }: SessionHistoryProps) {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSession, setSelectedSession] = useState<Session | null>(null);

    useEffect(() => {
        if (isOpen) {
            loadSessions();
        }
    }, [isOpen]);

    const loadSessions = async () => {
        setLoading(true);
        try {
            const data = await getSessions();
            setSessions(data);
        } catch (error) {
            console.error('Failed to load sessions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('Delete this session? This cannot be undone.')) {
            await deleteSession(id);
            setSessions(prev => prev.filter(s => s.id !== id));
            if (selectedSession?.id === id) {
                setSelectedSession(null);
            }
        }
    };

    const handleExport = (session: Session, e: React.MouseEvent) => {
        e.stopPropagation();
        const csv = exportSessionToCSV(session);
        const date = new Date(session.startTime).toISOString().split('T')[0];
        downloadCSV(csv, `hrm-session-${date}.csv`);
    };

    const formatDuration = (ms: number): string => {
        const seconds = Math.floor(ms / 1000);
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    };

    const formatDate = (timestamp: number): string => {
        return new Date(timestamp).toLocaleDateString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 1040,
                    background: 'rgba(0, 0, 0, 0.6)',
                    backdropFilter: 'blur(4px)'
                }}
            />

            {/* Modal */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
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
                        maxWidth: '48rem',
                        maxHeight: '80vh',
                        display: 'flex',
                        flexDirection: 'column',
                        background: 'var(--card-back-bg)'
                    }}
                >
                    {/* Header */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '1.5rem',
                        paddingBottom: '1rem',
                        borderBottom: '1px solid var(--card-border)'
                    }}>
                        <h2 style={{
                            color: 'var(--text-primary)',
                            fontSize: '1.5rem',
                            fontWeight: 700,
                            fontFamily: 'var(--font-display)'
                        }}>
                            Session History
                        </h2>
                        <button
                            onClick={onClose}
                            className="icon-btn"
                            aria-label="Close"
                            style={{ width: '40px', height: '40px' }}
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                                Loading sessions...
                            </div>
                        ) : sessions.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                                <Activity size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                                <p>No sessions recorded yet.</p>
                                <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                                    Connect your device and start a session to begin tracking.
                                </p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <AnimatePresence>
                                    {sessions.map(session => (
                                        <motion.div
                                            key={session.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            onClick={() => setSelectedSession(selectedSession?.id === session.id ? null : session)}
                                            style={{
                                                padding: '1.25rem',
                                                borderRadius: '16px',
                                                background: selectedSession?.id === session.id
                                                    ? 'rgba(99, 102, 241, 0.12)'
                                                    : 'var(--btn-bg)',
                                                border: `1px solid ${selectedSession?.id === session.id
                                                    ? 'var(--accent-primary)'
                                                    : 'var(--btn-border)'}`,
                                                cursor: 'pointer',
                                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                boxShadow: selectedSession?.id === session.id ? '0 4px 20px rgba(99, 102, 241, 0.15)' : 'none'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div>
                                                    <div style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.5rem',
                                                        color: 'var(--text-primary)',
                                                        fontWeight: 600,
                                                        marginBottom: '0.5rem'
                                                    }}>
                                                        <Calendar size={16} />
                                                        {formatDate(session.startTime)}
                                                    </div>
                                                    <div style={{
                                                        display: 'flex',
                                                        gap: '1.5rem',
                                                        fontSize: '0.875rem',
                                                        color: 'var(--text-secondary)'
                                                    }}>
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                            <Clock size={14} />
                                                            {formatDuration(session.endTime - session.startTime)}
                                                        </span>
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                            <Activity size={14} />
                                                            Avg: {session.stats.avgHr} BPM
                                                        </span>
                                                    </div>
                                                </div>

                                                <div style={{ display: 'flex', gap: '0.65rem' }}>
                                                    <button
                                                        onClick={(e) => handleExport(session, e)}
                                                        className="icon-btn"
                                                        title="Export CSV"
                                                        style={{ width: '40px', height: '40px' }}
                                                    >
                                                        <Download size={18} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleDelete(session.id, e)}
                                                        className="icon-btn"
                                                        title="Delete Session"
                                                        style={{
                                                            width: '40px',
                                                            height: '40px',
                                                            color: '#ef4444'
                                                        }}
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Expanded details */}
                                            <AnimatePresence>
                                                {selectedSession?.id === session.id && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        style={{ overflow: 'hidden' }}
                                                    >
                                                        <div style={{
                                                            marginTop: '1rem',
                                                            paddingTop: '1rem',
                                                            borderTop: '1px solid var(--card-border)',
                                                            display: 'grid',
                                                            gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
                                                            gap: '1rem'
                                                        }}>
                                                            <StatItem label="Min HR" value={`${session.stats.minHr}`} unit="BPM" />
                                                            <StatItem label="Max HR" value={`${session.stats.maxHr}`} unit="BPM" />
                                                            <StatItem label="SDNN" value={`${session.stats.sdnn}`} unit="ms" />
                                                            <StatItem label="RMSSD" value={`${session.stats.rmssd}`} unit="ms" />
                                                            <StatItem label="pNN50" value={`${session.advancedStats.pnn50.toFixed(1)}`} unit="%" />
                                                            <StatItem label="Stress" value={`${session.advancedStats.stressIndex}`} unit="" />
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>
        </>
    );
}

function StatItem({ label, value, unit }: { label: string; value: string; unit: string }) {
    return (
        <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                {label}
            </div>
            <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                {value}
                {unit && <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '2px' }}>{unit}</span>}
            </div>
        </div>
    );
}
