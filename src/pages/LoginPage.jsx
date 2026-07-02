import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

export default function LoginPage() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const err = await signIn(email, password)
    if (err) { setError(err.message); setLoading(false) }
    // on success, useAuth sets session → App redirects to /
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-white text-center">SlopeSync</h1>
        <p className="text-slate-400 text-center mt-1 mb-10 text-sm">Mt. Rose Ski School</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-slate-300 text-sm mb-1.5" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full bg-slate-800 text-white placeholder-slate-500 border border-slate-700 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-blue-500 min-h-[52px]"
              placeholder="supervisor@mtrose.com"
            />
          </div>
          <div>
            <label className="block text-slate-300 text-sm mb-1.5" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full bg-slate-800 text-white placeholder-slate-500 border border-slate-700 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-blue-500 min-h-[52px]"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-950/50 border border-red-800 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900 disabled:text-blue-600 text-white font-semibold rounded-xl py-4 text-base min-h-[56px] transition-colors mt-2"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
