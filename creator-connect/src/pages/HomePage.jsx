import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { createAsset, deleteAssetById } from '../api/assetApi'
import ChatInbox from '../components/ChatInbox'
import {
  clearLoadingError,
  fetchAssetsData,
  prependCreatedAsset,
  removeAssetOptimistic,
  resetAssetsState,
  restoreAssetsState,
  setActiveTab,
  setLoadingError,
} from '../store/slices/assetSlice'

const ALLOWED_FILE_TYPES = [
  'image/png',
  'image/jpg',
  'image/jpeg',
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
]

const isImageType = (type = '') => type.startsWith('image/')

function HomePage({ onLogout, userEmail, userName }) {
  const dispatch = useDispatch()
  const { activeTab, publicAssets, myAssets, loadingError, hasLoaded } = useSelector((state) => state.asset)
  const authToken = useSelector((state) => state.auth.token)
  const [title, setTitle] = useState('')
  const [visibility, setVisibility] = useState('public')
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploadError, setUploadError] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [previewAsset, setPreviewAsset] = useState(null)
  const [inboxTargetUser, setInboxTargetUser] = useState(null)
  const [toast, setToast] = useState({ message: '', type: 'success' })
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (!toast.message) {
      return
    }

    const timer = setTimeout(() => {
      setToast({ message: '', type: 'success' })
    }, 2800)

    return () => clearTimeout(timer)
  }, [toast.message])

  useEffect(() => {
    if (!hasLoaded) {
      dispatch(fetchAssetsData())
    }
  }, [dispatch, hasLoaded])

  useEffect(() => {
    if (!userEmail) {
      dispatch(resetAssetsState())
    }
  }, [dispatch, userEmail])

  const currentName = userName?.trim() || (userEmail ? userEmail.split('@')[0] : 'User')
  const normalizedCurrentUserEmail = userEmail?.trim().toLowerCase() || ''

  const isOwnAsset = useCallback(
    (asset) => {
      const ownerEmail = (asset?.ownerEmail || asset?.owner?.email || '').trim().toLowerCase()
      return Boolean(ownerEmail && normalizedCurrentUserEmail && ownerEmail === normalizedCurrentUserEmail)
    },
    [normalizedCurrentUserEmail],
  )

  const resolveAssetHost = useCallback((asset) => {
    const rawId =
      asset?.ownerId ||
      asset?.owner?._id ||
      asset?.owner?.id ||
      asset?.hostId ||
      asset?.userId ||
      asset?.uploaderId ||
      ''
    const id = rawId ? String(rawId) : ''
    const name =
      asset?.ownerName ||
      asset?.owner?.name ||
      asset?.hostName ||
      asset?.uploaderName ||
      (asset?.ownerEmail ? asset.ownerEmail.split('@')[0] : '') ||
      'Unknown User'
    const email = asset?.ownerEmail || asset?.owner?.email || asset?.hostEmail || asset?.uploaderEmail || ''
    return { id, name, email }
  }, [])

  const handleMessageHost = useCallback((asset) => {
    const ownerEmail = (asset?.ownerEmail || asset?.owner?.email || '').trim().toLowerCase()
    if (ownerEmail && normalizedCurrentUserEmail && ownerEmail === normalizedCurrentUserEmail) {
      setToast({
        message: 'You cannot message yourself for your own asset.',
        type: 'error',
      })
      return
    }

    const host = resolveAssetHost(asset)
    if (!host.id) {
      setToast({
        message: 'This asset does not include host ID yet. Ask backend to return ownerId in asset payload.',
        type: 'error',
      })
      return
    }
    setInboxTargetUser(host)
    dispatch(setActiveTab('inbox'))
  }, [dispatch, normalizedCurrentUserEmail, resolveAssetHost])

  const handleUpload = async (event) => {
    event.preventDefault()
    if (isUploading) return

    setUploadError('')
    if (!selectedFile || !title.trim()) {
      return
    }

    if (!ALLOWED_FILE_TYPES.includes(selectedFile.type)) {
      setUploadError('Only PNG, JPG, JPEG images and MP4/WEBM/OGG/MOV videos are allowed.')
      return
    }

    setIsUploading(true)
    setUploadProgress(0)
    const progressTimer = setInterval(() => {
      setUploadProgress((prev) => (prev >= 90 ? prev : prev + 10))
    }, 120)

    try {
      const response = await createAsset({
        title: title.trim(),
        visibility,
        file: selectedFile,
      })

      const createdAsset = response?.data
      if (createdAsset) {
        dispatch(prependCreatedAsset(createdAsset))
      }

      setToast({
        message: response?.message || 'Asset uploaded successfully',
        type: 'success',
      })

      setUploadProgress(100)
      setTitle('')
      setVisibility('public')
      setSelectedFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      const uploadMessage = error.message || 'Upload failed'
      setUploadError(uploadMessage)
      setToast({ message: uploadMessage, type: 'error' })
    } finally {
      clearInterval(progressTimer)
      setTimeout(() => {
        setIsUploading(false)
        setUploadProgress(0)
      }, 350)
    }
  }

  const handleDeleteAsset = useCallback(async (assetId) => {
    const previousMyAssets = myAssets
    const previousPublicAssets = publicAssets

    dispatch(clearLoadingError())
    dispatch(removeAssetOptimistic(assetId))

    try {
      const response = await deleteAssetById(assetId)
      setToast({
        message: response?.message || 'Asset deleted successfully',
        type: 'success',
      })
    } catch (error) {
      dispatch(
        restoreAssetsState({
          myAssets: previousMyAssets,
          publicAssets: previousPublicAssets,
        }),
      )
      const deleteMessage = error.message || 'Could not delete asset'
      dispatch(setLoadingError(deleteMessage))
      setToast({ message: deleteMessage, type: 'error' })
    }
  }, [dispatch, myAssets, publicAssets])

  const publicAssetCards = useMemo(
    () =>
      publicAssets.map((asset) => {
        const ownAsset = isOwnAsset(asset)
        return (
          <article key={asset.id} className="asset-card" role="listitem">
            <button type="button" className="asset-preview" onClick={() => setPreviewAsset(asset)}>
              {isImageType(asset.mimeType) ? (
                <img src={asset.fileUrl} alt={asset.title} />
              ) : (
                <video src={asset.fileUrl} muted playsInline />
              )}
            </button>
            <div className="asset-card-body">
              <p className="asset-name">{asset.title}</p>
              <p className="asset-uploader">Uploaded by: {asset.ownerName || 'Unknown'}</p>
              <div className="asset-action-row">
                <button
                  type="button"
                  className="message-host-button"
                  onClick={() => handleMessageHost(asset)}
                  disabled={ownAsset}
                  title={ownAsset ? 'Disabled for your own post' : 'Message Host'}
                >
                  Message Host
                </button>
                <span className={`asset-badge ${asset.visibility}`}>{asset.visibility}</span>
              </div>
            </div>
          </article>
        )
      }),
    [publicAssets, handleMessageHost, isOwnAsset],
  )

  const myAssetCards = useMemo(
    () =>
      myAssets.map((asset) => (
        <article key={asset.id} className="asset-card" role="listitem">
          <button type="button" className="asset-preview" onClick={() => setPreviewAsset(asset)}>
            {isImageType(asset.mimeType) ? (
              <img src={asset.fileUrl} alt={asset.title} />
            ) : (
              <video src={asset.fileUrl} muted playsInline />
            )}
          </button>
          <div className="asset-card-body">
            <p className="asset-name">{asset.title}</p>
            <p className="asset-uploader">Uploaded by: {asset.ownerName || 'Unknown'}</p>
            <span className={`asset-badge ${asset.visibility}`}>{asset.visibility}</span>
            <button type="button" className="delete-asset-button" onClick={() => handleDeleteAsset(asset.id)}>
              Delete
            </button>
          </div>
        </article>
      )),
    [myAssets, handleDeleteAsset],
  )

  return (
    <section className="home-page" aria-label="Asset home page">
      {toast.message && (
        <div className={`asset-toast ${toast.type}`} role="status" aria-live="polite">
          <span>{toast.message}</span>
          <button type="button" className="asset-toast-close" onClick={() => setToast({ message: '', type: 'success' })}>
            Close
          </button>
        </div>
      )}
      <nav className="top-nav">
        <h1>Creator Connect</h1>
        <div className="nav-actions">
          <button
            type="button"
            className={`nav-link ${activeTab === 'home' ? 'active' : ''}`}
            onClick={() => dispatch(setActiveTab('home'))}
          >
            Home
          </button>
          <button
            type="button"
            className={`nav-link ${activeTab === 'create' ? 'active' : ''}`}
            onClick={() => dispatch(setActiveTab('create'))}
          >
            Create Asset
          </button>
          <button
            type="button"
            className={`nav-link ${activeTab === 'myassets' ? 'active' : ''}`}
            onClick={() => dispatch(setActiveTab('myassets'))}
          >
            My Assets
          </button>
          <button
            type="button"
            className={`nav-link ${activeTab === 'inbox' ? 'active' : ''}`}
            onClick={() => dispatch(setActiveTab('inbox'))}
          >
            Inbox
          </button>
          <p className="user-label">{currentName}</p>
          <button type="button" className="logout-button" onClick={onLogout}>
            Logout
          </button>
        </div>
      </nav>

      <main className="home-content">
        {loadingError && <p className="upload-error">{loadingError}</p>}
        <section className={`content-card ${activeTab === 'home' ? '' : 'section-hidden'}`}>
          <h2>All Public Assets</h2>
          {!publicAssets.length && <p className="empty-state">No public assets available yet.</p>}
          <div className="asset-grid" role="list">
            {publicAssetCards}
          </div>
        </section>

        {activeTab === 'create' && (
          <section className="content-card">
            <h2>Create Asset</h2>
            <form className="upload-form" onSubmit={handleUpload}>
              <div className="field-group">
                <label htmlFor="asset-title">Asset title</label>
                <input
                  id="asset-title"
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Summer campaign poster"
                  required
                />
              </div>

              <div className="field-group">
                <label htmlFor="asset-file">Upload file</label>
                <input
                  id="asset-file"
                  type="file"
                  accept=".png,.jpg,.jpeg,.mp4,.webm,.ogg,.mov,image/png,image/jpg,image/jpeg,video/mp4,video/webm,video/ogg,video/quicktime"
                  ref={fileInputRef}
                  onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                  required
                />
                {uploadError && <p className="upload-error">{uploadError}</p>}
              </div>

              <div className="field-group">
                <label htmlFor="asset-visibility">Visibility</label>
                <select
                  id="asset-visibility"
                  value={visibility}
                  onChange={(event) => setVisibility(event.target.value)}
                >
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
              </div>

              {isUploading && (
                <div className="progress-wrap" aria-live="polite">
                  <div className="progress-bar" style={{ width: `${uploadProgress}%` }} />
                </div>
              )}

              <button type="submit" disabled={isUploading}>
                {isUploading ? 'Uploading...' : 'Upload Asset'}
              </button>
            </form>
          </section>
        )}

        <section className={`content-card ${activeTab === 'myassets' ? '' : 'section-hidden'}`}>
          <h2>My Assets</h2>
          {!myAssets.length && <p className="empty-state">You have not uploaded any assets yet.</p>}
          <div className="asset-grid" role="list">
            {myAssetCards}
          </div>
        </section>

        {activeTab === 'inbox' && (
          <section className="content-card">
            <ChatInbox token={authToken} currentUserEmail={userEmail} initialSelectedUser={inboxTargetUser} />
          </section>
        )}
      </main>

      {previewAsset && (
        <div className="media-modal" role="dialog" aria-modal="true">
          <button type="button" className="modal-backdrop" onClick={() => setPreviewAsset(null)} />
          <div className="modal-content">
            <button type="button" className="modal-close" onClick={() => setPreviewAsset(null)}>
              Close
            </button>
            {isImageType(previewAsset.mimeType) ? (
              <img src={previewAsset.fileUrl} alt={previewAsset.title} className="modal-media" />
            ) : (
              <video src={previewAsset.fileUrl} className="modal-media" controls autoPlay />
            )}
          </div>
        </div>
      )}
    </section>
  )
}

export default HomePage
