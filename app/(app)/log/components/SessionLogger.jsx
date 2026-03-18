'use client'
// app/(app)/log/components/SessionLogger.jsx
//
// Componente principal del logger de entrenamiento.
// Flujo: Readiness check → Logger de series → Cierre de sesión
//
// Fundamentos:
//   · Readiness 4D: Kenttä & Hassmén 1998
//   · RIR por serie: Zourdos et al. 2016
//   · Timer descanso: Schoenfeld et al. 2016 (≥3 min óptimo hipertrofia)

import { useState, useEffect, useRef, useCallback } from 'react'

// ─── Constantes ────────────────────────────────────────────────
const RIR_LABELS = {
  0: 'Fallo', 1: 'RIR 1', 2: 'RIR 2',
  3: 'RIR 3', 4: 'RIR 4', 5: 'RIR 5+',
}
const RIR_COLORS = {
  0: '#D45A5A', 1: '#E8803A', 2: '#E8A030',
  3: '#A8C040', 4: '#3DAA6A', 5: '#3DAA6A',
}
const READINESS_LABELS = {
  sleep:      ['', 'Muy mal', 'Mal', 'Regular', 'Bien', 'Muy bien'],
  energy:     ['', 'Sin energía', 'Poca', 'Normal', 'Buena', 'Excelente'],
  motivation: ['', 'Sin ganas', 'Pocas', 'Normal', 'Motivado', 'En llamas'],
  soreness:   ['', 'Mucho dolor', 'Bastante', 'Algo', 'Poco', 'Sin dolor'],
}
const READINESS_EMOJIS = {
  sleep: '🌙', energy: '⚡', motivation: '🔥', soreness: '💪',
}

// ─── Sub-componente: Stepper numérico ─────────────────────────
function Stepper({ value, onChange, step = 2.5, min = 0, max = 500, decimals = 1 }) {
  const intervalRef = useRef(null)

  const change = (delta) => {
    const next = Math.max(min, Math.min(max, Math.round((value + delta) * 10) / 10))
    onChange(next)
  }

  const startRepeat = (delta) => {
    change(delta)
    intervalRef.current = setInterval(() => change(delta), 120)
  }
  const stopRepeat = () => clearInterval(intervalRef.current)

  return (
    <div className="stepper">
      <button
        className="stepper__btn"
        onPointerDown={() => startRepeat(-step)}
        onPointerUp={stopRepeat}
        onPointerLeave={stopRepeat}
        aria-label="Reducir"
      >−</button>
      <span className="stepper__val">
        {value % 1 === 0 ? value : value.toFixed(decimals)}
      </span>
      <button
        className="stepper__btn"
        onPointerDown={() => startRepeat(step)}
        onPointerUp={stopRepeat}
        onPointerLeave={stopRepeat}
        aria-label="Aumentar"
      >+</button>
    </div>
  )
}

// ─── Sub-componente: Timer circular de descanso ────────────────
function RestTimer({ seconds, onDone }) {
  const [remaining, setRemaining] = useState(seconds)
  const [running, setRunning] = useState(true)
  const intervalRef = useRef(null)
  const radius = 40
  const circumference = 2 * Math.PI * radius
  const progress = remaining / seconds
  const dashoffset = circumference * (1 - progress)

  useEffect(() => {
    if (!running) return
    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current)
          setRunning(false)
          onDone?.()
          // Vibración suave al terminar (si el dispositivo lo soporta)
          if (navigator.vibrate) navigator.vibrate([100, 50, 100])
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [running])

  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60
  const isDone = remaining === 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '1.5rem 0' }}>
      <div style={{ position: 'relative', width: 100, height: 100 }}>
        <svg width="100" height="100" viewBox="0 0 100 100">
          <circle
            className="timer-ring__track"
            cx="50" cy="50" r={radius}
          />
          <circle
            className={`timer-ring timer-ring__progress${isDone ? ' timer-ring__progress--done' : ''}`}
            cx="50" cy="50" r={radius}
            strokeDasharray={circumference}
            strokeDashoffset={dashoffset}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-mono)', fontSize: '1.15rem', fontWeight: 500,
          color: isDone ? 'var(--green)' : 'var(--txt-1)',
        }}>
          {isDone ? '✓' : `${mins}:${String(secs).padStart(2,'0')}`}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          className="btn btn--ghost"
          onClick={() => setRunning(r => !r)}
          style={{ fontSize: '0.8rem', height: 36 }}
        >
          {running ? 'Pausar' : 'Reanudar'}
        </button>
        <button
          className="btn btn--ghost"
          onClick={onDone}
          style={{ fontSize: '0.8rem', height: 36 }}
        >
          Saltar
        </button>
      </div>
      <p style={{ fontSize: '0.75rem', color: 'var(--txt-2)', textAlign: 'center' }}>
        Schoenfeld 2016: ≥3 min optimiza hipertrofia
      </p>
    </div>
  )
}

