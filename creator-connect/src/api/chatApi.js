import { ApiError, apiRequest } from './client'

const CHAT_MESSAGES_URL =
  import.meta.env.VITE_CHAT_MESSAGES_URL ||
  `${import.meta.env.VITE_API_ORIGIN || 'http://localhost:5000'}/api/chat/messages`

const getAuthHeaders = (token) => {
  if (!token) return {}
  const normalizedToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`
  return { Authorization: normalizedToken }
}

export function getInboxConversations(token) {
  return apiRequest('/chat/inbox', {
    headers: getAuthHeaders(token),
  })
}

export function searchChatUsers(token, search = '') {
  const query = new URLSearchParams({ search }).toString()
  return apiRequest(`/chat/users?${query}`, {
    headers: getAuthHeaders(token),
  })
}

export function getMessagesByUserId(token, userId) {
  return apiRequest(`/chat/messages/${userId}`, {
    headers: getAuthHeaders(token),
  })
}

export function sendChatMessage(token, payload) {
  const authHeaders = getAuthHeaders(token)
  if (!authHeaders.Authorization) {
    throw new ApiError('Unauthorized. Please log in again.', {
      status: 401,
      path: '/chat/messages',
      payload: null,
    })
  }

  return fetch(CHAT_MESSAGES_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeaders.Authorization,
    },
    body: JSON.stringify({
      receiverId: payload?.receiverId,
      body: payload?.body,
    }),
  })
    .then(async (response) => {
      let responsePayload = null
      try {
        responsePayload = await response.json()
      } catch {
        responsePayload = null
      }

      if (!response.ok) {
        throw new ApiError(responsePayload?.message || 'Could not send message', {
          status: response.status,
          path: '/chat/messages',
          payload: responsePayload,
        })
      }

      return responsePayload
    })
    .catch((error) => {
      if (error instanceof ApiError) {
        throw error
      }
      throw new ApiError('Unable to reach backend. Check API server availability.', {
        status: 0,
        path: '/chat/messages',
        payload: null,
      })
    })
}
