import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import SignupPage from './pages/SignupPage'
import VerifyOtpPage from './pages/VerifyOtpPage'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import { sendSignupOtp, signupUser, verifySignupOtp, loginUser } from './api/authApi'
import axios from 'axios'
import {
  clearNotices,
  resetAuthState,
  setAuthError,
  setAuthMessage,
  setCurrentUser,
  setIsLoading,
  setPage,
  setPendingEmail,
} from './store/slices/authSlice'
import { resetAssetsState } from './store/slices/assetSlice'

const PAGE = {
  SIGNUP: 'signup',
  VERIFY: 'verify',
  LOGIN: 'login',
  HOME: 'home',
}

function App() {
  const dispatch = useDispatch()
  const { page, pendingEmail, currentUserId, currentUserEmail, currentUserName, authError, authMessage, isLoading } =
    useSelector((state) => state.auth)

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
      dispatch(clearNotices())
    }, 3000)

    return () => clearTimeout(timer)
  }, [dispatch, authError, authMessage])

  const handleSendOtp = async ({ email }) => {
    dispatch(clearNotices())
    dispatch(setIsLoading(true))

    try {
      const response = await sendSignupOtp({ email })
      dispatch(setPendingEmail(email))
      dispatch(setAuthMessage(response?.message || 'OTP sent to your email.'))
    } catch (error) {
      dispatch(setAuthError(error.message || 'Could not send OTP. Please try again.'))
    } finally {
      dispatch(setIsLoading(false))
    }
  }

  const handleSignup = async ({ name, email, password, otp }) => {
    dispatch(clearNotices())
    dispatch(setIsLoading(true))

    try {
      const response = await signupUser({ name, email, password, otp })
      dispatch(setPendingEmail(email))
      if (response?.requiresOtpVerification) {
        dispatch(setAuthMessage(response?.message || 'OTP sent to your email. Verify to continue.'))
        dispatch(setPage(PAGE.VERIFY))
      } else {
        dispatch(setAuthMessage(response?.message || 'Signup successful. You can log in now.'))
        dispatch(setPage(PAGE.LOGIN))
      }
    } catch (error) {
      dispatch(setAuthError(error.message || 'Signup failed. Please try again.'))
    } finally {
      dispatch(setIsLoading(false))
    }
  }

  const handleVerify = async ({ otp }) => {
    dispatch(clearNotices())
    dispatch(setIsLoading(true))

    try {
      const response = await verifySignupOtp({ email: pendingEmail, otp })
      dispatch(setAuthMessage(response?.message || 'Email verified. You can log in now.'))
      dispatch(setPage(PAGE.LOGIN))
    } catch (error) {
      dispatch(setAuthError(error.message || 'OTP verification failed. Please try again.'))
    } finally {
      dispatch(setIsLoading(false))
    }
  }

  const handleLogin = async ({ email, password }) => {
    dispatch(clearNotices())
    dispatch(setIsLoading(true))

    try {
      const response = await loginUser({ email, password })
      const token = response?.data?.token || response?.token
      const user = response?.data?.user || response?.user
      if (token) {
        localStorage.setItem('auth_token', token)
      }
      const resolvedEmail = user?.email || email
      const resolvedName = user?.name || resolvedEmail.split('@')[0]
      const resolvedId = user?.id || user?._id || user?.userId || ''
      dispatch(setPendingEmail(resolvedEmail))
      dispatch(
        setCurrentUser({
          id: resolvedId,
          email: resolvedEmail,
          name: resolvedName,
          token,
        }),
      )
      localStorage.setItem('auth_user', JSON.stringify({ id: resolvedId, email: resolvedEmail, name: resolvedName }))
      dispatch(setAuthMessage('Login successful.'))
      dispatch(setPage(PAGE.HOME))
    } catch (error) {
      dispatch(setAuthError(error.message || 'Login failed. Please check your credentials.'))
    } finally {
      dispatch(setIsLoading(false))
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
    dispatch(resetAssetsState())
    dispatch(resetAuthState())
  }

  let pageView = null
  if (page === PAGE.SIGNUP) {
    pageView = (
      <SignupPage
        onSubmit={handleSignup}
        onSendOtp={handleSendOtp}
        onMoveToLogin={() => dispatch(setPage(PAGE.LOGIN))}
        loading={isLoading}
        initialEmail={pendingEmail}
      />
    )
  } else if (page === PAGE.VERIFY) {
    pageView = (
      <VerifyOtpPage
        email={pendingEmail}
        onSubmit={handleVerify}
        onBackToSignup={() => dispatch(setPage(PAGE.SIGNUP))}
        loading={isLoading}
      />
    )
  } else if (page === PAGE.LOGIN) {
    pageView = (
      <LoginPage
        onSubmit={handleLogin}
        onMoveToSignup={() => dispatch(setPage(PAGE.SIGNUP))}
        loading={isLoading}
        initialEmail={pendingEmail}
      />
    )
  } else {
    pageView = (
      <HomePage
        onLogout={handleLogout}
        currentUserId={currentUserId}
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
