import { apiRequest } from './client'

export function sendSignupOtp({ email }) {
  return apiRequest('/auth/send-otp', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export function signupUser({ name, email, password, otp }) {
  return apiRequest('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, otp }),
  })
}

export function verifySignupOtp({ email, otp }) {
  return apiRequest('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ email, otp }),
  })
}

export function loginUser({ email, password }) {
  return apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}
