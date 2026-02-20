import { useEffect, useState } from 'react'
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
  const [currentUserEmail, setCurrentUserEmail] = useState('')
  const [currentUserName, setCurrentUserName] = useState('')
  const [authError, setAuthError] = useState('')
  const [authMessage, setAuthMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    const savedProfileRaw = localStorage.getItem('auth_user')

    if (!token) {
      return
    }

    try {
      const savedProfile = savedProfileRaw ? JSON.parse(savedProfileRaw) : null
      if (savedProfile?.email) {
        setPendingEmail(savedProfile.email)
        setCurrentUserEmail(savedProfile.email)
      }
      if (savedProfile?.name) {
        setCurrentUserName(savedProfile.name)
      }
    } catch {
      localStorage.removeItem('auth_user')
    }

    setPage(PAGE.HOME)
  }, [])

  useEffect(() => {
    axios
      .get('/api/test')
      .then((res) => console.log(res.data))
      .catch((err) => console.log(err))
  }, [])

  useEffect(() => {
    if (!authError && !authMessage) {
      return
    }

    const timer = setTimeout(() => {
      setAuthError('')
      setAuthMessage('')
    }, 3000)

    return () => clearTimeout(timer)
  }, [authError, authMessage])

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
      const token = response?.data?.token || response?.token
      const user = response?.data?.user || response?.user
      if (token) {
        localStorage.setItem('auth_token', token)
      }
      const resolvedEmail = user?.email || email
      const resolvedName = user?.name || resolvedEmail.split('@')[0]
      setPendingEmail(resolvedEmail)
      setCurrentUserEmail(resolvedEmail)
      setCurrentUserName(resolvedName)
      localStorage.setItem('auth_user', JSON.stringify({ email: resolvedEmail, name: resolvedName }))
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
    localStorage.removeItem('auth_user')
    setPendingEmail('')
    setCurrentUserEmail('')
    setCurrentUserName('')
    clearNotices()
    setPage(PAGE.LOGIN)
  }

  let pageView = null
  if (page === PAGE.SIGNUP) {
    pageView = (
      <SignupPage
        onSubmit={handleSignup}
        onSendOtp={handleSendOtp}
        onMoveToLogin={() => setPage(PAGE.LOGIN)}
        loading={isLoading}
        initialEmail={pendingEmail}
      />
    )
  } else if (page === PAGE.VERIFY) {
    pageView = (
      <VerifyOtpPage
        email={pendingEmail}
        onSubmit={handleVerify}
        onBackToSignup={() => setPage(PAGE.SIGNUP)}
        loading={isLoading}
      />
    )
  } else if (page === PAGE.LOGIN) {
    pageView = (
      <LoginPage
        onSubmit={handleLogin}
        onMoveToSignup={() => setPage(PAGE.SIGNUP)}
        loading={isLoading}
        initialEmail={pendingEmail}
      />
    )
  } else {
    pageView = (
      <HomePage
        onLogout={handleLogout}
        userEmail={currentUserEmail || pendingEmail}
        userName={currentUserName}
      />
    )
  }

  return (
    <main className={`app-shell ${page === PAGE.HOME ? 'app-shell--home' : ''}`.trim()}>
      {authError && <p className="notice error">{authError}</p>}
      {authMessage && !authError && <p className="notice success">{authMessage}</p>}
      {pageView}
    </main>
  )
}

export default App
