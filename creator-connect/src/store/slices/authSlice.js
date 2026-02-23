import { createSlice } from '@reduxjs/toolkit'

const token = localStorage.getItem('auth_token')
const savedProfileRaw = localStorage.getItem('auth_user')

let savedProfile = null
try {
  savedProfile = savedProfileRaw ? JSON.parse(savedProfileRaw) : null
} catch {
  savedProfile = null
}

const initialState = {
  page: token ? 'home' : 'signup',
  token: token || '',
  currentUserId: savedProfile?.id || '',
  pendingEmail: savedProfile?.email || '',
  currentUserEmail: savedProfile?.email || '',
  currentUserName: savedProfile?.name || '',
  authError: '',
  authMessage: '',
  isLoading: false,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setPage: (state, action) => {
      state.page = action.payload
    },
    setPendingEmail: (state, action) => {
      state.pendingEmail = action.payload
    },
    setCurrentUser: (state, action) => {
      state.currentUserId = action.payload.id || ''
      state.currentUserEmail = action.payload.email || ''
      state.currentUserName = action.payload.name || ''
      state.token = action.payload.token || state.token
    },
    setAuthError: (state, action) => {
      state.authError = action.payload
    },
    setAuthMessage: (state, action) => {
      state.authMessage = action.payload
    },
    clearNotices: (state) => {
      state.authError = ''
      state.authMessage = ''
    },
    setIsLoading: (state, action) => {
      state.isLoading = action.payload
    },
    resetAuthState: () => ({
      ...initialState,
      page: 'login',
      pendingEmail: '',
      token: '',
      currentUserId: '',
      currentUserEmail: '',
      currentUserName: '',
      authError: '',
      authMessage: '',
      isLoading: false,
    }),
  },
})

export const {
  setPage,
  setPendingEmail,
  setCurrentUser,
  setAuthError,
  setAuthMessage,
  clearNotices,
  setIsLoading,
  resetAuthState,
} = authSlice.actions

export default authSlice.reducer
