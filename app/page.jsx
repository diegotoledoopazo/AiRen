// app/page.jsx — redirigir raíz a /log
import { redirect } from 'next/navigation'

export default function Home() {
  redirect('/log')
}
