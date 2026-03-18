// app/api/sessions/[id]/route.js
// PATCH /api/sessions/:id — actualiza la sesión (RPE final, notas, completar)

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/supabase-server'

const PatchSessionSchema = z.object({
  session_rpe:  z.number().int().min(1).max(10).optional(),
  notes:        z.string().max(500).optional().nullable(),
  is_completed: z.boolean().optional(),
})

export async function PATCH(request, { params }) {
  try {
    const { user, supabase } = await requireAuth()

    const body = await request.json()
    const parsed = PatchSessionSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const updates = { ...parsed.data }
    if (parsed.data.is_completed) {
      updates.completed_at = new Date().toISOString()
    }

    // RLS garantiza que solo el dueño puede actualizar su sesión
    const { data, error } = await supabase
      .from('sessions')
      .update(updates)
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select('id, session_rpe, is_completed, completed_at, total_volume_kg, notes')
      .single()

    if (error) throw error
    if (!data) {
      return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 })
    }

    return NextResponse.json({ session: data })

  } catch (err) {
    if (err instanceof Response) return err
    console.error('[PATCH /api/sessions/:id]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
