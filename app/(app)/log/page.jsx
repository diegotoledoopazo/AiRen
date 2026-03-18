// app/(app)/log/page.jsx
// Server Component — carga el catálogo de ejercicios y renderiza el logger

import { createServerSupabaseClient } from '@/lib/supabase-server'
import SessionLogger from './components/SessionLogger'

export const metadata = {
  title: 'Registrar — GymLog',
}

export default async function LogPage() {
  const supabase = createServerSupabaseClient()

  const { data: exercises } = await supabase
    .from('exercises')
    .select('id, name, muscle_group, movement_pattern, is_compound')
    .order('name', { ascending: true })

  return (
    <SessionLogger exercises={exercises ?? []} />
  )
}
