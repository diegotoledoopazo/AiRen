// app/api/sessions/[id]/sets/route.js
// POST /api/sessions/:id/sets — registra una serie dentro de una sesión
// GET  /api/sessions/:id/sets — devuelve todas las series de la sesión

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/supabase-server'

// reps_in_reserve implementa Zourdos et al. (2016):
// RIR 3-4: lejos del fallo — volumen / acumulación
// RIR 1-2: cerca del fallo — intensificación
// RIR 0:   fallo — usar con moderación (Schoenfeld 2010)
const CreateSetSchema = z.object({
  exercise_id:      z.string().uuid(),
  set_number:       z.number().int().min(1),
  weight_kg:        z.number().min(0).max(1500).optional().nullable(),
  reps:             z.number().int().min(1).max(200).optional().nullable(),
  reps_in_reserve:  z.number().int().min(0).max(10).optional().nullable(),
  is_warmup:        z.boolean().default(false),
  rest_target_sec:  z.number().int().min(0).max(600).optional().nullable(),
  rest_actual_sec:  z.number().int().min(0).max(3600).optional().nullable(),
})

export async function POST(request, { params }) {
  try {
    const { user, supabase } = await requireAuth()

    // Verificar que la sesión pertenece al usuario
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, is_completed')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 })
    }
    if (session.is_completed) {
      return NextResponse.json(
        { error: 'No se pueden agregar series a una sesión completada' },
        { status: 409 }
      )
    }

    const body = await request.json()
    const parsed = CreateSetSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('sets')
      .insert({
        session_id:       params.id,
        exercise_id:      parsed.data.exercise_id,
        set_number:       parsed.data.set_number,
        weight_kg:        parsed.data.weight_kg,
        reps:             parsed.data.reps,
        reps_in_reserve:  parsed.data.reps_in_reserve,
        is_warmup:        parsed.data.is_warmup,
        rest_target_sec:  parsed.data.rest_target_sec,
        rest_actual_sec:  parsed.data.rest_actual_sec,
      })
      .select(`
        id, set_number, weight_kg, reps, reps_in_reserve,
        is_warmup, volume_kg, e1rm_kg,
        rest_target_sec, rest_actual_sec,
        exercise:exercises(id, name, muscle_group)
      `)
      .single()

    if (error) throw error

    // El trigger recalcula total_volume_kg en sessions automáticamente
    return NextResponse.json({ set: data }, { status: 201 })

  } catch (err) {
    if (err instanceof Response) return err
    console.error('[POST /api/sessions/:id/sets]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function GET(request, { params }) {
  try {
    const { user, supabase } = await requireAuth()

    // Verificar que la sesión es del usuario
    const { data: session } = await supabase
      .from('sessions')
      .select('id')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (!session) {
      return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 })
    }

    const { data, error } = await supabase
      .from('sets')
      .select(`
        id, set_number, weight_kg, reps, reps_in_reserve,
        is_warmup, volume_kg, e1rm_kg,
        rest_target_sec, rest_actual_sec,
        exercise:exercises(id, name, muscle_group, movement_pattern)
      `)
      .eq('session_id', params.id)
      .order('set_number', { ascending: true })

    if (error) throw error

    return NextResponse.json({ sets: data })

  } catch (err) {
    if (err instanceof Response) return err
    console.error('[GET /api/sessions/:id/sets]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
