// app/api/exercises/route.js
// GET /api/exercises  — catálogo global + ejercicios custom del usuario
// POST /api/exercises — crear ejercicio custom

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/supabase-server'

export async function GET(request) {
  try {
    const { user, supabase } = await requireAuth()

    const { searchParams } = new URL(request.url)
    const muscle = searchParams.get('muscle')
    const search = searchParams.get('q')

    let query = supabase
      .from('exercises')
      .select('id, name, muscle_group, movement_pattern, is_compound, created_by')
      .order('name', { ascending: true })

    if (muscle) query = query.eq('muscle_group', muscle)
    if (search) query = query.ilike('name', `%${search}%`)

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ exercises: data })

  } catch (err) {
    if (err instanceof Response) return err
    console.error('[GET /api/exercises]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

const CreateExerciseSchema = z.object({
  name:             z.string().min(2).max(80),
  muscle_group:     z.enum([
    'chest','back','shoulders','biceps','triceps',
    'forearms','quads','hamstrings','glutes','calves','core','full_body'
  ]),
  movement_pattern: z.enum([
    'push_horizontal','push_vertical',
    'pull_horizontal','pull_vertical',
    'hinge','squat','carry','isolation'
  ]).optional().nullable(),
  is_compound:      z.boolean().default(false),
})

export async function POST(request) {
  try {
    const { user, supabase } = await requireAuth()

    const body = await request.json()
    const parsed = CreateExerciseSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('exercises')
      .insert({ ...parsed.data, created_by: user.id })
      .select('id, name, muscle_group, movement_pattern, is_compound')
      .single()

    if (error) throw error

    return NextResponse.json({ exercise: data }, { status: 201 })

  } catch (err) {
    if (err instanceof Response) return err
    console.error('[POST /api/exercises]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
