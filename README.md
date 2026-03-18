<<<<<<< HEAD
# AiRen
Airen no empieza con talento, empieza con un espada clavada en el suelo y un compromiso de volver cada día. Eso es lo que esta plataforma representa — no resultados inmediatos, sino el acto diario de aparecer.
=======
# GymLog

**Seguimiento de entrenamiento basado en evidencia científica.**

> *"El progreso no es lineal — pero aparece si sigues apareciendo."*

---

## Por qué existe este proyecto

GymLog nació en memoria de alguien que partió por causas de bienestar mental.

Este proyecto es una respuesta activa: si el bienestar integral —físico, mental, emocional— puede medirse, entenderse y apoyarse con herramientas concretas, entonces construir esas herramientas es una forma de honrar esa pérdida.

El nombre de la obra que inspiró la identidad visual es *Reformation of the Deadbeat Noble*. Su protagonista, Airen, no empieza con talento. Empieza con una espada clavada en el suelo y un compromiso silencioso: volver cada día. Ese es el núcleo de lo que este proyecto intenta representar — no el resultado, sino el acto de aparecer.

---

## Stack

| Capa | Tecnología | Costo |
|---|---|---|
| Frontend + API | Next.js 14 → Vercel | $0 |
| Base de datos + Auth | Supabase (PostgreSQL) | $0 |
| Repositorio + CI | GitHub | $0 |

**Costo total en desarrollo y primeros 500 usuarios: $0.**

---

## Fundamentos de investigación

Cada decisión de diseño de datos está justificada por investigación publicada:

| Concepto | Implementación | Referencia |
|---|---|---|
| RIR (Reps in Reserve) | Campo `reps_in_reserve` por serie | Zourdos et al. 2016; Helms et al. 2016 |
| Readiness 4 dimensiones | `readiness_sleep/energy/motivation/soreness` | Kenttä & Hassmén 1998 |
| Volumen MEV/MAV/MRV | Estructura de `training_blocks` | Israetel, Hoffman & Smith 2015 |
| E1RM Epley | Columna generada `e1rm_kg` | Epley 1985 |
| Descanso entre series | `rest_target_sec` + timer | Schoenfeld et al. 2016 JSCR |
| Periodización | `phase` en training_blocks | Bompa 1983; Haff 2016 |
| Adherencia y hábito | Módulo 5 (roadmap) | Lally et al. 2010; Gollwitzer 1999 |

---

## Setup local

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-usuario/gymlog
cd gymlog

# 2. Instalar dependencias
npm install

# 3. Variables de entorno
cp .env.local.example .env.local
# Completar NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY
# desde tu proyecto en supabase.com → Settings → API

# 4. Deploy del schema en Supabase
# Abrir Supabase → SQL Editor → pegar gymlog_schema.sql → ejecutar

# 5. Desarrollo local
npm run dev
```

---

## Variables de entorno

```
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

---

## Módulos (roadmap)

- [x] **Módulo 1** — Core Logger (readiness check + series + timer)
- [ ] **Módulo 2** — Training Blocks (mesociclos, MEV/MAV/MRV)
- [ ] **Módulo 3** — Progressive Overload Dashboard
- [ ] **Módulo 4** — Recovery & Wellbeing (correlaciones readiness ↔ performance)
- [ ] **Módulo 5** — Smart Suggestions (adherencia + recomendaciones)

---

## Estructura del proyecto

```
gymlog/
├── app/
│   ├── (auth)/login/         # Autenticación
│   ├── (app)/log/            # Logger de sesiones
│   │   └── components/       # SessionLogger, Stepper, Timer
│   ├── api/
│   │   ├── sessions/         # POST, GET, PATCH
│   │   └── exercises/        # GET, POST
│   ├── globals.css           # Sistema de diseño
│   └── layout.jsx
├── components/
│   └── Logo.jsx              # Símbolo + wordmark
├── lib/
│   ├── supabase.js           # Cliente browser
│   └── supabase-server.js    # Cliente server + requireAuth
├── middleware.js             # Protección de rutas
├── gymlog_schema.sql         # Schema completo con RLS y triggers
└── README.md
```

---

## Contribuir

Este proyecto es open source. Si quieres contribuir, abre un issue describiendo qué quieres mejorar. Los PRs son bienvenidos, especialmente los que refuercen la base de evidencia científica detrás de cada módulo.

---

*Construido con cuidado. Para quienes aparecen cada día.*
>>>>>>> 884f649 (feat: módulo 1 — core logger, schema supabase, PWA)
