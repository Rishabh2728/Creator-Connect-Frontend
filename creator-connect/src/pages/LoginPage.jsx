import { useState } from 'react'
import AuthCard from '../components/AuthCard'

function LoginPage({ onSubmit, onMoveToSignup, loading, initialEmail = '' }) {
  const [form, setForm] = useState({
    email: initialEmail,
    password: '',
  })

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    onSubmit(form)
  }

  return (
    <AuthCard title="Log in"> <br></br>
      <form className="auth-form" onSubmit={handleSubmit}>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={handleChange}
          required
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          value={form.password}
          onChange={handleChange}
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Log in'}
        </button>
      </form>

      <p className="inline-link">
        New user?{' '}
        <button type="button" className="text-button" onClick={onMoveToSignup}>
          Create account
        </button>
      </p>
    </AuthCard>
  )
}

export default LoginPage