// ─── Sub-componente: Readiness check ──────────────────────────
function ReadinessCheck({ onComplete }) {
  const [values, setValues] = useState({ sleep: 3, energy: 3, motivation: 3, soreness: 3 })
  const [bodyweight, setBodyweight] = useState('')

  const score = Object.values(values).reduce((a, b) => a + b, 0)
  const scoreColor = score >= 16 ? 'var(--green)' : score >= 12 ? 'var(--amber)' : 'var(--red)'

  const dims = [
    { key: 'sleep',      label: 'Calidad de sueño' },
    { key: 'energy',     label: 'Nivel de energía' },
    { key: 'motivation', label: 'Motivación' },
    { key: 'soreness',   label: 'Dolor muscular' },
  ]

  return (
    <div className="anim-fade-up" style={{ padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div>
        <h1 style={{ fontSize: '1.3rem', marginBottom: 4 }}>¿Cómo estás hoy?</h1>
        <p style={{ color: 'var(--txt-2)', fontSize: '0.875rem' }}>
          Kenttä &amp; Hassmén 1998 — 4 dimensiones de readiness
        </p>
      </div>

      {dims.map(({ key, label }) => (
        <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>
              {READINESS_EMOJIS[key]} {label}
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--txt-2)' }}>
              {READINESS_LABELS[key][values[key]]}
            </span>
          </div>
          <div className="slider-wrap">
            <span style={{ fontSize: '0.75rem', color: 'var(--txt-3)', width: 16, textAlign: 'center' }}>1</span>
            <input
              type="range" min={1} max={5} step={1}
              value={values[key]}
              onChange={e => setValues(v => ({ ...v, [key]: Number(e.target.value) }))}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--txt-3)', width: 16, textAlign: 'center' }}>5</span>
          </div>
        </div>
      ))}

      {/* Score total */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: '0.75rem', color: 'var(--txt-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Readiness Score</p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '2rem', fontWeight: 500, color: scoreColor, lineHeight: 1.1 }}>
            {score}<span style={{ fontSize: '1rem', color: 'var(--txt-2)' }}>/20</span>
          </p>
        </div>
        <div style={{ fontSize: '2.5rem' }}>
          {score >= 16 ? '🟢' : score >= 12 ? '🟡' : '🔴'}
        </div>
      </div>

      {/* Peso corporal (opcional) */}
      <div className="input-group">
        <label className="input-label">Peso corporal (opcional)</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            className="input input--num"
            type="number" inputMode="decimal"
            placeholder="72.5"
            value={bodyweight}
            onChange={e => setBodyweight(e.target.value)}
            style={{ flex: 1 }}
          />
          <span style={{ color: 'var(--txt-2)', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>kg</span>
        </div>
      </div>

      <button
        className="btn btn--primary btn--full btn--lg"
        onClick={() => onComplete({
          readiness_sleep:      values.sleep,
          readiness_energy:     values.energy,
          readiness_motivation: values.motivation,
          readiness_soreness:   values.soreness,
          bodyweight_kg:        bodyweight ? parseFloat(bodyweight) : null,
        })}
      >
        Empezar entrenamiento →
      </button>
    </div>
  )
}

// ─── Sub-componente: Fila de serie registrada ──────────────────
function SetRow({ set, index }) {
  return (
    <div
      className="anim-fade-up"
      style={{
        display: 'flex', alignItems: 'center',
        gap: 10, padding: '10px 0',
        borderBottom: '0.5px solid var(--border)',
        animationDelay: `${index * 40}ms`,
      }}
    >
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: '0.75rem',
        color: 'var(--txt-3)', width: 24, textAlign: 'center',
      }}>
        {set.set_number}
      </span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 500, flex: 1 }}>
        {set.weight_kg ?? '—'} kg × {set.reps ?? '—'}
      </span>
      {set.reps_in_reserve !== null && set.reps_in_reserve !== undefined && (
        <span style={{
          fontSize: '0.7rem', fontWeight: 500, padding: '2px 7px',
          borderRadius: 4, background: 'var(--bg-3)',
          color: RIR_COLORS[set.reps_in_reserve] ?? 'var(--txt-2)',
        }}>
          {RIR_LABELS[set.reps_in_reserve] ?? `RIR ${set.reps_in_reserve}`}
        </span>
      )}
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--txt-2)' }}>
        {set.volume_kg ? Math.round(set.volume_kg) + ' kg' : ''}
      </span>
    </div>
  )
}

