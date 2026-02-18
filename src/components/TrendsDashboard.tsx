import { useState, useEffect, memo, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react';
import { getSessions, getMorningTests } from '../services/storage';
import { buildTrendData, getTrendDirection, type TrendPoint } from '../utils/recovery';

interface TrendsDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

type Period = 7 | 30 | 90;

const METRICS = [
  { key: 'rmssd' as const, label: 'RMSSD', color: '#22c55e', unit: 'ms', higherBetter: true },
  { key: 'sdnn' as const, label: 'SDNN', color: '#3b82f6', unit: 'ms', higherBetter: true },
  { key: 'stressScore' as const, label: 'Stress', color: '#f59e0b', unit: '', higherBetter: false },
  { key: 'recoveryScore' as const, label: 'Recovery', color: '#8b5cf6', unit: '/100', higherBetter: true },
];

export const TrendsDashboard = memo(function TrendsDashboard({ isOpen, onClose }: TrendsDashboardProps) {
  const [period, setPeriod] = useState<Period>(7);
  const [data, setData] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    (async () => {
      try {
        const [sessions, tests] = await Promise.all([getSessions(), getMorningTests()]);
        setData(buildTrendData(sessions, tests, period));
      } catch (e) {
        console.error('Failed to load trends:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [isOpen, period]);

  const handleClose = useCallback(() => onClose(), [onClose]);

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
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1rem'
        }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={e => e.stopPropagation()}
          className="glass-card"
          style={{
            width: '100%', maxWidth: '900px', maxHeight: '85vh',
            overflow: 'auto', padding: '1.5rem', position: 'relative'
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarChart3 size={22} style={{ color: 'var(--accent-primary)' }} />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>HRV Trends</h2>
            </div>
            <button onClick={handleClose} className="icon-btn" title="Close">
              <X size={20} />
            </button>
          </div>

          {/* Period selector */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
            {([7, 30, 90] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                style={{
                  padding: '0.4rem 1rem',
                  borderRadius: '8px',
                  fontSize: '0.8rem', fontWeight: 600,
                  border: '1px solid var(--btn-border)',
                  background: period === p ? 'var(--accent-primary)' : 'var(--btn-bg)',
                  color: period === p ? '#fff' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {p}d
              </button>
            ))}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading trends...</div>
          ) : data.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              No data for this period. Complete some sessions or morning tests first.
            </div>
          ) : (
            <>
              {/* Summary cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
                {METRICS.map(m => {
                  const values = data.map(d => d[m.key]).filter(v => v > 0);
                  if (values.length === 0) return null;
                  const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length * 10) / 10;
                  const min = Math.round(Math.min(...values) * 10) / 10;
                  const max = Math.round(Math.max(...values) * 10) / 10;
                  const direction = getTrendDirection(values);
                  const isGood = m.higherBetter ? direction === 'improving' : direction === 'declining';
                  const isBad = m.higherBetter ? direction === 'declining' : direction === 'improving';

                  return (
                    <div key={m.key} style={{
                      padding: '0.75rem', borderRadius: '12px',
                      background: 'var(--btn-bg)', border: '1px solid var(--btn-border)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{m.label}</span>
                        <span style={{
                          display: 'flex', alignItems: 'center', gap: '2px',
                          fontSize: '0.7rem', fontWeight: 600,
                          color: isGood ? '#22c55e' : isBad ? '#ef4444' : 'var(--text-muted)'
                        }}>
                          {direction === 'improving' ? <TrendingUp size={12} /> : direction === 'declining' ? <TrendingDown size={12} /> : <Minus size={12} />}
                          {direction}
                        </span>
                      </div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: m.color }}>{avg}<span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{m.unit}</span></div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        Min {min} · Max {max}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Charts */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {METRICS.map(m => {
                  const hasValues = data.some(d => d[m.key] > 0);
                  if (!hasValues) return null;
                  return (
                    <div key={m.key}>
                      <h3 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 600 }}>
                        {m.label} {m.unit && `(${m.unit})`}
                      </h3>
                      <div style={{ height: '180px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                            <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                            <YAxis stroke="#94a3b8" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={40} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'var(--card-bg)',
                                border: '1px solid var(--card-border)',
                                borderRadius: '10px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                                color: 'var(--text-primary)',
                                fontSize: '0.8rem'
                              }}
                            />
                            <Line
                              type="monotone"
                              dataKey={m.key}
                              stroke={m.color}
                              strokeWidth={2.5}
                              dot={{ fill: m.color, r: 3, strokeWidth: 0 }}
                              activeDot={{ r: 5, fill: m.color, stroke: '#fff', strokeWidth: 2 }}
                              isAnimationActive={true}
                              animationDuration={800}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});
