import { useState, useEffect, memo } from 'react';
import { motion } from 'framer-motion';
import { Shield, TrendingUp, Heart, Brain, Calendar } from 'lucide-react';
import { getSessions, getMorningTests } from '../services/storage';
import { calculateRecoveryScore, type RecoveryData } from '../utils/recovery';

export const RecoveryScore = memo(function RecoveryScore() {
  const [recovery, setRecovery] = useState<RecoveryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [sessions, tests] = await Promise.all([getSessions(), getMorningTests()]);
        const data = calculateRecoveryScore(sessions, tests, 7);
        setRecovery(data);
      } catch (e) {
        console.error('Failed to load recovery data:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="glass-card" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'var(--text-muted)' }}>Loading...</span>
      </div>
    );
  }

  if (!recovery || recovery.score === 0) {
    return (
      <div className="glass-card" style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <Shield size={18} style={{ color: 'var(--text-muted)' }} />
          <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Recovery Score
          </span>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center' }}>
          Complete sessions or morning tests to see your recovery score
        </div>
      </div>
    );
  }

  const circumference = 2 * Math.PI * 54;
  const progress = (recovery.score / 100) * circumference;

  const factorItems = [
    { icon: <TrendingUp size={14} />, label: 'HRV Baseline', value: recovery.factors.hrvBaseline, max: 25 },
    { icon: <Heart size={14} />, label: 'Resting HR', value: recovery.factors.restingHrTrend, max: 25 },
    { icon: <Brain size={14} />, label: 'Stress Level', value: recovery.factors.stressHistory, max: 25 },
    { icon: <Calendar size={14} />, label: 'Consistency', value: recovery.factors.consistency, max: 25 },
  ];

  return (
    <div className="flip-card" style={{ height: '100%' }}>
      <div className="flip-card-inner">
        {/* Front */}
        <div className="flip-card-front glass-card" style={{ display: 'flex', flexDirection: 'column', padding: '1rem', height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Shield size={18} style={{ color: recovery.color }} />
            <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Recovery Score
            </span>
          </div>

          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'relative', width: '130px', height: '130px' }}>
              <svg width="130" height="130" viewBox="0 0 130 130" style={{ transform: 'rotate(-90deg)' }}>
                {/* Background circle */}
                <circle cx="65" cy="65" r="54" fill="none" stroke="var(--btn-border)" strokeWidth="8" />
                {/* Progress arc */}
                <motion.circle
                  cx="65" cy="65" r="54"
                  fill="none"
                  stroke={recovery.color}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset: circumference - progress }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                  style={{ filter: `drop-shadow(0 0 6px ${recovery.color}40)` }}
                />
              </svg>
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center'
              }}>
                <motion.span
                  key={recovery.score}
                  initial={{ scale: 1.3, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  style={{ fontSize: '2.25rem', fontWeight: 700, color: recovery.color, lineHeight: 1 }}
                >
                  {recovery.score}
                </motion.span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '2px' }}>
                  {recovery.label}
                </span>
              </div>
            </div>
          </div>

          {/* Zone bar */}
          <div style={{ marginTop: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
              <span>Poor</span><span>Moderate</span><span>Good</span>
            </div>
            <div style={{ height: '6px', borderRadius: '3px', background: 'linear-gradient(to right, #ef4444, #eab308, #22c55e)', position: 'relative' }}>
              <div style={{
                position: 'absolute',
                left: `${recovery.score}%`,
                top: '-3px',
                width: '12px', height: '12px',
                borderRadius: '50%',
                background: recovery.color,
                border: '2px solid var(--card-bg)',
                transform: 'translateX(-50%)',
                boxShadow: `0 0 8px ${recovery.color}60`
              }} />
            </div>
          </div>
        </div>

        {/* Back - Factor breakdown */}
        <div className="flip-card-back glass-card" style={{ padding: '1rem', height: '100%' }}>
          <h4 style={{ color: 'var(--text-primary)', marginBottom: '0.75rem', fontSize: '0.875rem' }}>
            Recovery Factors
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {factorItems.map(f => (
              <div key={f.label} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.5rem 0.65rem',
                background: 'var(--btn-bg)', border: '1px solid var(--btn-border)', borderRadius: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{f.icon}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-primary)' }}>{f.label}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: 'var(--btn-border)', overflow: 'hidden' }}>
                    <div style={{ width: `${(f.value / f.max) * 100}%`, height: '100%', background: recovery.color, borderRadius: '2px' }} />
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', minWidth: '28px', textAlign: 'right' }}>
                    {f.value}/{f.max}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});
