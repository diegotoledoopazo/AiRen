// app/(app)/log/page.jsx
import { createClient } from '@supabase/supabase-js'
import SessionLogger from './components/SessionLogger'

export const metadata = {
  title: 'Entrenar — AiRen',
}

export default async function LogPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  const { data: exercises } = await supabase
    .from('exercises')
    .select('id, name, muscle_group, movement_pattern, is_compound')
    .order('name', { ascending: true })

  return <SessionLogger exercises={exercises ?? []} />
}
