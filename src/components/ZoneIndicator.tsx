import { memo } from 'react';
import { motion } from 'framer-motion';
import { getCurrentZone, getZonesWithHRRanges, ZONES } from '../utils/zones';

interface ZoneIndicatorProps {
    currentHR: number;
    age: number;
    onAgeChange?: (age: number) => void;
}

export const ZoneIndicator = memo(function ZoneIndicator({ currentHR, age, onAgeChange }: ZoneIndicatorProps) {
    const zoneInfo = getCurrentZone(currentHR, age);
    const zonesWithRanges = getZonesWithHRRanges(age);

    return (
        <div style={{ width: '100%' }}>
            {/* Zone Bar */}
            <div style={{
                display: 'flex',
                height: '12px',
                borderRadius: '6px',
                overflow: 'hidden',
                background: 'rgba(0, 0, 0, 0.2)',
                marginBottom: '0.75rem'
            }}>
                {ZONES.map((zone, index) => (
                    <motion.div
                        key={zone.number}
                        style={{
                            flex: 1,
                            background: zone.color,
                            opacity: zoneInfo?.zone.number === zone.number ? 1 : 0.3,
                            position: 'relative'
                        }}
                        animate={{
                            opacity: zoneInfo?.zone.number === zone.number ? 1 : 0.3,
                        }}
                        transition={{ duration: 0.3 }}
                    >
                        {/* Active zone indicator */}
                        {zoneInfo?.zone.number === zone.number && (
                            <motion.div
                                layoutId="zoneIndicator"
                                style={{
                                    position: 'absolute',
                                    inset: 0,
                                    boxShadow: 'none',
                                    borderRadius: index === 0 ? '6px 0 0 6px' : index === 4 ? '0 6px 6px 0' : '0'
                                }}
                                initial={false}
                                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            />
                        )}
                    </motion.div>
                ))}
            </div>

            {/* Zone Info */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div>
                    {zoneInfo ? (
                        <motion.div
                            key={zoneInfo.zone.number}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                            <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '24px',
                                height: '24px',
                                borderRadius: '6px',
                                background: zoneInfo.zone.color,
                                color: 'white',
                                fontWeight: 700,
                                fontSize: '0.875rem'
                            }}>
                                {zoneInfo.zone.number}
                            </span>
                            <div>
                                <div style={{
                                    color: zoneInfo.zone.color,
                                    fontWeight: 600,
                                    fontSize: '0.875rem'
                                }}>
                                    {zoneInfo.zone.name}
                                </div>
                                <div style={{
                                    color: 'var(--text-muted)',
                                    fontSize: '0.75rem'
                                }}>
                                    {zoneInfo.zone.description}
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                            Below training zone
                        </div>
                    )}
                </div>

                <div style={{ textAlign: 'right' }}>
                    {zoneInfo && (
                        <div style={{
                            color: 'var(--text-secondary)',
                            fontSize: '0.75rem'
                        }}>
                            {zoneInfo.hrMin} - {zoneInfo.hrMax} BPM
                        </div>
                    )}
                    <div style={{
                        color: zoneInfo?.zone.color || 'var(--text-muted)',
                        fontWeight: 600,
                        fontSize: '0.875rem'
                    }}>
                        {zoneInfo ? `${zoneInfo.percentOfMax}% max` : '--'}
                    </div>
                </div>
            </div>

            {/* Zone Legend (collapsed) */}
            <details style={{ marginTop: '1rem' }}>
                <summary style={{
                    color: 'var(--text-muted)',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    userSelect: 'none'
                }}>
                    View all zones
                </summary>
                <div style={{
                    marginTop: '0.5rem',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(5, 1fr)',
                    gap: '0.5rem',
                    fontSize: '0.7rem'
                }}>
                    {zonesWithRanges.map(zone => (
                        <div key={zone.number} style={{ textAlign: 'center' }}>
                            <div style={{
                                width: '100%',
                                height: '4px',
                                background: zone.color,
                                borderRadius: '2px',
                                marginBottom: '0.25rem'
                            }} />
                            <div style={{ color: zone.color, fontWeight: 600 }}>Z{zone.number}</div>
                            <div style={{ color: 'var(--text-muted)' }}>{zone.hrMin}-{zone.hrMax}</div>
                        </div>
                    ))}
                </div>
                {/* Age setting */}
                {onAgeChange && (
                    <div style={{
                        marginTop: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingTop: '0.75rem',
                        borderTop: '1px solid var(--card-border)'
                    }}>
                        <label style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                            Update your age for accurate zones:
                        </label>
                        <input
                            type="number"
                            min="10"
                            max="100"
                            value={age}
                            onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                if (!isNaN(val) && val >= 10 && val <= 100) onAgeChange(val);
                            }}
                            className="no-drag"
                            style={{
                                width: '56px',
                                padding: '0.35rem 0.5rem',
                                borderRadius: '8px',
                                border: '1px solid var(--btn-border)',
                                background: 'var(--btn-bg)',
                                color: 'var(--text-primary)',
                                fontSize: '0.75rem',
                                textAlign: 'center',
                                outline: 'none'
                            }}
                        />
                    </div>
                )}
            </details>
        </div>
    );
})
