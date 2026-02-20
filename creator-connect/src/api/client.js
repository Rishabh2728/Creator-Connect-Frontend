const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

export async function apiRequest(path, options = {}) {
  const isFormDataBody = options.body instanceof FormData
  const defaultHeaders = isFormDataBody ? {} : { 'Content-Type': 'application/json' }

  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        ...defaultHeaders,
        ...(options.headers || {}),
      },
      ...options,
    })
  } catch {
    throw new Error('Unable to reach backend. Check API server and CORS/proxy config.')
  }

  let payload = null
  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok) {
    const message = payload?.message || 'Request failed'
    throw new Error(message)
  }

  return payload
}
