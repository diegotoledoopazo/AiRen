// app/api/sessions/route.js
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/supabase-server'

const CreateSessionSchema = z.object({
  block_id:             z.string().uuid().optional().nullable(),
  day_label:            z.string().max(80).optional().nullable(),
  date:                 z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  bodyweight_kg:        z.number().min(20).max(400).optional().nullable(),
  readiness_sleep:      z.number().int().min(1).max(5).optional().nullable(),
  readiness_energy:     z.number().int().min(1).max(5).optional().nullable(),
  readiness_motivation: z.number().int().min(1).max(5).optional().nullable(),
  readiness_soreness:   z.number().int().min(1).max(5).optional().nullable(),
  notes:                z.string().max(500).optional().nullable(),
})

export async function POST(request) {
  try {
    const { user, supabase } = await requireAuth(request)

    const body = await request.json()
    const parsed = CreateSessionSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('sessions')
      .insert({
        user_id:              user.id,
        date:                 parsed.data.date || new Date().toISOString().split('T')[0],
        block_id:             parsed.data.block_id,
        day_label:            parsed.data.day_label,
        bodyweight_kg:        parsed.data.bodyweight_kg,
        readiness_sleep:      parsed.data.readiness_sleep,
        readiness_energy:     parsed.data.readiness_energy,
        readiness_motivation: parsed.data.readiness_motivation,
        readiness_soreness:   parsed.data.readiness_soreness,
        notes:                parsed.data.notes,
        started_at:           new Date().toISOString(),
        is_completed:         false,
      })
      .select(`
        id, date, day_label, block_id,
        readiness_score, readiness_sleep, readiness_energy,
        readiness_motivation, readiness_soreness,
        bodyweight_kg, total_volume_kg, is_completed,
        started_at, notes
      `)
      .single()

    if (error) throw error

    return NextResponse.json({ session: data }, { status: 201 })

  } catch (err) {
    if (err instanceof Response) return err
    console.error('[POST /api/sessions]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function GET(request) {
  try {
    const { user, supabase } = await requireAuth(request)

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)

    const { data, error } = await supabase
      .from('sessions')
      .select(`
        id, date, day_label, block_id,
        readiness_score, bodyweight_kg,
        total_volume_kg, is_completed,
        started_at, completed_at,
        training_blocks(name, phase)
      `)
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(limit)

    if (error) throw error

    return NextResponse.json({ sessions: data })

  } catch (err) {
    if (err instanceof Response) return err
    console.error('[GET /api/sessions]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
