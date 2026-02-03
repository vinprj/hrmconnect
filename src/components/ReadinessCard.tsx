import { memo } from 'react';
import { motion } from 'framer-motion';
import { Battery, TrendingUp, Heart, Activity } from 'lucide-react';
import { calculateReadiness } from '../utils/readiness';
import type { SessionStats } from '../utils/stats';
import type { AdvancedStats } from '../utils/advancedStats';

interface ReadinessCardProps {
    stats: SessionStats;
    advancedStats: AdvancedStats;
}

export const ReadinessCard = memo(function ReadinessCard({ stats, advancedStats }: ReadinessCardProps) {
    const readiness = calculateReadiness(stats, advancedStats);

    // Only show meaningful data if we have measurements
    const hasData = stats.rmssd > 0 && stats.avgHr > 0;

    return (
        <div className="flip-card" style={{ height: '100%' }}>
            <div className="flip-card-inner">
                {/* Front - Score Display */}
                <div className="flip-card-front glass-card" style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '1rem',
                    height: '100%'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginBottom: '0.75rem'
                    }}>
                        <Battery size={18} style={{ color: readiness.color }} />
                        <span style={{
                            color: 'var(--text-muted)',
                            fontSize: '0.875rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                        }}>
                            Readiness
                        </span>
                    </div>

                    {hasData ? (
                        <>
                            {/* Score Circle */}
                            <div style={{
                                flex: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <motion.div
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    style={{
                                        width: '100px',
                                        height: '100px',
                                        borderRadius: '50%',
                                        border: `4px solid ${readiness.color}`,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: `${readiness.color}10`,
                                        boxShadow: `0 4px 20px ${readiness.color}20`
                                    }}
                                >
                                    <motion.span
                                        key={readiness.score}
                                        initial={{ scale: 1.2 }}
                                        animate={{ scale: 1 }}
                                        style={{
                                            fontSize: '2rem',
                                            fontWeight: 700,
                                            color: readiness.color
                                        }}
                                    >
                                        {readiness.score}
                                    </motion.span>
                                    <span style={{
                                        fontSize: '0.75rem',
                                        color: 'var(--text-muted)',
                                        textTransform: 'uppercase'
                                    }}>
                                        {readiness.status}
                                    </span>
                                </motion.div>
                            </div>

                            {/* Recommendation */}
                            <div style={{
                                textAlign: 'center',
                                color: 'var(--text-secondary)',
                                fontSize: '0.75rem',
                                marginTop: '0.5rem'
                            }}>
                                {readiness.recommendation}
                            </div>
                        </>
                    ) : (
                        <div style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--text-muted)',
                            fontSize: '0.875rem',
                            textAlign: 'center'
                        }}>
                            Connect device to see readiness score
                        </div>
                    )}
                </div>

                {/* Back - Factor Breakdown */}
                <div className="flip-card-back glass-card" style={{
                    padding: '1rem',
                    height: '100%'
                }}>
                    <h4 style={{
                        color: 'var(--text-primary)',
                        marginBottom: '1rem',
                        fontSize: '0.875rem'
                    }}>
                        Score Breakdown
                    </h4>

                    {hasData ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <FactorRow
                                icon={<Activity size={14} />}
                                label="RMSSD"
                                value={`${readiness.factors.rmssd.value}ms`}
                                contribution={readiness.factors.rmssd.contribution}
                                status={readiness.factors.rmssd.label}
                            />
                            <FactorRow
                                icon={<Heart size={14} />}
                                label="Resting HR"
                                value={`${readiness.factors.restingHR.value} BPM`}
                                contribution={readiness.factors.restingHR.contribution}
                                status={readiness.factors.restingHR.label}
                            />
                            <FactorRow
                                icon={<TrendingUp size={14} />}
                                label="HRV (SDNN)"
                                value={`${readiness.factors.hrv.value}ms`}
                                contribution={readiness.factors.hrv.contribution}
                                status={readiness.factors.hrv.label}
                            />
                        </div>
                    ) : (
                        <div style={{
                            color: 'var(--text-muted)',
                            fontSize: '0.75rem',
                            textAlign: 'center'
                        }}>
                            No data available
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
})

function FactorRow({
    icon,
    label,
    value,
    contribution,
    status
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    contribution: number;
    status: string;
}) {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.65rem',
            background: 'var(--btn-bg)',
            border: '1px solid var(--btn-border)',
            borderRadius: '12px',
            marginBottom: '0.25rem'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>{icon}</span>
                <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-primary)' }}>{label}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{status}</div>
                </div>
            </div>
            <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>{value}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--accent-primary)' }}>+{contribution}pts</div>
            </div>
        </div>
    );
}