// ─── Sub-componente: Selector de ejercicio ─────────────────────
function ExercisePicker({ exercises, selected, onSelect }) {
  const [search, setSearch] = useState('')
  const [muscleFilter, setMuscleFilter] = useState('all')

  const muscles = ['all', ...new Set(exercises.map(e => e.muscle_group))]

  const filtered = exercises.filter(e => {
    const matchMuscle = muscleFilter === 'all' || e.muscle_group === muscleFilter
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase())
    return matchMuscle && matchSearch
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <input
        className="input"
        placeholder="Buscar ejercicio..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        autoFocus
      />
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
        {muscles.map(m => (
          <button
            key={m}
            className={`btn btn--ghost${muscleFilter === m ? ' btn--active' : ''}`}
            style={{
              height: 32, padding: '0 10px', fontSize: '0.75rem',
              whiteSpace: 'nowrap', flexShrink: 0,
              borderColor: muscleFilter === m ? 'var(--amber)' : 'transparent',
              color: muscleFilter === m ? 'var(--amber)' : 'var(--txt-2)',
            }}
            onClick={() => setMuscleFilter(m)}
          >
            {m === 'all' ? 'Todos' : m}
          </button>
        ))}
      </div>
      <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {filtered.map(ex => (
          <button
            key={ex.id}
            className="btn"
            style={{
              justifyContent: 'flex-start', height: 'auto', padding: '10px 12px',
              background: selected?.id === ex.id ? 'var(--amber-dim)' : 'transparent',
              borderColor: selected?.id === ex.id ? 'var(--amber)' : 'var(--border)',
            }}
            onClick={() => onSelect(ex)}
          >
            <span style={{ flex: 1, textAlign: 'left', fontSize: '0.9rem' }}>{ex.name}</span>
            <span className="muscle-tag">{ex.muscle_group}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── COMPONENTE PRINCIPAL ──────────────────────────────────────
export default function SessionLogger({ exercises = [] }) {
  // Estado de flujo
  const [phase, setPhase] = useState('readiness') // readiness | logging | done
  const [sessionId, setSessionId] = useState(null)
  const [sessionData, setSessionData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  // Estado del logger
  const [sets, setSets] = useState([])
  const [selectedExercise, setSelectedExercise] = useState(null)
  const [showExercisePicker, setShowExercisePicker] = useState(false)
  const [weight, setWeight] = useState(60)
  const [reps, setReps] = useState(10)
  const [rir, setRir] = useState(2)
  const [isWarmup, setIsWarmup] = useState(false)
  const [showTimer, setShowTimer] = useState(false)
  const [restTarget, setRestTarget] = useState(180)
  const [lastRestActual, setLastRestActual] = useState(null)
  const restStartRef = useRef(null)

  // Agrupar series por ejercicio para mostrar
  const setsByExercise = sets.reduce((acc, s) => {
    const key = s.exercise?.name || 'Desconocido'
    if (!acc[key]) acc[key] = []
    acc[key].push(s)
    return acc
  }, {})

  const totalVolume = sets
    .filter(s => !s.is_warmup && s.volume_kg)
    .reduce((a, s) => a + s.volume_kg, 0)

  // Número de serie para el ejercicio actual
  const currentSetNumber = sets.filter(s => s.exercise_id === selectedExercise?.id).length + 1

  // ── Crear sesión tras readiness check ─────────────────────────
  const handleReadinessComplete = async (readinessData) => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(readinessData),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      setSessionId(json.session.id)
      setSessionData(json.session)
      setPhase('logging')
    } catch (e) {
      setError(e.message)
    } finally {
      setIsLoading(false)
    }
  }

  // ── Registrar una serie ────────────────────────────────────────
  const handleLogSet = async () => {
    if (!selectedExercise) {
      setShowExercisePicker(true)
      return
    }
    setIsLoading(true)
    setError(null)

    // Calcular descanso real si había timer corriendo
    let restActual = null
    if (restStartRef.current) {
      restActual = Math.round((Date.now() - restStartRef.current) / 1000)
    }

    try {
      const res = await fetch(`/api/sessions/${sessionId}/sets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exercise_id:     selectedExercise.id,
          set_number:      currentSetNumber,
          weight_kg:       isWarmup ? weight : weight,
          reps:            reps,
          reps_in_reserve: isWarmup ? null : rir,
          is_warmup:       isWarmup,
          rest_target_sec: restTarget,
          rest_actual_sec: restActual,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      setSets(prev => [...prev, { ...json.set, exercise: selectedExercise }])

      // Iniciar timer de descanso
      restStartRef.current = Date.now()
      setLastRestActual(null)
      if (!isWarmup) setShowTimer(true)

    } catch (e) {
      setError(e.message)
    } finally {
      setIsLoading(false)
    }
  }

  // ── Completar sesión ───────────────────────────────────────────
  const handleCompleteSession = async () => {
    if (!sessionId) return
    setIsLoading(true)
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_completed: true }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setSessionData(prev => ({ ...prev, ...json.session }))
      setPhase('done')
    } catch (e) {
      setError(e.message)
    } finally {
      setIsLoading(false)
    }
  }

  // ── Fase: READINESS ────────────────────────────────────────────
  if (phase === 'readiness') {
    return (
      <div className="app-shell">
        {error && (
          <div style={{ padding: '12px 1rem', background: 'var(--red-dim)', borderBottom: '0.5px solid var(--red)', fontSize: '0.875rem', color: 'var(--red)' }}>
            {error}
          </div>
        )}
        <ReadinessCheck onComplete={handleReadinessComplete} />
        {isLoading && (
          <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--txt-2)', fontSize: '0.875rem' }}>
            Iniciando sesión...
          </div>
        )}
      </div>
    )
  }

  // ── Fase: DONE ─────────────────────────────────────────────────
  if (phase === 'done') {
    return (
      <div className="app-shell" style={{ padding: '2rem 1rem', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div className="anim-fade-up" style={{ textAlign: 'center', paddingTop: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>🏋️</div>
          <h1 style={{ marginBottom: 8 }}>Sesión completada</h1>
          <p style={{ color: 'var(--txt-2)' }}>{new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { label: 'Volumen total', value: `${Math.round(totalVolume).toLocaleString()} kg` },
            { label: 'Series', value: sets.filter(s => !s.is_warmup).length },
            { label: 'Ejercicios', value: new Set(sets.map(s => s.exercise_id)).size },
            { label: 'Readiness', value: `${sessionData?.readiness_score ?? '—'}/20` },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: 'var(--bg-1)', border: '0.5px solid var(--border)', borderRadius: 'var(--r-md)', padding: '0.875rem 1rem' }}>
              <p style={{ fontSize: '0.7rem', color: 'var(--txt-2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '1.4rem', fontWeight: 500 }}>{value}</p>
            </div>
          ))}
        </div>

        <button className="btn btn--primary btn--full btn--lg" onClick={() => window.location.reload()}>
          Nueva sesión
        </button>
      </div>
    )
  }

  // ── Fase: LOGGING ──────────────────────────────────────────────
  return (
    <div className="app-shell">
      {/* Header de sesión */}
      <div style={{
        padding: '1rem 1rem 0.75rem',
        borderBottom: '0.5px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <p style={{ fontSize: '0.7rem', color: 'var(--txt-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            En curso
          </p>
          <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
            {Math.round(totalVolume).toLocaleString()} <span style={{ fontSize: '0.8rem', color: 'var(--txt-2)', fontFamily: 'var(--font-sans)' }}>kg totales</span>
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: 'var(--green)',
          }} className="anim-pulse" />
          <span style={{ fontSize: '0.75rem', color: 'var(--txt-2)' }}>
            {sessionData?.readiness_score ?? '—'}/20
          </span>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 1rem' }}>

        {/* Timer de descanso */}
        {showTimer && (
          <div style={{ padding: '1rem 0' }}>
            <div className="card card--active">
              <p style={{ fontSize: '0.7rem', color: 'var(--txt-2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                Descansando
              </p>
              <RestTimer
                seconds={restTarget}
                onDone={() => {
                  setShowTimer(false)
                  if (restStartRef.current) {
                    setLastRestActual(Math.round((Date.now() - restStartRef.current) / 1000))
                    restStartRef.current = null
                  }
                }}
              />
            </div>
          </div>
        )}

        {/* Selector de ejercicio */}
        {showExercisePicker ? (
          <div style={{ padding: '1rem 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h2>Elegir ejercicio</h2>
              <button className="btn btn--ghost" onClick={() => setShowExercisePicker(false)}>✕</button>
            </div>
            <ExercisePicker
              exercises={exercises}
              selected={selectedExercise}
              onSelect={(ex) => {
                setSelectedExercise(ex)
                setShowExercisePicker(false)
              }}
            />
          </div>
        ) : (
          <>
            {/* Panel de entrada de serie */}
            <div style={{ paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Ejercicio seleccionado */}
              <button
                className="card"
                style={{
                  width: '100%', textAlign: 'left', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  border: selectedExercise ? '0.5px solid var(--border)' : '0.5px solid var(--amber)',
                  background: selectedExercise ? 'var(--bg-1)' : 'var(--amber-glow)',
                  transition: 'all var(--t-fast) var(--ease)',
                }}
                onClick={() => setShowExercisePicker(true)}
              >
                {selectedExercise ? (
                  <div>
                    <p style={{ fontWeight: 500 }}>{selectedExercise.name}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--txt-2)', marginTop: 2 }}>Serie {currentSetNumber} · {selectedExercise.muscle_group}</p>
                  </div>
                ) : (
                  <p style={{ color: 'var(--amber)' }}>Elegir ejercicio →</p>
                )}
                <span style={{ color: 'var(--txt-3)' }}>↓</span>
              </button>

              {/* Peso y Reps */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="input-group">
                  <label className="input-label">Peso (kg)</label>
                  <Stepper value={weight} onChange={setWeight} step={2.5} min={0} max={500} />
                </div>
                <div className="input-group">
                  <label className="input-label">Reps</label>
                  <Stepper value={reps} onChange={setReps} step={1} min={1} max={100} decimals={0} />
                </div>
              </div>

              {/* RIR — Zourdos et al. 2016 */}
              {!isWarmup && (
                <div className="input-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <label className="input-label">RIR · reps en reserva</label>
                    <span style={{
                      fontSize: '0.8rem', fontWeight: 500,
                      color: RIR_COLORS[rir] ?? 'var(--txt-2)',
                    }}>
                      {RIR_LABELS[rir] ?? `RIR ${rir}`}
                    </span>
                  </div>
                  <div className="slider-wrap">
                    <span style={{ fontSize: '0.75rem', color: 'var(--red)', width: 16, textAlign: 'center' }}>0</span>
                    <input
                      type="range" min={0} max={5} step={1}
                      value={rir}
                      onChange={e => setRir(Number(e.target.value))}
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--green)', width: 16, textAlign: 'center' }}>5</span>
                  </div>
                </div>
              )}

              {/* Descanso objetivo */}
              <div className="input-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <label className="input-label">Descanso objetivo</label>
                  <span style={{ fontSize: '0.8rem', color: 'var(--txt-2)' }}>
                    {Math.floor(restTarget/60)}:{String(restTarget%60).padStart(2,'0')} min
                  </span>
                </div>
                <div className="slider-wrap">
                  <span style={{ fontSize: '0.75rem', color: 'var(--txt-3)', width: 24 }}>60s</span>
                  <input
                    type="range" min={60} max={360} step={30}
                    value={restTarget}
                    onChange={e => setRestTarget(Number(e.target.value))}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--txt-3)', width: 24 }}>6m</span>
                </div>
              </div>

              {/* Warmup toggle */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
                <div
                  style={{
                    width: 36, height: 20, borderRadius: 10,
                    background: isWarmup ? 'var(--amber)' : 'var(--bg-3)',
                    border: '0.5px solid var(--border)',
                    position: 'relative', transition: 'background var(--t-fast) var(--ease)',
                  }}
                  onClick={() => setIsWarmup(w => !w)}
                >
                  <div style={{
                    position: 'absolute', top: 2, left: isWarmup ? 18 : 2,
                    width: 14, height: 14, borderRadius: '50%',
                    background: 'var(--txt-1)',
                    transition: 'left var(--t-fast) var(--ease)',
                  }} />
                </div>
                <span style={{ fontSize: '0.875rem', color: 'var(--txt-2)' }}>Serie de calentamiento</span>
              </label>

              {error && (
                <p style={{ fontSize: '0.875rem', color: 'var(--red)', padding: '8px 0' }}>{error}</p>
              )}

              {/* Botón principal */}
              <button
                className="btn btn--primary btn--full btn--lg"
                onClick={handleLogSet}
                disabled={isLoading}
                style={{ marginTop: 4 }}
              >
                {isLoading ? 'Guardando...' : `Registrar serie ${currentSetNumber}`}
              </button>
            </div>

            {/* Series registradas */}
            {sets.length > 0 && (
              <div style={{ paddingTop: '1.5rem' }}>
                <h3 style={{ marginBottom: 12 }}>Series registradas</h3>
                {Object.entries(setsByExercise).map(([exName, exSets]) => (
                  <div key={exName} style={{ marginBottom: '1.25rem' }}>
                    <p style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: 6, color: 'var(--txt-2)' }}>
                      {exName}
                    </p>
                    {exSets.map((s, i) => <SetRow key={s.id} set={s} index={i} />)}
                  </div>
                ))}
              </div>
            )}

            {/* Botón terminar sesión */}
            {sets.length > 0 && (
              <div style={{ padding: '1.5rem 0 2rem' }}>
                <button
                  className="btn btn--full"
                  onClick={handleCompleteSession}
                  disabled={isLoading}
                  style={{ borderColor: 'var(--green)', color: 'var(--green)' }}
                >
                  {isLoading ? 'Guardando...' : 'Terminar sesión ✓'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
