// app/api/auth/login/route.js
// API route de servidor para manejar login y registro
// El servidor escribe la cookie de sesión — el cliente solo redirige

import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request) {
  const { email, password, mode } = await request.json()
  const supabase = createServerSupabaseClient()

  if (mode === 'register') {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  }

  // Login
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return NextResponse.json({ error: error.message }, { status: 401 })

  // Sesión escrita en cookie por el servidor — indicar al cliente dónde ir
  return NextResponse.json({ ok: true, redirect: '/log' })
}
