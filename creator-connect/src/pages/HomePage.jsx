import { useEffect, useRef, useState } from 'react'
import { createAsset, deleteAssetById, getMyAssets, getPublicAssets } from '../api/assetApi'

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
  const [activeTab, setActiveTab] = useState('home')
  const [title, setTitle] = useState('')
  const [visibility, setVisibility] = useState('public')
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploadError, setUploadError] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [publicAssets, setPublicAssets] = useState([])
  const [myAssets, setMyAssets] = useState([])
  const [loadingError, setLoadingError] = useState('')
  const [previewAsset, setPreviewAsset] = useState(null)
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
    const fetchAssets = async () => {
      setLoadingError('')
      try {
        const [publicResponse, myResponse] = await Promise.all([getPublicAssets(), getMyAssets()])
        setPublicAssets(publicResponse?.data || [])
        setMyAssets(myResponse?.data || [])
      } catch (error) {
        setLoadingError(error.message || 'Could not load assets')
      }
    }

    fetchAssets()
  }, [])

  const currentName = userName?.trim() || (userEmail ? userEmail.split('@')[0] : 'User')

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
        setMyAssets((prev) => [createdAsset, ...prev])
        if (createdAsset.visibility === 'public') {
          setPublicAssets((prev) => [createdAsset, ...prev])
        }
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

  const handleDeleteAsset = async (assetId) => {
    const previousMyAssets = myAssets
    const previousPublicAssets = publicAssets

    setLoadingError('')
    setMyAssets((prev) => prev.filter((asset) => asset.id !== assetId))
    setPublicAssets((prev) => prev.filter((asset) => asset.id !== assetId))

    try {
      const response = await deleteAssetById(assetId)
      setToast({
        message: response?.message || 'Asset deleted successfully',
        type: 'success',
      })
    } catch (error) {
      setMyAssets(previousMyAssets)
      setPublicAssets(previousPublicAssets)
      const deleteMessage = error.message || 'Could not delete asset'
      setLoadingError(deleteMessage)
      setToast({ message: deleteMessage, type: 'error' })
    }
  }

  const renderAssetCard = (asset, isOwned = false) => (
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
        {isOwned && (
          <button type="button" className="delete-asset-button" onClick={() => handleDeleteAsset(asset.id)}>
            Delete
          </button>
        )}
      </div>
    </article>
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
            onClick={() => setActiveTab('home')}
          >
            Home
          </button>
          <button
            type="button"
            className={`nav-link ${activeTab === 'create' ? 'active' : ''}`}
            onClick={() => setActiveTab('create')}
          >
            Create Asset
          </button>
          <button
            type="button"
            className={`nav-link ${activeTab === 'myassets' ? 'active' : ''}`}
            onClick={() => setActiveTab('myassets')}
          >
            My Assets
          </button>
          <p className="user-label">{currentName}</p>
          <button type="button" className="logout-button" onClick={onLogout}>
            Logout
          </button>
        </div>
      </nav>

      <main className="home-content">
        {loadingError && <p className="upload-error">{loadingError}</p>}
        {activeTab === 'home' && (
          <section className="content-card">
            <h2>All Public Assets</h2>
            {!publicAssets.length && <p className="empty-state">No public assets available yet.</p>}
            <div className="asset-grid" role="list">
              {publicAssets.map((asset) => renderAssetCard(asset))}
            </div>
          </section>
        )}

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

        {activeTab === 'myassets' && (
          <section className="content-card">
            <h2>My Assets</h2>
            {!myAssets.length && <p className="empty-state">You have not uploaded any assets yet.</p>}
            <div className="asset-grid" role="list">
              {myAssets.map((asset) => renderAssetCard(asset, true))}
            </div>
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
