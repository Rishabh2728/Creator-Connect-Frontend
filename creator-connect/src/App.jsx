import { useEffect, useMemo, useState } from 'react'
import SignupPage from './pages/SignupPage'
import VerifyOtpPage from './pages/VerifyOtpPage'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import { sendSignupOtp, signupUser, verifySignupOtp, loginUser } from './api/authApi'
import axios from 'axios'

const PAGE = {
  SIGNUP: 'signup',
  VERIFY: 'verify',
  LOGIN: 'login',
  HOME: 'home',
}

function App() {
  const [page, setPage] = useState(PAGE.SIGNUP)
  const [pendingEmail, setPendingEmail] = useState('')
  const [authError, setAuthError] = useState('')
  const [authMessage, setAuthMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    axios
      .get('/api/test')
      .then((res) => console.log(res.data))
      .catch((err) => console.log(err))
  }, [])

  const clearNotices = () => {
    setAuthError('')
    setAuthMessage('')
  }

  const handleSendOtp = async ({ email }) => {
    clearNotices()
    setIsLoading(true)

    try {
      const response = await sendSignupOtp({ email })
      setPendingEmail(email)
      setAuthMessage(response?.message || 'OTP sent to your email.')
    } catch (error) {
      setAuthError(error.message || 'Could not send OTP. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignup = async ({ name, email, password, otp }) => {
    clearNotices()
    setIsLoading(true)

    try {
      const response = await signupUser({ name, email, password, otp })
      setPendingEmail(email)
      if (response?.requiresOtpVerification) {
        setAuthMessage(response?.message || 'OTP sent to your email. Verify to continue.')
        setPage(PAGE.VERIFY)
      } else {
        setAuthMessage(response?.message || 'Signup successful. You can log in now.')
        setPage(PAGE.LOGIN)
      }
    } catch (error) {
      setAuthError(error.message || 'Signup failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerify = async ({ otp }) => {
    clearNotices()
    setIsLoading(true)

    try {
      const response = await verifySignupOtp({ email: pendingEmail, otp })
      setAuthMessage(response?.message || 'Email verified. You can log in now.')
      setPage(PAGE.LOGIN)
    } catch (error) {
      setAuthError(error.message || 'OTP verification failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogin = async ({ email, password }) => {
    clearNotices()
    setIsLoading(true)

    try {
      const response = await loginUser({ email, password })
      if (response?.token) {
        localStorage.setItem('auth_token', response.token)
      }
      setAuthMessage('Login successful.')
      setPage(PAGE.HOME)
    } catch (error) {
      setAuthError(error.message || 'Login failed. Please check your credentials.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    setPendingEmail('')
    clearNotices()
    setPage(PAGE.LOGIN)
  }

  const pageView = useMemo(() => {
    if (page === PAGE.SIGNUP) {
      return (
        <SignupPage
          onSubmit={handleSignup}
          onSendOtp={handleSendOtp}
          onMoveToLogin={() => setPage(PAGE.LOGIN)}
          loading={isLoading}
          initialEmail={pendingEmail}
        />
      )
    }

    if (page === PAGE.VERIFY) {
      return (
        <VerifyOtpPage
          email={pendingEmail}
          onSubmit={handleVerify}
          onBackToSignup={() => setPage(PAGE.SIGNUP)}
          loading={isLoading}
        />
      )
    }

    if (page === PAGE.LOGIN) {
      return (
        <LoginPage
          onSubmit={handleLogin}
          onMoveToSignup={() => setPage(PAGE.SIGNUP)}
          loading={isLoading}
          initialEmail={pendingEmail}
        />
      )
    }

    return <HomePage onLogout={handleLogout} />
  }, [page, isLoading, pendingEmail])

  return (
    <main className="app-shell">
      {authError && <p className="notice error">{authError}</p>}
      {authMessage && !authError && <p className="notice success">{authMessage}</p>}
      {pageView}
    </main>
  )
}

export default App
