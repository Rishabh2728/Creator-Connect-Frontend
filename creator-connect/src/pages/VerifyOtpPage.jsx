import { useState } from 'react'
import AuthCard from '../components/AuthCard'

function VerifyOtpPage({ email, onSubmit, onBackToSignup, loading }) {
  const [otp, setOtp] = useState('')

  const handleSubmit = (event) => {
    event.preventDefault()
    onSubmit({ otp })
  }

  return (
    <AuthCard
      title="Verify email"
      subtitle={`Enter the OTP sent to ${email || 'your email'}.`}
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <label htmlFor="otp">OTP</label>
        <input
          id="otp"
          name="otp"
          type="text"
          placeholder="6 digit OTP"
          value={otp}
          onChange={(event) => setOtp(event.target.value)}
          minLength={4}
          maxLength={8}
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? 'Verifying...' : 'Verify OTP'}
        </button>
      </form>

      <p className="inline-link">
        Wrong email?{' '}
        <button type="button" className="text-button" onClick={onBackToSignup}>
          Back to signup
        </button>
      </p>
    </AuthCard>
  )
}

export default VerifyOtpPage
