import { useState } from 'react'
import AuthCard from '../components/AuthCard'

function SignupPage({ onSubmit, onSendOtp, onMoveToLogin, loading, initialEmail = '' }) {
  const [form, setForm] = useState({
    name: '',
    email: initialEmail,
    password: '',
    otp: '',
  })

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    onSubmit(form)
  }

  const handleSendOtp = () => {
    if (!form.email) {
      return
    }
    onSendOtp({ email: form.email })
  }

  return (
    <AuthCard
      title="Create account"
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <label htmlFor="name">Name</label>
        <input
          id="name"
          name="name"
          type="text"
          placeholder="Your Name"
          value={form.name}
          onChange={handleChange}
          required
        />

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
        <button type="button" onClick={handleSendOtp} disabled={loading || !form.email}>
          {loading ? 'Please wait...' : 'Send OTP'}
        </button>

        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          placeholder="At least 8 characters"
          value={form.password}
          onChange={handleChange}
          minLength={8}
          required
        />

        <label htmlFor="otp">OTP</label>
        <input
          id="otp"
          name="otp"
          type="text"
          placeholder="Enter OTP received on email"
          value={form.otp}
          onChange={handleChange}
          minLength={4}
          maxLength={8}
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? 'Submitting...' : 'Sign up'}
        </button>
      </form>

      <p className="inline-link">
        Already have an account?{' '}
        <button type="button" className="text-button" onClick={onMoveToLogin}>
          Log in
        </button>
      </p>
    </AuthCard>
  )
}

export default SignupPage
