import { configureStore } from '@reduxjs/toolkit'
import assetReducer from './slices/assetSlice'
import authReducer from './slices/authSlice'

export const store = configureStore({
  reducer: {
    asset: assetReducer,
    auth: authReducer,
  },
})
