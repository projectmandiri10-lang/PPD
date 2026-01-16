import { useState, useEffect, useCallback } from 'react'
import { Helmet } from 'react-helmet-async'
import { generateSlug, uploadImage, createImageEntry, clearCache } from '../lib/api'

const ADMIN_TOKEN_KEY = 'admin_auth_token'
const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || ''
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || ''

function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  
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
      
      // Clear cache to reflect new data
      clearCache()

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
      setUploadProgress('')
    }
  }, [title, slug, downloadUrl, imageFile])

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
                <p className="text-gray-500 mt-2">Enter password to access admin panel</p>
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

              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Security Note:</strong> For production, protect the /admin directory 
                  using cPanel's Password Protected Directory feature.
                </p>
              </div>
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
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
            <button 
              onClick={handleLogout}
              className="btn-secondary text-sm"
            >
              Logout
            </button>
          </div>

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

          {/* Instructions */}
          <div className="mt-8 card p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Setup Instructions</h3>
            <div className="text-sm text-gray-600 space-y-3">
              <p>
                <strong>1. Google Apps Script Setup:</strong> Create endpoints for 
                /upload (POST), /create (POST), /list (GET), and /get (GET).
              </p>
              <p>
                <strong>2. Environment Variables:</strong> Set VITE_API_BASE_URL 
                and VITE_ADMIN_PASSWORD in your .env file.
              </p>
              <p>
                <strong>3. Security:</strong> Protect /admin directory via 
                cPanel Password Protected Directory for production use.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default Admin
