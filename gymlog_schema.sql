-- ═══════════════════════════════════════════════════════════════════
--  GYMLOG — Supabase PostgreSQL Schema
--  Versión: 1.0  |  Módulo: 1 — Core Logger
--
--  Fundamentos de investigación:
--    · RIR (reps_in_reserve): Zourdos et al. 2016; Helms et al. 2016
--    · Readiness 4D: Kenttä & Hassmén 1998 (OMNI-RES derivado)
--    · Volumen MEV/MAV/MRV: Israetel, Hoffman & Smith 2015
--    · E1RM Epley: Epley 1985 — peso × (1 + reps/30)
--    · Periodización: Bompa 1983; Haff & Triplett 2016
--    · Descanso entre series: Schoenfeld et al. 2016 JSCR
--
--  Instrucciones de deploy:
--    1. Abrir Supabase → SQL Editor
--    2. Pegar y ejecutar en orden: extensions → tables → indexes → RLS → triggers → functions
-- ═══════════════════════════════════════════════════════════════════


-- ─── 0. EXTENSIONES ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ─── 1. TABLAS ────────────────────────────────────────────────────

-- profiles
-- Extiende auth.users de Supabase Auth.
-- training_goal y experience_level informan los defaults de MEV/MAV.
CREATE TABLE IF NOT EXISTS profiles (
  id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name      TEXT,
  training_since    DATE,                          -- para calcular antigüedad
  training_goal     TEXT CHECK (training_goal IN (
                      'hypertrophy', 'strength', 'endurance', 'general_fitness'
                    )) DEFAULT 'hypertrophy',
  experience_level  TEXT CHECK (experience_level IN (
                      'beginner', 'intermediate', 'advanced'
                    )) DEFAULT 'intermediate',
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE profiles IS 'Perfil de usuario. Extiende auth.users. training_goal y experience_level alimentan los defaults de MEV/MAV (Israetel et al. 2015).';


-- exercises
-- Catálogo global + ejercicios custom por usuario.
-- movement_pattern es crítico para distribuir volumen por patrón (no solo músculo).
CREATE TABLE IF NOT EXISTS exercises (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             TEXT NOT NULL,
  muscle_group     TEXT NOT NULL CHECK (muscle_group IN (
                     'chest', 'back', 'shoulders', 'biceps', 'triceps',
                     'forearms', 'quads', 'hamstrings', 'glutes', 'calves',
                     'core', 'full_body'
                   )),
  movement_pattern TEXT CHECK (movement_pattern IN (
                     'push_horizontal', 'push_vertical',
                     'pull_horizontal', 'pull_vertical',
                     'hinge', 'squat', 'carry', 'isolation'
                   )),
  is_compound      BOOLEAN DEFAULT TRUE,
  created_by       UUID REFERENCES auth.users(id),  -- NULL = ejercicio global del catálogo
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE exercises IS 'Catálogo de ejercicios. created_by NULL = global. movement_pattern permite distribuir volumen por patrón de movimiento, no solo por músculo.';


-- training_blocks
-- Un bloque = un mesociclo (ej: Acumulación 4 semanas, RIR 3→1).
-- rir_target decrece semana a semana dentro del bloque — se maneja en frontend.
-- Concepto de Bompa 1983 y el modelo MEV/MAV/MRV de Israetel 2015.
CREATE TABLE IF NOT EXISTS training_blocks (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,                -- ej: "Bloque 1 — Acumulación"
  phase          TEXT CHECK (phase IN (
                   'accumulation', 'intensification', 'realization', 'deload'
                 )) DEFAULT 'accumulation',
  start_date     DATE NOT NULL,
  end_date       DATE,
  rir_target     INT CHECK (rir_target BETWEEN 0 AND 5) DEFAULT 3,
                                               -- RIR objetivo para el bloque
                                               -- Zourdos et al. 2016: RIR 3-4 = volumen, RIR 0-1 = fuerza
  is_active      BOOLEAN DEFAULT TRUE,
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE training_blocks IS 'Mesociclo de entrenamiento. rir_target define la proximidad al fallo para el bloque completo (Zourdos et al. 2016). Fase informa el énfasis de adaptación (Bompa 1983).';


-- sessions
-- Una sesión = un entrenamiento completo.
-- readiness_* implementa el protocolo de 4 dimensiones de Kenttä & Hassmén (1998).
-- Escala 1–5 por dimensión → readiness_score agregado 1–20.
CREATE TABLE IF NOT EXISTS sessions (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  block_id             UUID REFERENCES training_blocks(id) ON DELETE SET NULL,
  date                 DATE NOT NULL DEFAULT CURRENT_DATE,
  day_label            TEXT,                   -- ej: "Día A — Push"

  -- Readiness pre-sesión (Kenttä & Hassmén 1998)
  -- 1 = muy bajo / 5 = óptimo
  readiness_sleep      INT CHECK (readiness_sleep BETWEEN 1 AND 5),
  readiness_energy     INT CHECK (readiness_energy BETWEEN 1 AND 5),
  readiness_motivation INT CHECK (readiness_motivation BETWEEN 1 AND 5),
  readiness_soreness   INT CHECK (readiness_soreness BETWEEN 1 AND 5),
                                               -- soreness: 1 = mucho dolor / 5 = sin dolor
  readiness_score      INT GENERATED ALWAYS AS (
                         COALESCE(readiness_sleep, 0) +
                         COALESCE(readiness_energy, 0) +
                         COALESCE(readiness_motivation, 0) +
                         COALESCE(readiness_soreness, 0)
                       ) STORED,               -- 4–20, calculado automáticamente

  -- Métricas post-sesión
  session_rpe          INT CHECK (session_rpe BETWEEN 1 AND 10),
                                               -- RPE global de la sesión (Borg 1970 / Foster 1998)
  bodyweight_kg        NUMERIC(5,2),
  total_volume_kg      NUMERIC(10,2),          -- calculado por trigger
  notes                TEXT,
  started_at           TIMESTAMPTZ,
  completed_at         TIMESTAMPTZ,
  is_completed         BOOLEAN DEFAULT FALSE,

  created_at           TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE sessions IS 'Sesión de entrenamiento. readiness_score agrega las 4 dimensiones de Kenttä & Hassmén (1998). total_volume_kg se recalcula automáticamente por trigger.';


-- sets
-- Una fila = una serie trabajadora (o de calentamiento).
-- reps_in_reserve implementa Zourdos et al. 2016 — mejor predictor de proximidad al fallo que % 1RM.
-- e1rm_kg calculado según Epley 1985: peso × (1 + reps/30).
CREATE TABLE IF NOT EXISTS sets (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id        UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  exercise_id       UUID NOT NULL REFERENCES exercises(id),
  set_number        INT NOT NULL CHECK (set_number > 0),

  -- Datos de carga (Zatsiorsky & Kraemer 2006)
  weight_kg         NUMERIC(6,2),
  reps              INT CHECK (reps > 0),
  reps_in_reserve   INT CHECK (reps_in_reserve BETWEEN 0 AND 10),
                                               -- Zourdos et al. 2016: cuántas reps faltaron para el fallo
  is_warmup         BOOLEAN DEFAULT FALSE,     -- series de calentamiento excluidas del cálculo de volumen

  -- Descanso (Schoenfeld et al. 2016 JSCR: ≥3 min óptimo para hipertrofia)
  rest_target_sec   INT,
  rest_actual_sec   INT,

  -- Calculados automáticamente
  volume_kg         NUMERIC(10,2) GENERATED ALWAYS AS (
                      CASE WHEN is_warmup THEN 0
                           ELSE COALESCE(weight_kg, 0) * COALESCE(reps, 0)
                      END
                    ) STORED,
  e1rm_kg           NUMERIC(6,2) GENERATED ALWAYS AS (
                      CASE WHEN reps IS NOT NULL AND weight_kg IS NOT NULL AND reps > 0
                           THEN ROUND(CAST(weight_kg * (1 + reps::NUMERIC / 30) AS NUMERIC), 2)
                           ELSE NULL
                      END
                    ) STORED,                  -- Epley 1985: predictor de fuerza máxima

  created_at        TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE sets IS 'Serie individual. reps_in_reserve según Zourdos et al. 2016. volume_kg y e1rm_kg (Epley 1985) calculados automáticamente. is_warmup excluye la serie del volumen total.';


-- bodyweight_log
-- Registro diario de peso corporal separado de sessions.
-- Permite calcular progresión de composición corporal independientemente del entrenamiento.
CREATE TABLE IF NOT EXISTS bodyweight_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  weight_kg   NUMERIC(5,2) NOT NULL,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, date)                       -- un registro por día
);


-- ─── 2. ÍNDICES ───────────────────────────────────────────────────
-- Consultas frecuentes: por usuario+fecha, por sesión, por ejercicio

CREATE INDEX IF NOT EXISTS idx_sessions_user_date
  ON sessions (user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_sets_session
  ON sets (session_id);

CREATE INDEX IF NOT EXISTS idx_sets_exercise
  ON sets (exercise_id);

CREATE INDEX IF NOT EXISTS idx_sets_session_exercise
  ON sets (session_id, exercise_id);

CREATE INDEX IF NOT EXISTS idx_training_blocks_user_active
  ON training_blocks (user_id, is_active);

CREATE INDEX IF NOT EXISTS idx_bodyweight_user_date
  ON bodyweight_log (user_id, date DESC);


-- ─── 3. ROW LEVEL SECURITY (RLS) ─────────────────────────────────
-- Cada usuario solo puede ver y modificar sus propios datos.
-- exercises globales (created_by IS NULL) son visibles para todos.

ALTER TABLE profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises        ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_blocks  ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE sets             ENABLE ROW LEVEL SECURITY;
ALTER TABLE bodyweight_log   ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "profiles: own data" ON profiles
  FOR ALL USING (auth.uid() = id);

-- exercises: ver globales + propios; modificar solo propios
CREATE POLICY "exercises: read global and own" ON exercises
  FOR SELECT USING (created_by IS NULL OR created_by = auth.uid());

CREATE POLICY "exercises: insert own" ON exercises
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "exercises: update own" ON exercises
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "exercises: delete own" ON exercises
  FOR DELETE USING (created_by = auth.uid());

-- training_blocks
CREATE POLICY "blocks: own data" ON training_blocks
  FOR ALL USING (user_id = auth.uid());

-- sessions
CREATE POLICY "sessions: own data" ON sessions
  FOR ALL USING (user_id = auth.uid());

-- sets (acceso a través de la sesión del usuario)
CREATE POLICY "sets: own data" ON sets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = sets.session_id AND s.user_id = auth.uid()
    )
  );

-- bodyweight_log
CREATE POLICY "bodyweight: own data" ON bodyweight_log
  FOR ALL USING (user_id = auth.uid());


-- ─── 4. TRIGGERS ─────────────────────────────────────────────────

-- 4a. Auto-crear profile cuando se registra un usuario en auth.users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', ''));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 4b. Recalcular total_volume_kg en sessions cuando se inserta/actualiza/borra una serie
-- Solo suma series trabajadoras (is_warmup = FALSE)
CREATE OR REPLACE FUNCTION recalculate_session_volume()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  target_session_id UUID;
BEGIN
  -- Determinar qué sesión actualizar
  IF TG_OP = 'DELETE' THEN
    target_session_id := OLD.session_id;
  ELSE
    target_session_id := NEW.session_id;
  END IF;

  UPDATE sessions
  SET total_volume_kg = (
    SELECT COALESCE(SUM(volume_kg), 0)
    FROM sets
    WHERE session_id = target_session_id
      AND is_warmup = FALSE
  )
  WHERE id = target_session_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_recalculate_volume ON sets;
CREATE TRIGGER trg_recalculate_volume
  AFTER INSERT OR UPDATE OR DELETE ON sets
  FOR EACH ROW EXECUTE FUNCTION recalculate_session_volume();

-- 4c. Actualizar updated_at en profiles automáticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ─── 5. FUNCIONES SQL (ANALYTICS) ────────────────────────────────
-- Estas funciones serán llamadas desde el backend Node.js.
-- Se pueden exponer como RPC de Supabase.

-- Volumen semanal por músculo (últimas N semanas)
-- Contexto: Israetel MEV ~10 series/semana — MAV ~15-20 — MRV ~20-25
CREATE OR REPLACE FUNCTION weekly_volume_by_muscle(
  p_user_id  UUID,
  p_weeks    INT DEFAULT 8
)
RETURNS TABLE (
  week             DATE,
  muscle_group     TEXT,
  total_volume_kg  NUMERIC,
  total_sets       BIGINT,
  avg_rir          NUMERIC
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    DATE_TRUNC('week', se.date)::DATE AS week,
    ex.muscle_group,
    ROUND(SUM(st.volume_kg)::NUMERIC, 1)  AS total_volume_kg,
    COUNT(*)                              AS total_sets,
    ROUND(AVG(st.reps_in_reserve), 1)     AS avg_rir
  FROM sets st
  JOIN sessions  se ON se.id = st.session_id
  JOIN exercises ex ON ex.id = st.exercise_id
  WHERE se.user_id = p_user_id
    AND st.is_warmup = FALSE
    AND se.date >= CURRENT_DATE - (p_weeks * 7)
  GROUP BY DATE_TRUNC('week', se.date), ex.muscle_group
  ORDER BY week DESC, total_volume_kg DESC;
$$;

-- PRs por ejercicio (E1RM histórico — Epley 1985)
CREATE OR REPLACE FUNCTION personal_records(p_user_id UUID)
RETURNS TABLE (
  exercise_id    UUID,
  exercise_name  TEXT,
  muscle_group   TEXT,
  best_e1rm_kg   NUMERIC,
  weight_kg      NUMERIC,
  reps           INT,
  achieved_on    DATE
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT DISTINCT ON (st.exercise_id)
    st.exercise_id,
    ex.name          AS exercise_name,
    ex.muscle_group,
    st.e1rm_kg       AS best_e1rm_kg,
    st.weight_kg,
    st.reps,
    se.date          AS achieved_on
  FROM sets st
  JOIN sessions  se ON se.id = st.session_id
  JOIN exercises ex ON ex.id = st.exercise_id
  WHERE se.user_id = p_user_id
    AND st.e1rm_kg IS NOT NULL
    AND st.is_warmup = FALSE
  ORDER BY st.exercise_id, st.e1rm_kg DESC;
$$;

-- Readiness promedio por semana (Kenttä & Hassmén 1998)
CREATE OR REPLACE FUNCTION weekly_readiness(
  p_user_id UUID,
  p_weeks   INT DEFAULT 8
)
RETURNS TABLE (
  week                   DATE,
  avg_readiness_score    NUMERIC,
  avg_sleep              NUMERIC,
  avg_energy             NUMERIC,
  avg_motivation         NUMERIC,
  avg_soreness           NUMERIC,
  sessions_count         BIGINT
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    DATE_TRUNC('week', date)::DATE AS week,
    ROUND(AVG(readiness_score), 1) AS avg_readiness_score,
    ROUND(AVG(readiness_sleep), 1) AS avg_sleep,
    ROUND(AVG(readiness_energy), 1) AS avg_energy,
    ROUND(AVG(readiness_motivation), 1) AS avg_motivation,
    ROUND(AVG(readiness_soreness), 1) AS avg_soreness,
    COUNT(*) AS sessions_count
  FROM sessions
  WHERE user_id = p_user_id
    AND readiness_score IS NOT NULL
    AND date >= CURRENT_DATE - (p_weeks * 7)
  GROUP BY DATE_TRUNC('week', date)
  ORDER BY week DESC;
$$;


-- ─── 6. CATÁLOGO DE EJERCICIOS (seed) ────────────────────────────
-- Ejercicios globales (created_by IS NULL) disponibles para todos los usuarios.

INSERT INTO exercises (name, muscle_group, movement_pattern, is_compound, created_by) VALUES
  -- Pecho
  ('Bench Press',              'chest', 'push_horizontal', TRUE,  NULL),
  ('Incline Bench Press',      'chest', 'push_horizontal', TRUE,  NULL),
  ('Cable Fly',                'chest', 'isolation',       FALSE, NULL),
  ('Dumbbell Fly',             'chest', 'isolation',       FALSE, NULL),
  -- Espalda
  ('Pull-Up',                  'back',  'pull_vertical',   TRUE,  NULL),
  ('Barbell Row',              'back',  'pull_horizontal', TRUE,  NULL),
  ('Cable Row',                'back',  'pull_horizontal', TRUE,  NULL),
  ('Lat Pulldown',             'back',  'pull_vertical',   TRUE,  NULL),
  ('Face Pull',                'back',  'pull_horizontal', FALSE, NULL),
  -- Hombros
  ('Overhead Press',           'shoulders', 'push_vertical',   TRUE,  NULL),
  ('Lateral Raise',            'shoulders', 'isolation',       FALSE, NULL),
  ('Rear Delt Fly',            'shoulders', 'isolation',       FALSE, NULL),
  -- Bíceps
  ('Barbell Curl',             'biceps', 'isolation', FALSE, NULL),
  ('Hammer Curl',              'biceps', 'isolation', FALSE, NULL),
  ('Incline Dumbbell Curl',    'biceps', 'isolation', FALSE, NULL),
  -- Tríceps
  ('Tricep Pushdown',          'triceps', 'isolation', FALSE, NULL),
  ('Overhead Tricep Extension','triceps', 'isolation', FALSE, NULL),
  ('Dip',                      'triceps', 'push_vertical', TRUE, NULL),
  -- Piernas
  ('Squat',                    'quads',      'squat',  TRUE,  NULL),
  ('Leg Press',                'quads',      'squat',  TRUE,  NULL),
  ('Leg Extension',            'quads',      'isolation', FALSE, NULL),
  ('Romanian Deadlift',        'hamstrings', 'hinge',  TRUE,  NULL),
  ('Leg Curl',                 'hamstrings', 'isolation', FALSE, NULL),
  ('Hip Thrust',               'glutes',     'hinge',  TRUE,  NULL),
  ('Walking Lunge',            'glutes',     'squat',  TRUE,  NULL),
  ('Calf Raise',               'calves',     'isolation', FALSE, NULL),
  -- Core
  ('Plank',                    'core', 'carry',     FALSE, NULL),
  ('Cable Crunch',             'core', 'isolation', FALSE, NULL),
  -- Full body
  ('Deadlift',                 'back', 'hinge', TRUE, NULL),
  ('Power Clean',              'full_body', 'hinge', TRUE, NULL)
ON CONFLICT DO NOTHING;


-- ─── FIN DEL SCHEMA ───────────────────────────────────────────────
-- Próximo paso: estructura de proyecto Next.js + endpoints API
-- Ver: 02_backend_setup.md

