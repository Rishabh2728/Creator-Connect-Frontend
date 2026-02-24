import { apiRequest } from './client'

const getAuthHeaders = (token) => {
  if (!token) return {}
  const normalizedToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`
  return { Authorization: normalizedToken }
}

const WALLET_PATH = import.meta.env.VITE_COINS_WALLET_PATH || '/coins/wallet'
const RAZORPAY_ORDER_PATH = import.meta.env.VITE_RAZORPAY_ORDER_PATH || '/payments/razorpay/order'
const RAZORPAY_VERIFY_PATH = import.meta.env.VITE_RAZORPAY_VERIFY_PATH || '/payments/razorpay/verify'

export function getCoinWallet(token) {
  return apiRequest(WALLET_PATH, {
    headers: getAuthHeaders(token),
  })
}

export function createRazorpayOrder(token, payload) {
  return apiRequest(RAZORPAY_ORDER_PATH, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload || {}),
  })
}

export function verifyRazorpayPayment(token, payload) {
  return apiRequest(RAZORPAY_VERIFY_PATH, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload || {}),
  })
}
