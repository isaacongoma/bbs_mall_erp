import { useState, type FormEvent } from 'react'
import { useAuthStore } from '@/core/auth/authStore'
import { Button, ErrorMessage, FormControl } from '@/design-system'

export function Login() {
  const login = useAuthStore((state) => state.login)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event?: FormEvent) {
    event?.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-surface-gray-1">
      <form className="w-80 space-y-4 rounded-lg border bg-surface-white p-6 shadow-sm" onSubmit={submit}>
        <div className="text-lg font-semibold text-ink-gray-9">Sign in to BBS MALL ERP</div>
        <FormControl label="Email" type="email" value={email} onChange={setEmail} required />
        <FormControl label="Password" type="password" value={password} onChange={setPassword} required />
        <ErrorMessage message={error} />
        <Button variant="solid" className="w-full" loading={loading} type="submit">
          Sign in
        </Button>
      </form>
    </div>
  )
}
