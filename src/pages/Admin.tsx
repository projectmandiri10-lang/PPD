import { useState, useEffect, useCallback } from 'react'
import { Helmet } from 'react-helmet-async'
import { generateSlug, uploadImage, createImageEntry, clearCache, fetchImageList, getDownloadUrl } from '../lib/api'
import type { ImageItem } from '../types'

const ADMIN_TOKEN_KEY = 'admin_auth_token'
const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || ''
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || ''

type TabType = 'upload' | 'list'

function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  
  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('list')
  
  // Form state
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [downloadUrl, setDownloadUrl] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  
  // UI state
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Image list state
  const [images, setImages] = useState<ImageItem[]>([])
  const [listLoading, setListLoading] = useState(false)
  const [listError, setListError] = useState<string | null>(null)
  
  // Edit modal state
  const [editingImage, setEditingImage] = useState<ImageItem | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editSlug, setEditSlug] = useState('')
  const [editDownloadUrl, setEditDownloadUrl] = useState('')

  // Check existing auth on mount
  useEffect(() => {
    const token = localStorage.getItem(ADMIN_TOKEN_KEY)
    if (token === `${ADMIN_EMAIL}:${ADMIN_PASSWORD}` && ADMIN_EMAIL !== '' && ADMIN_PASSWORD !== '') {
      setIsAuthenticated(true)
    }
  }, [])

  // Auto-generate slug from title
  useEffect(() => {
    if (title) {
      setSlug(generateSlug(title))
    }
  }, [title])

  // Load images when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadImages()
    }
  }, [isAuthenticated])

  const loadImages = async () => {
    setListLoading(true)
    setListError(null)
    
    const result = await fetchImageList()
    
    if (result.error) {
      setListError(result.error)
    } else if (result.data) {
      setImages(result.data)
    }
    
    setListLoading(false)
  }

  const handleLogin = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    setAuthError('')
    
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      localStorage.setItem(ADMIN_TOKEN_KEY, `${email}:${password}`)
      setIsAuthenticated(true)
    } else {
      setAuthError('Invalid email or password')
    }
  }, [email, password])

  const handleLogout = useCallback(() => {
    localStorage.removeItem(ADMIN_TOKEN_KEY)
    setIsAuthenticated(false)
    setEmail('')
    setPassword('')
  }, [])

  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }, [])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)
    setUploadProgress('')

    try {
      // Validate
      if (!title.trim()) {
        throw new Error('Title is required')
      }
      if (!slug.trim()) {
        throw new Error('Slug is required')
      }
      if (!imageFile) {
        throw new Error('Image file is required')
      }

      // Step 1: Upload image
      setUploadProgress('Uploading image to Google Drive...')
      const uploadResult = await uploadImage(imageFile)
      
      if (uploadResult.error || !uploadResult.data) {
        throw new Error(uploadResult.error || 'Failed to upload image')
      }

      const { driveFileId, thumbnailUrl } = uploadResult.data

      // Step 2: Create entry in Google Sheets
      setUploadProgress('Saving metadata to database...')
      const createResult = await createImageEntry({
        title: title.trim(),
        slug: slug.trim(),
        thumbnailUrl,
        driveFileId,
        downloadUrl: downloadUrl.trim(),
      })

      if (createResult.error) {
        throw new Error(createResult.error)
      }

      // Success - clear form
      setTitle('')
      setSlug('')
      setDownloadUrl('')
      setImageFile(null)
      setImagePreview(null)
      setSuccess('Image uploaded successfully!')
      
      // Clear cache and reload images
      clearCache()
      loadImages()
      
      // Switch to list tab
      setActiveTab('list')

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
      setUploadProgress('')
    }
  }, [title, slug, downloadUrl, imageFile])

  const openEditModal = (image: ImageItem) => {
    setEditingImage(image)
    setEditTitle(image.title)
    setEditSlug(image.slug)
    setEditDownloadUrl(image.downloadUrl || '')
  }

  const closeEditModal = () => {
    setEditingImage(null)
    setEditTitle('')
    setEditSlug('')
    setEditDownloadUrl('')
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('Copied to clipboard!')
  }

  // Login Screen
  if (!isAuthenticated) {
    return (
      <>
        <Helmet>
          <title>Admin Login</title>
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>

        <div className="container-main py-20">
          <div className="max-w-md mx-auto">
            <div className="card p-8">
              <div className="text-center mb-8">
                <svg 
                  className="w-16 h-16 text-primary-600 mx-auto mb-4" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" 
                  />
                </svg>
                <h1 className="text-2xl font-bold text-gray-900">Admin Login</h1>
                <p className="text-gray-500 mt-2">Enter credentials to access admin panel</p>
              </div>

              <form onSubmit={handleLogin}>
                <div className="mb-4">
                  <label className="label" htmlFor="email">Email</label>
                  <input
                    type="email"
                    id="email"
                    className="input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter admin email"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="label" htmlFor="password">Password</label>
                  <input
                    type="password"
                    id="password"
                    className="input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter admin password"
                    required
                  />
                </div>

                {authError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                    {authError}
                  </div>
                )}

                <button type="submit" className="btn-primary w-full">
                  Login
                </button>
              </form>
            </div>
          </div>
        </div>
      </>
    )
  }

  // Admin Panel
  return (
    <>
      <Helmet>
        <title>Admin Panel</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="container-main py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
            <button 
              onClick={handleLogout}
              className="btn-secondary text-sm"
            >
              Logout
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 mb-6">
            <button
              onClick={() => setActiveTab('list')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'list'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <svg className="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              Image List ({images.length})
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'upload'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <svg className="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Upload New
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'list' && (
            <div>
              {/* Refresh Button */}
              <div className="flex justify-end mb-4">
                <button
                  onClick={loadImages}
                  disabled={listLoading}
                  className="btn-secondary text-sm"
                >
                  <svg className={`w-4 h-4 mr-2 ${listLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
              </div>

              {/* Loading */}
              {listLoading && (
                <div className="flex justify-center py-12">
                  <div className="spinner"></div>
                </div>
              )}

              {/* Error */}
              {listError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">
                  {listError}
                </div>
              )}

              {/* Empty State */}
              {!listLoading && !listError && images.length === 0 && (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-gray-500">No images uploaded yet</p>
                  <button
                    onClick={() => setActiveTab('upload')}
                    className="btn-primary mt-4"
                  >
                    Upload First Image
                  </button>
                </div>
              )}

              {/* Image List */}
              {!listLoading && !listError && images.length > 0 && (
                <div className="space-y-4">
                  {images.map((image) => (
                    <div key={image.id} className="card p-4">
                      <div className="flex flex-col sm:flex-row gap-4">
                        {/* Thumbnail */}
                        <div className="flex-shrink-0">
                          <img
                            src={image.thumbnailUrl || `https://drive.google.com/thumbnail?id=${image.driveFileId}&sz=s200`}
                            alt={image.title}
                            className="w-full sm:w-32 h-32 object-cover rounded-lg bg-gray-100"
                          />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">{image.title}</h3>
                          <p className="text-sm text-gray-500 mt-1">Slug: {image.slug}</p>
                          <p className="text-sm text-gray-500">ID: {image.driveFileId}</p>
                          {image.createdAt && (
                            <p className="text-sm text-gray-400 mt-1">
                              {new Date(image.createdAt).toLocaleDateString('id-ID', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          )}

                          {/* Download Link */}
                          <div className="mt-2 flex items-center gap-2">
                            <input
                              type="text"
                              readOnly
                              value={getDownloadUrl(image)}
                              className="input text-xs py-1 flex-1"
                            />
                            <button
                              onClick={() => copyToClipboard(getDownloadUrl(image))}
                              className="btn-secondary text-xs py-1 px-2"
                              title="Copy Link"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex sm:flex-col gap-2">
                          <a
                            href={getDownloadUrl(image)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-primary text-sm py-2 px-3 flex-1 sm:flex-none text-center"
                          >
                            <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Download
                          </a>
                          <button
                            onClick={() => openEditModal(image)}
                            className="btn-secondary text-sm py-2 px-3 flex-1 sm:flex-none"
                          >
                            <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit
                          </button>
                          <a
                            href={`/#/p/${image.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-secondary text-sm py-2 px-3 flex-1 sm:flex-none text-center"
                          >
                            <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="max-w-2xl">
              {/* Upload Form */}
              <div className="card p-6 sm:p-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Upload New Image</h2>

                <form onSubmit={handleSubmit}>
                  {/* Title */}
                  <div className="mb-4">
                    <label className="label" htmlFor="title">Title *</label>
                    <input
                      type="text"
                      id="title"
                      className="input"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter image title"
                      disabled={loading}
                      required
                    />
                  </div>

                  {/* Slug */}
                  <div className="mb-4">
                    <label className="label" htmlFor="slug">
                      Slug * 
                      <span className="text-gray-400 font-normal ml-1">(auto-generated)</span>
                    </label>
                    <input
                      type="text"
                      id="slug"
                      className="input"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      placeholder="url-friendly-slug"
                      disabled={loading}
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      URL: /#/p/{slug || 'your-slug'}
                    </p>
                  </div>

                  {/* Download URL (Optional) */}
                  <div className="mb-4">
                    <label className="label" htmlFor="downloadUrl">
                      Download URL 
                      <span className="text-gray-400 font-normal ml-1">(optional)</span>
                    </label>
                    <input
                      type="url"
                      id="downloadUrl"
                      className="input"
                      value={downloadUrl}
                      onChange={(e) => setDownloadUrl(e.target.value)}
                      placeholder="https://example.com/file.png"
                      disabled={loading}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Leave empty to use Google Drive direct download link
                    </p>
                  </div>

                  {/* Image Upload */}
                  <div className="mb-6">
                    <label className="label">Image File *</label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-500 transition-colors">
                      {imagePreview ? (
                        <div className="space-y-4">
                          <img 
                            src={imagePreview} 
                            alt="Preview" 
                            className="max-h-48 mx-auto rounded-lg"
                          />
                          <p className="text-sm text-gray-600">{imageFile?.name}</p>
                          <button
                            type="button"
                            onClick={() => {
                              setImageFile(null)
                              setImagePreview(null)
                            }}
                            className="text-red-600 text-sm hover:text-red-700"
                            disabled={loading}
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <label className="cursor-pointer">
                          <svg 
                            className="w-12 h-12 text-gray-400 mx-auto mb-3" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path 
                              strokeLinecap="round" 
                              strokeLinejoin="round" 
                              strokeWidth={2} 
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
                            />
                          </svg>
                          <p className="text-gray-600 mb-2">Click to upload or drag and drop</p>
                          <p className="text-sm text-gray-400">PNG, JPG, GIF, WebP</p>
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={handleImageChange}
                            disabled={loading}
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-red-600">{error}</p>
                    </div>
                  )}

                  {/* Success Message */}
                  {success && (
                    <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-green-600">{success}</p>
                    </div>
                  )}

                  {/* Progress */}
                  {uploadProgress && (
                    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center">
                        <div className="spinner w-5 h-5 mr-3"></div>
                        <p className="text-blue-600">{uploadProgress}</p>
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    className="btn-primary w-full py-3"
                    disabled={loading || !imageFile}
                  >
                    {loading ? 'Uploading...' : 'Upload Image'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editingImage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Edit Image</h2>
                <button
                  onClick={closeEditModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Preview */}
              <div className="mb-6">
                <img
                  src={editingImage.thumbnailUrl || `https://drive.google.com/thumbnail?id=${editingImage.driveFileId}&sz=s400`}
                  alt={editingImage.title}
                  className="w-full h-48 object-contain bg-gray-100 rounded-lg"
                />
              </div>

              {/* Edit Form */}
              <div className="space-y-4">
                <div>
                  <label className="label">Title</label>
                  <input
                    type="text"
                    className="input"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                  />
                </div>

                <div>
                  <label className="label">Slug</label>
                  <input
                    type="text"
                    className="input"
                    value={editSlug}
                    onChange={(e) => setEditSlug(e.target.value)}
                  />
                </div>

                <div>
                  <label className="label">Download URL</label>
                  <input
                    type="url"
                    className="input"
                    value={editDownloadUrl}
                    onChange={(e) => setEditDownloadUrl(e.target.value)}
                    placeholder="Leave empty for auto-generated link"
                  />
                </div>

                <div>
                  <label className="label">Drive File ID</label>
                  <input
                    type="text"
                    className="input bg-gray-50"
                    value={editingImage.driveFileId}
                    readOnly
                  />
                </div>
              </div>

              {/* Note */}
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> Edit functionality requires backend API support. 
                  Currently showing preview only. Implement /update endpoint in Google Apps Script.
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={closeEditModal}
                  className="btn-secondary flex-1"
                >
                  Close
                </button>
                <button
                  className="btn-primary flex-1"
                  onClick={() => {
                    alert('Edit functionality requires backend API. Implement /update endpoint in Google Apps Script.')
                  }}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default Admin
