/**
 * RegisterPage — redirects to the combined LoginPage which opens the register modal.
 * All registration logic lives in LoginPage.tsx.
 */
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function RegisterPage() {
  const nav = useNavigate()
  useEffect(() => {
    nav('/login?mode=register', { replace: true })
  }, [nav])
  return null
}
