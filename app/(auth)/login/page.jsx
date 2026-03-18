'use client'
// app/(auth)/login/page.jsx

import { useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode]         = useState('login')
  const [loading, setLoading]   = useState(false)
  const [message, setMessage]   = useState(null)
  const [error, setError]       = useState(null)

  const supabase = createClient()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true); setError(null); setMessage(null)

    if (mode === 'register') {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) { setError(error.message); setLoading(false); return }
      setMessage('Cuenta creada. Puedes ingresar ahora.')
      setMode('login')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError(error.message); setLoading(false); return }
      window.location.href = '/log'
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex', flexDirection: 'column',
      background: 'var(--bg-0)',
    }}>
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(74,106,138,0.08) 0%, transparent 70%)',
      }} />

      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '2rem 1.5rem',
        position: 'relative', zIndex: 1,
      }}>
        <div style={{ width: '100%', maxWidth: 340 }} className="anim-fade-up">

          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <svg width="44" height="44" viewBox="0 0 32 32" fill="none" className="anim-blade">
                <line x1="16" y1="4"  x2="16" y2="26" stroke="var(--amber)"       strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="10" y1="20" x2="22" y2="20" stroke="var(--amber)"       strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="16" y1="26" x2="16" y2="29" stroke="var(--amber)"       strokeWidth="2.5" strokeLinecap="round"/>
                <circle cx="16" cy="4" r="1.5" fill="var(--amber-light)"/>
              </svg>
            </div>
            <p style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '1.6rem', fontWeight: 500,
              letterSpacing: '-0.03em', color: 'var(--amber)',
              marginBottom: 6,
            }}>
              AiRen
            </p>
            <p style={{
              fontSize: '0.7rem', letterSpacing: '0.12em',
              textTransform: 'uppercase', color: 'var(--txt-3)',
            }}>
              cada día cuenta
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="input-group">
              <label className="input-label" htmlFor="email">Email</label>
              <input
                id="email" className="input" type="email"
                placeholder="tu@email.com" required
                value={email} onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div className="input-group">
              <label className="input-label" htmlFor="password">Contraseña</label>
              <input
                id="password" className="input" type="password"
                placeholder="••••••••" required minLength={8}
                value={password} onChange={e => setPassword(e.target.value)}
              />
            </div>

            {error   && <p style={{ fontSize: '0.85rem', color: 'var(--red)' }}>{error}</p>}
            {message && <p style={{ fontSize: '0.85rem', color: 'var(--green)' }}>{message}</p>}

            <button
              className="btn btn--primary btn--full btn--lg"
              type="submit" disabled={loading}
              style={{ marginTop: 6 }}
            >
              {loading ? '...' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
            <button
              className="btn btn--ghost"
              onClick={() => { setMode(m => m === 'login' ? 'register' : 'login'); setError(null) }}
              style={{ fontSize: '0.8rem' }}
            >
              {mode === 'login' ? '¿Primera vez? Crear cuenta' : '¿Ya tienes cuenta? Entrar'}
            </button>
          </div>

          <div className="blade-line--h" style={{ margin: '2rem 0 1.25rem' }} />

          <p style={{
            textAlign: 'center', fontSize: '0.72rem',
            color: 'var(--txt-3)', lineHeight: 1.7, letterSpacing: '0.02em',
          }}>
            Bienestar integral construido sobre evidencia científica.<br />
            El progreso no es lineal — pero aparece si sigues apareciendo.
          </p>

        </div>
      </div>
    </div>
  )
}
