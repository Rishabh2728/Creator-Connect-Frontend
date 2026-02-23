const normalizeBaseUrl = (value = '') => value.replace(/\/+$/, '')

const DEFAULT_DEV_API_BASE_URL = 'https://creator-content-backend-1.onrender.com/api'
const API_BASE_URL = normalizeBaseUrl(
  import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? DEFAULT_DEV_API_BASE_URL : '/api'),
)

export class ApiError extends Error {
  constructor(message, { status, path, payload } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.path = path
    this.payload = payload
  }
}

const buildErrorMessage = (status, payload, fallback = 'Request failed') => {
  if (payload?.message) {
    return payload.message
  }
  if (status === 401) {
    return 'Unauthorized. Please log in again.'
  }
  if (status === 404) {
    return 'Endpoint not found. Check API base URL and backend route.'
  }
  return fallback
}

export async function apiRequest(path, options = {}) {
  const isFormDataBody = options.body instanceof FormData
  const defaultHeaders = isFormDataBody ? {} : { 'Content-Type': 'application/json' }
  const requestPath = path.startsWith('/') ? path : `/${path}`
  const requestUrl = `${API_BASE_URL}${requestPath}`

  let response
  try {
    response = await fetch(requestUrl, {
      headers: {
        ...defaultHeaders,
        ...(options.headers || {}),
      },
      ...options,
    })
  } catch {
    throw new ApiError('Unable to reach backend. Check API server, base URL, and CORS/proxy config.', {
      status: 0,
      path: requestPath,
      payload: null,
    })
  }

  let payload = null
  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok) {
    throw new ApiError(buildErrorMessage(response.status, payload), {
      status: response.status,
      path: requestPath,
      payload,
    })
  }

  return payload
}
