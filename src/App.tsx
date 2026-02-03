import { useState, useEffect, useRef, useCallback } from 'react'
import { Responsive, WidthProvider, type Layout, type Layouts } from 'react-grid-layout'
const ResponsiveGridLayout = WidthProvider(Responsive)
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { BluetoothService, type HeartRateData } from './services/bluetooth'
import { StatsCalculator, type SessionStats } from './utils/stats'
import { AdvancedStatsCalculator, type AdvancedStats } from './utils/advancedStats'
import { StatCard } from './components/StatCard'
import { StressGauge } from './components/StressGauge'
import { FrequencyCard } from './components/FrequencyCard'
import { PoincarePlot } from './components/PoincarePlot'
import { RespirationCard } from './components/RespirationCard'
import { TutorialModal } from './components/TutorialModal'
import { SessionHistory } from './components/SessionHistory'
import { BreathingGuide } from './components/BreathingGuide'
import { ReadinessCard } from './components/ReadinessCard'
import { saveSession } from './services/storage'
import { Activity, Timer, AlertTriangle, RotateCcw, Power, Battery, Sun, Moon, HelpCircle, History, Save } from 'lucide-react'
import { ZoneIndicator } from './components/ZoneIndicator'
import { DEFAULT_AGE } from './utils/zones'
import { motion } from 'framer-motion'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import './index.css'

// Safe localStorage parsing helpers
function safeParseJSON<T>(json: string | null, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch {
    console.warn('Failed to parse localStorage data, using default');
    return fallback;
  }
}

function safeParseAge(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed < 1 || parsed > 120) {
    return fallback;
  }
  return parsed;
}

const DEFAULT_LAYOUT = [
  { i: 'hr-display', x: 0, y: 0, w: 8, h: 2, minW: 4, minH: 2 },
  { i: 'chart', x: 0, y: 2, w: 8, h: 4, minW: 4, minH: 3 },
  { i: 'sdnn', x: 0, y: 6, w: 2, h: 2, minW: 2, minH: 2 },
  { i: 'rmssd', x: 2, y: 6, w: 2, h: 2, minW: 2, minH: 2 },
  { i: 'pnn50', x: 4, y: 6, w: 2, h: 2, minW: 2, minH: 2 },
  { i: 'lfhf', x: 6, y: 6, w: 2, h: 2, minW: 2, minH: 2 },
  { i: 'stress', x: 8, y: 0, w: 4, h: 3, minW: 3, minH: 3 },
  { i: 'frequency', x: 8, y: 3, w: 4, h: 3, minW: 3, minH: 3 },
  { i: 'poincare', x: 8, y: 6, w: 4, h: 4, minW: 3, minH: 3 },
  { i: 'respiration', x: 0, y: 8, w: 4, h: 3, minW: 3, minH: 3 },
  { i: 'breathing', x: 4, y: 8, w: 4, h: 3, minW: 3, minH: 3 },
  { i: 'readiness', x: 8, y: 10, w: 4, h: 3, minW: 3, minH: 3 },
]

