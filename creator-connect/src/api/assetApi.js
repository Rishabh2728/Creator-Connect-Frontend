import { apiRequest } from './client'

const getAuthToken = () => localStorage.getItem('auth_token')

const getAuthHeaders = () => {
  const token = getAuthToken()
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

export function getPublicAssets() {
  return apiRequest('/assets/public')
}

export function getMyAssets() {
  return apiRequest('/assets/me', {
    headers: getAuthHeaders(),
  })
}

export function createAsset({ title, visibility, file }) {
  const formData = new FormData()
  formData.append('title', title)
  formData.append('visibility', visibility)
  formData.append('file', file)

  return apiRequest('/assets', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData,
  })
}

export function deleteAssetById(assetId) {
  return apiRequest(`/assets/${assetId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })
}
