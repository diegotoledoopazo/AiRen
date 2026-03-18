// components/Logo.jsx
// Logo de GymLog — marca original
//
// El símbolo: una línea vertical (la espada) que se afina hacia arriba,
// cruzada por una línea horizontal mínima (el esfuerzo que persiste).
// No es una espada literal — es la abstracción de un compromiso:
// volver cada día, sin importar el punto de partida.
//
// Referencia conceptual: la imagen de Airen con la espada clavada en el suelo,
// la espalda al espectador — no el resultado, el proceso.

export default function Logo({ size = 32, showWordmark = true, className = '' }) {
  return (
    <div className={`brand-logo ${className}`} style={{ display: 'flex', alignItems: 'center', gap: showWordmark ? 10 : 0 }}>
      {/* Símbolo */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Hoja de la espada — línea vertical con punto de fuerza */}
        <line
          x1="16" y1="4"
          x2="16" y2="26"
          stroke="var(--amber)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        {/* Guarda — la línea horizontal que da forma a la cruz */}
        <line
          x1="10" y1="20"
          x2="22" y2="20"
          stroke="var(--amber)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        {/* Empuñadura — masa de donde viene la fuerza */}
        <line
          x1="16" y1="26"
          x2="16" y2="29"
          stroke="var(--amber)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        {/* Punto de luz en la punta — el objetivo que se persigue */}
        <circle
          cx="16" cy="4"
          r="1.5"
          fill="var(--amber-light)"
        />
      </svg>

      {/* Wordmark */}
      {showWordmark && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span className="brand-wordmark" style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '1rem',
            fontWeight: 500,
            letterSpacing: '-0.02em',
            color: 'var(--amber)',
            lineHeight: 1,
          }}>
            GymLog
          </span>
          <span style={{
            fontSize: '0.55rem',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--txt-3)',
            lineHeight: 1,
          }}>
            cada día cuenta
          </span>
        </div>
      )}
    </div>
  )
}