function App() {
  const [isConnected, setIsConnected] = useState(false)
  const [currentHr, setCurrentHr] = useState<number>(0)
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null)
  const [stats, setStats] = useState<SessionStats>({
    minHr: 0, maxHr: 0, avgHr: 0, sdnn: 0, rmssd: 0, duration: 0
  })
  const [advancedStats, setAdvancedStats] = useState<AdvancedStats>({
    pnn50: 0, stressIndex: 0, lf: 0, hf: 0, lfHfRatio: 0, respirationRate: 0
  })
  const [hrHistory, setHrHistory] = useState<{ time: string, hr: number }[]>([])
  const [rrHistory, setRrHistory] = useState<number[]>([])
  const [error, setError] = useState<string | null>(null)
  const [layouts, setLayouts] = useState<Layouts>(() => {
    const saved = localStorage.getItem('dashboard-layouts')
    return safeParseJSON(saved, { lg: DEFAULT_LAYOUT })
  })
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('theme') as 'dark' | 'light') || 'dark'
  })
  const [isTutorialOpen, setIsTutorialOpen] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [sessionStartTime, setSessionStartTime] = useState<number>(0)
  const [hrDataWithTimestamp, setHrDataWithTimestamp] = useState<{ time: number; hr: number }[]>([])
  const [userAge, setUserAge] = useState<number>(() => {
    const saved = localStorage.getItem('user-age')
    return safeParseAge(saved, DEFAULT_AGE)
  })

  const bluetoothRef = useRef<BluetoothService | null>(null)
  const statsRef = useRef<StatsCalculator>(new StatsCalculator())
  const advancedStatsRef = useRef<AdvancedStatsCalculator>(new AdvancedStatsCalculator())

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem('user-age', userAge.toString())
  }, [userAge])

  useEffect(() => {
    return () => {
      if (bluetoothRef.current) {
        bluetoothRef.current.disconnect()
      }
    }
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }, [])

  const handleDataReceived = useCallback((data: HeartRateData) => {
    setCurrentHr(data.heartRate)

    statsRef.current.addReading(data.heartRate, data.rrIntervals)
    setStats(statsRef.current.getStats())

    if (data.rrIntervals) {
      advancedStatsRef.current.addRRIntervals(data.rrIntervals)
      setAdvancedStats(advancedStatsRef.current.calculate())

      setRrHistory(prev => {
        // Keep last 1000 intervals for analysis/plotting
        const newHistory = [...prev, ...data.rrIntervals!]
        if (newHistory.length > 1000) return newHistory.slice(newHistory.length - 1000)
        return newHistory
      })
    }

    setHrHistory(prev => {
      const newPoint = {
        time: new Date(data.timestamp).toLocaleTimeString([], { second: '2-digit', minute: '2-digit' }),
        hr: data.heartRate
      }
      const newHistory = [...prev, newPoint]
      if (newHistory.length > 100) return newHistory.slice(newHistory.length - 100)
      return newHistory
    })

    // Also store with absolute timestamp for session saving
    setHrDataWithTimestamp(prev => {
      const newPoint = { time: data.timestamp, hr: data.heartRate }
      const newHistory = [...prev, newPoint]
      if (newHistory.length > 1000) return newHistory.slice(newHistory.length - 1000)
      return newHistory
    })
  }, [])

  const handleDisconnect = useCallback(() => {
    setIsConnected(false)
    setBatteryLevel(null)
    setError('Device disconnected')
  }, [])

  const handleBatteryLevel = useCallback((level: number) => {
    setBatteryLevel(level)
  }, [])

  const connect = useCallback(async () => {
    setError(null)
    try {
      if (!bluetoothRef.current) {
        bluetoothRef.current = new BluetoothService(
          handleDataReceived,
          handleDisconnect,
          handleBatteryLevel
        )
      }
      await bluetoothRef.current.connect()
      setIsConnected(true)
      statsRef.current.reset()
      advancedStatsRef.current.reset()
      setHrHistory([])
      setRrHistory([])
      setHrDataWithTimestamp([])
      setSessionStartTime(Date.now())
    } catch (error: unknown) {
      const err = error as Error;
      if (err.name === 'NotFoundError' || err.message?.includes('cancelled')) {
        // User cancelled the selection, no need to show an error
        console.log('Connection cancelled by user');
        return;
      }
      setError(err.message || 'Failed to connect')
      setIsConnected(false)
    }
  }, [handleDataReceived, handleDisconnect, handleBatteryLevel])

  const disconnect = useCallback(async (shouldSave: boolean = false) => {
    if (shouldSave && hrDataWithTimestamp.length > 0) {
      try {
        await saveSession({
          startTime: sessionStartTime,
          endTime: Date.now(),
          hrData: hrDataWithTimestamp,
          rrIntervals: rrHistory,
          stats: statsRef.current.getStats(),
          advancedStats: advancedStatsRef.current.calculate()
        })
      } catch (error) {
        console.error('Failed to save session:', error)
      }
    }
    if (bluetoothRef.current) {
      bluetoothRef.current.disconnect()
      setIsConnected(false)
    }
  }, [hrDataWithTimestamp, sessionStartTime, rrHistory])

  const onLayoutChange = useCallback((_currentLayout: Layout[], allLayouts: Layouts) => {
    setLayouts(allLayouts)
    localStorage.setItem('dashboard-layouts', JSON.stringify(allLayouts))
  }, [])

  const resetLayout = useCallback(() => {
    setLayouts({ lg: DEFAULT_LAYOUT })
    localStorage.setItem('dashboard-layouts', JSON.stringify({ lg: DEFAULT_LAYOUT }))
  }, [])

  const openTutorial = useCallback(() => setIsTutorialOpen(true), [])
  const closeTutorial = useCallback(() => setIsTutorialOpen(false), [])
  const openHistory = useCallback(() => setIsHistoryOpen(true), [])
  const closeHistory = useCallback(() => setIsHistoryOpen(false), [])
  const saveAndDisconnect = useCallback(() => disconnect(true), [disconnect])
  const endWithoutSave = useCallback(() => disconnect(false), [disconnect])

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '4rem' }}>

      {/* Header */}
      <header className="main-header">
        <div className="flex items-center justify-between w-full max-w-7xl mx-auto px-6">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{
                scale: isConnected ? [1, 1.1, 1] : 1,
                filter: isConnected ? ['drop-shadow(0 0 0px #f87171)', 'drop-shadow(0 0 10px #f87171)', 'drop-shadow(0 0 0px #f87171)'] : 'none'
              }}
              transition={{ duration: stats.avgHr ? (60 / stats.avgHr) : 1, repeat: Infinity }}
            >
              <Activity size={32} className="text-red-400" />
            </motion.div>
            <h1><span className="brand-hrm">HRM</span> <span className="brand-connect">Connect</span></h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`status-badge ${isConnected ? 'connected' : 'disconnected'}`}>
                <span className={`status-dot ${isConnected ? 'pulse' : ''}`}></span>
                {isConnected ? 'Connected' : 'Disconnected'}
              </div>
              {stats.duration > 0 && (
                <div className="status-badge duration">
                  <Timer size={14} />
                  {Math.floor(stats.duration / 60)}m {stats.duration % 60}s
                </div>
              )}
              {batteryLevel !== null && (
                <div className="status-badge battery">
                  <Battery size={14} />
                  {batteryLevel}%
                </div>
              )}
            </div>

            {isConnected && (
              <div className="flex gap-2" style={{ marginRight: 'auto', paddingLeft: '1rem' }}>
                <button
                  onClick={saveAndDisconnect}
                  className="save-session-btn flex gap-2"
                  title="Save current session to history and stop monitoring"
                >
                  <Save size={18} />
                  <span>Save Session</span>
                </button>
                <button
                  onClick={endWithoutSave}
                  className="btn-danger btn-pill flex gap-2"
                  title="Stop monitoring without saving"
                >
                  <Activity size={18} />
                  <span>End</span>
                </button>
              </div>
            )}

            <div className="header-actions">
              <button onClick={openHistory} className="icon-btn" title="Session History">
                <History size={20} />
              </button>
              <button onClick={openTutorial} className="icon-btn" title="How to use">
                <HelpCircle size={20} />
              </button>
              <button onClick={toggleTheme} className="icon-btn" title="Toggle Theme">
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            </div>
          </div>
        </div>
      </header>

      <TutorialModal isOpen={isTutorialOpen} onClose={closeTutorial} />
      <SessionHistory isOpen={isHistoryOpen} onClose={closeHistory} />

      {
        error && (
          <div className="max-w-md mx-auto mb-8 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 text-center flex items-center justify-center gap-2 backdrop-blur-sm">
            <AlertTriangle size={20} className="text-red-400" />
            {error}
          </div>
        )
      }

      {
        !isConnected ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="welcome-container"
          >
            <div className="glass-card welcome-card">
              <div className="welcome-visual">
                <motion.div
                  animate={{
                    scale: [1, 1.15, 1],
                    filter: ['drop-shadow(0 0 10px rgba(239, 68, 68, 0.2))', 'drop-shadow(0 0 30px rgba(239, 68, 68, 0.5))', 'drop-shadow(0 0 10px rgba(239, 68, 68, 0.2))']
                  }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  className="heart-icon-wrapper"
                >
                  <Activity size={80} className="text-red-400" />
                </motion.div>
              </div>
              <h2>Ready to Connect</h2>
              <p>
                Experience medical-grade heart rate monitoring. Connect your Polar H10 to unlock real-time HRV analysis, stress tracking, and respiratory metrics.
              </p>
              <button onClick={connect} className="connect-main-btn group">
                <Power size={24} className="group-hover:rotate-12 transition-transform" />
                <span>Connect Device Now</span>
              </button>

              <div className="welcome-features">
                <div className="feature">
                  <div className="feature-dot blue"></div>
                  <span>Real-time HRV (SDNN, RMSSD)</span>
                </div>
                <div className="feature">
                  <div className="feature-dot yellow"></div>
                  <span>Stress Index Analysis</span>
                </div>
                <div className="feature">
                  <div className="feature-dot purple"></div>
                  <span>Poincaré Visualizations</span>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <>
            <ResponsiveGridLayout
              className="layout"
              layouts={layouts}
              breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
              cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
              rowHeight={80}
              onLayoutChange={onLayoutChange}
              draggableHandle=".drag-handle"
              draggableCancel=".no-drag"
              isDraggable={true}
              isResizable={true}
              compactType="vertical"
              preventCollision={false}
              margin={[16, 16]}
            >
              {/* HR Display */}
              <div key="hr-display" className="glass-card drag-handle" style={{ cursor: 'move' }}>
                <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '2rem' }}>
                  <div>
                    <h2 className="responsive-title uppercase tracking-wider text-slate-400" style={{ marginBottom: '0.5rem' }}>Heart Rate</h2>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem' }}>
                      <span className="responsive-value font-bold text-white" style={{ color: '#ef4444', textShadow: 'none' }}>{currentHr}</span>
                      <span className="responsive-unit" style={{ color: '#f87171', fontWeight: 600 }}>BPM</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="text-slate-400 responsive-text" style={{ marginBottom: '0.5rem' }}>
                      Min <span className="text-white font-bold" style={{ marginLeft: '0.5rem' }}>{stats.minHr}</span>
                    </div>
                    <div className="text-slate-400 responsive-text" style={{ marginBottom: '0.5rem' }}>
                      Avg <span className="text-white font-bold" style={{ marginLeft: '0.5rem' }}>{stats.avgHr}</span>
                    </div>
                    <div className="text-slate-400 responsive-text">
                      Max <span className="text-white font-bold" style={{ marginLeft: '0.5rem' }}>{stats.maxHr}</span>
                    </div>
                  </div>
                </div>
                {/* Zone Indicator */}
                <div style={{ marginTop: '1rem', width: '100%' }}>
                  <ZoneIndicator currentHR={currentHr} age={userAge} onAgeChange={setUserAge} />
                </div>
              </div>

              {/* Chart */}
              <div key="chart" className="glass-card drag-handle" style={{ cursor: 'move' }}>
                <div style={{ height: '100%', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={hrHistory} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorHr" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                      <XAxis
                        dataKey="time"
                        stroke="#94a3b8"
                        tick={{ fontSize: 12, fill: '#94a3b8' }}
                        tickLine={false}
                        axisLine={false}
                        minTickGap={30}
                      />
                      <YAxis
                        domain={['dataMin - 10', 'dataMax + 10']}
                        stroke="#94a3b8"
                        tick={{ fontSize: 12, fill: '#94a3b8' }}
                        tickLine={false}
                        axisLine={false}
                        width={40}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--card-bg)',
                          border: '1px solid var(--card-border)',
                          borderRadius: '12px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                          color: 'var(--text-primary)'
                        }}
                        itemStyle={{ color: 'var(--text-primary)' }}
                        labelStyle={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="hr"
                        stroke="#ef4444"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorHr)"
                        isAnimationActive={false}
                        name="Heart Rate"
                        unit=" BPM"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Stat Cards */}
              <div key="sdnn" className="drag-handle" style={{ cursor: 'move', height: '100%' }}>
                <StatCard
                  label="HRV (SDNN)"
                  value={stats.sdnn}
                  unit="ms"
                  description="Think of this as your body's 'flexibility score'. Higher numbers mean your heart adapts better to stress. Athletes and well-rested people typically have higher values (50-100+ ms)."
                />
              </div>

              <div key="rmssd" className="drag-handle" style={{ cursor: 'move', height: '100%' }}>
                <StatCard
                  label="HRV (RMSSD)"
                  value={stats.rmssd}
                  unit="ms"
                  description="This measures your recovery ability. It's closely tied to how well you're resting and recovering. Higher is better - it means your body is in 'rest and digest' mode."
                />
              </div>

              <div key="pnn50" className="drag-handle" style={{ cursor: 'move', height: '100%' }}>
                <StatCard
                  label="pNN50"
                  value={Math.round(advancedStats.pnn50)}
                  unit="%"
                  description="A simple way to check recovery. Higher percentages (>20%) suggest good recovery and relaxation. Lower values may indicate stress or fatigue."
                />
              </div>

              <div key="lfhf" className="drag-handle" style={{ cursor: 'move', height: '100%' }}>
                <StatCard
                  label="LF/HF Ratio"
                  value={advancedStats.lfHfRatio}
                  description="Your stress vs. relaxation balance. Low ratio (<1) = relaxed and recovering. High ratio (>2) = stressed or actively working. Ideal is around 1-2 during the day."
                />
              </div>

              <div key="stress" className="drag-handle" style={{ cursor: 'move', height: '100%' }}>
                <StressGauge value={advancedStats.stressIndex} />
              </div>

              <div key="frequency" className="drag-handle" style={{ cursor: 'move', height: '100%' }}>
                <FrequencyCard lf={advancedStats.lf} hf={advancedStats.hf} />
              </div>

              <div key="poincare" className="drag-handle" style={{ cursor: 'move', height: '100%' }}>
                <PoincarePlot rrIntervals={rrHistory} />
              </div>

              <div key="respiration" className="drag-handle" style={{ cursor: 'move', height: '100%' }}>
                <RespirationCard rate={advancedStats.respirationRate} />
              </div>

              <div key="breathing" className="glass-card drag-handle" style={{ cursor: 'move', height: '100%' }}>
                <BreathingGuide />
              </div>

              <div key="readiness" className="drag-handle" style={{ cursor: 'move', height: '100%' }}>
                <ReadinessCard stats={stats} advancedStats={advancedStats} />
              </div>
            </ResponsiveGridLayout>

            {/* Layout Controls */}
            <div className="layout-footer">
              <button onClick={resetLayout} title="Reset Layout" className="reset-layout-btn">
                <RotateCcw size={16} />
                Reset Dashboard Layout
              </button>
            </div>
          </>
        )
      }
    </div >
  )
}

export default App
