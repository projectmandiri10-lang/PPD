import { useState, useEffect, useCallback, useMemo } from 'react'
import { Helmet } from 'react-helmet-async'
import { generateSlug, uploadImage, createImageEntry, clearCache, fetchImageList, getDownloadUrl } from '../lib/api'
import type { ImageItem } from '../types'

const ADMIN_TOKEN_KEY = 'admin_auth_token'
const OPERATORS_STORAGE_KEY = 'app_operators'

type TabType = 'list' | 'upload' | 'operators'
type UserRole = 'admin' | 'operator' | null

interface Operator {
  id: string
  username: string
  password: string
  createdAt: string
}

function Admin() {
  const [userRole, setUserRole] = useState<UserRole>(null)
  const [currentUser, setCurrentUser] = useState<string>('')

  // Login state
  const [loginType, setLoginType] = useState<'admin' | 'operator'>('admin')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('list')

  // Form state
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
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

  // Operator management state
  const [operators, setOperators] = useState<Operator[]>([])
  const [newOperatorEmail, setNewOperatorEmail] = useState('')
  const [newOperatorPassword, setNewOperatorPassword] = useState('')
  const [operatorError, setOperatorError] = useState<string | null>(null)
  const [operatorSuccess, setOperatorSuccess] = useState<string | null>(null)

  // Statistics Filter
  const [filterUploader, setFilterUploader] = useState<string | null>(null)

  const getOperatorStats = useCallback((email: string) => {
    return images.filter(img => img.uploadedBy === email).length
  }, [images])

  const filteredImages = useMemo(() => {
    if (!filterUploader) return images
    return images.filter(img => img.uploadedBy === filterUploader)
  }, [images, filterUploader])

  // Load operators from Supabase
  const loadOperators = async () => {
    try {
      const { supabase } = await import('../lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) return

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/user-management`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ action: 'list_operators' })
      })

      const result = await response.json()

      if (response.ok && result.data) {
        // Map Supabase users to Operator interface
        const ops: Operator[] = result.data.map((u: any) => ({
          id: u.user_id, // Use user_id (Auth UUID) instead of row id
          username: u.email,
          password: '***', // Password not available
          createdAt: u.created_at
        }))
        setOperators(ops)
      }
    } catch (err) {
      console.error('Failed to load operators', err)
    }
  }

  // Check existing auth on mount
  useEffect(() => {
    loadOperators()

    // Check Supabase session for admin
    const checkAuth = async () => {
      const { supabase, getUserRole } = await import('../lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user) {
        const { role } = await getUserRole()
        if (role === 'admin') {
          setUserRole('admin')
          setCurrentUser(session.user.email || '')
          return
        }
      }

      // Check localStorage for operator
      const token = localStorage.getItem(ADMIN_TOKEN_KEY)
      if (token && token.startsWith('operator:')) {
        const opUsername = token.replace('operator:', '')
        const stored = localStorage.getItem(OPERATORS_STORAGE_KEY)
        if (stored) {
          const ops: Operator[] = JSON.parse(stored)
          const op = ops.find(o => o.username === opUsername)
          if (op) {
            setUserRole('operator')
            setCurrentUser(opUsername)
            return
          }
        }
      }

      // No valid session
      localStorage.removeItem(ADMIN_TOKEN_KEY)
    }

    checkAuth()
  }, [])

  // Auto-generate slug from title
  useEffect(() => {
    if (title) {
      setSlug(generateSlug(title))
    }
  }, [title])

  // Load images when authenticated
  useEffect(() => {
    if (userRole) {
      loadImages()
    }
  }, [userRole])

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

  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError('')
    setLoading(true)

    try {
      if (loginType === 'admin') {
        // Admin login with Supabase Auth
        const { supabase, getUserRole } = await import('../lib/supabase')

        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password
        })

        if (error) {
          console.error(error)
          setAuthError(error.message)
          setLoading(false)
          return
        }

        if (!data.user) {
          setAuthError('Login failed')
          setLoading(false)
          return
        }

        // Get user role from database
        const { role, error: roleError } = await getUserRole()

        if (roleError || !role) {
          setAuthError('User not authorized. Please contact administrator.')
          await supabase.auth.signOut()
          setLoading(false)
          return
        }

        if (role !== 'admin') {
          setAuthError('Access denied. Admin privileges required.')
          await supabase.auth.signOut()
          setLoading(false)
          return
        }

        // Success - set admin role
        setUserRole('admin')
        setCurrentUser(data.user.email || '')
        setLoading(false)
      } else {
        // Operator login with Supabase Auth
        const { supabase, getUserRole } = await import('../lib/supabase')

        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password
        })

        if (error) {
          console.error(error)
          setAuthError(error.message)
          setLoading(false)
          return
        }

        if (!data.user) {
          setAuthError('Login failed')
          setLoading(false)
          return
        }

        // Get user role from database
        const { role, error: roleError } = await getUserRole()

        if (roleError || !role) {
          setAuthError('User not authorized. Please contact administrator.')
          await supabase.auth.signOut()
          setLoading(false)
          return
        }

        if (role !== 'operator' && role !== 'admin') {
          setAuthError('Invalid user role.')
          await supabase.auth.signOut()
          setLoading(false)
          return
        }

        // Success - set operator role
        setUserRole(role)
        setCurrentUser(data.user.email || '')
        setLoading(false)
      }
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Login failed')
      setLoading(false)
    }
  }, [loginType, email, password, username])

  const handleLogout = useCallback(async () => {
    if (userRole === 'admin') {
      const { supabase } = await import('../lib/supabase')
      await supabase.auth.signOut()
    } else {
      localStorage.removeItem(ADMIN_TOKEN_KEY)
    }
    setUserRole(null)
    setCurrentUser('')
    setEmail('')
    setUsername('')
    setPassword('')
    setActiveTab('list')
  }, [userRole])

  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
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
      if (!title.trim()) throw new Error('Title is required')
      if (!slug.trim()) throw new Error('Slug is required')
      if (!imageFile) throw new Error('Image file is required')

      setUploadProgress('Uploading image to Google Drive...')
      const uploadResult = await uploadImage(imageFile)

      if (uploadResult.error || !uploadResult.data) {
        throw new Error(uploadResult.error || 'Failed to upload image')
      }

      const { driveFileId, thumbnailUrl } = uploadResult.data

      setUploadProgress('Saving metadata to database...')
      const createResult = await createImageEntry({
        title: title.trim(),
        slug: slug.trim(),
        thumbnailUrl,
        driveFileId,
        downloadUrl: '', // Always empty, using Google Drive link
        uploadedBy: currentUser
      })

      if (createResult.error) throw new Error(createResult.error)

      setTitle('')
      setSlug('')
      setImageFile(null)
      setImagePreview(null)
      setSuccess('Image uploaded successfully!')

      clearCache()
      loadImages()
      setActiveTab('list')

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
      setUploadProgress('')
    }
  }, [title, slug, imageFile, currentUser])

  const handleAddOperator = async (e: React.FormEvent) => {
    e.preventDefault()
    setOperatorError(null)
    setOperatorSuccess(null)
    setLoading(true)

    try {
      const email = newOperatorEmail.trim()
      const password = newOperatorPassword

      if (!email) {
        setOperatorError('Email is required')
        setLoading(false)
        return
      }
      if (!password) {
        setOperatorError('Password is required')
        setLoading(false)
        return
      }
      if (password.length < 6) {
        setOperatorError('Password must be at least 6 characters')
        setLoading(false)
        return
      }

      // Call Supabase Edge Function to create operator
      const { supabase } = await import('../lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        setOperatorError('Not authenticated')
        setLoading(false)
        return
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/user-management`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          action: 'create_operator',
          data: { email, password }
        })
      })

      const result = await response.json()

      if (!response.ok || result.error) {
        setOperatorError(result.error || 'Failed to create operator')
        setLoading(false)
        return
      }

      setNewOperatorEmail('')
      setNewOperatorPassword('')
      setOperatorSuccess(`Operator "${email}" created successfully!`)
      setLoading(false)

      // Reload operators list
      loadOperators()
    } catch (err) {
      setOperatorError(err instanceof Error ? err.message : 'Failed to create operator')
      setLoading(false)
    }
  }

  const handleDeleteOperator = async (id: string, email: string) => {
    if (!confirm(`Are you sure you want to delete operator "${email}"?`)) {
      return
    }

    setLoading(true)
    setOperatorError(null)
    setOperatorSuccess(null)

    try {
      const { supabase } = await import('../lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) throw new Error('Not authenticated')

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/user-management`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          action: 'delete_operator',
          data: { user_id: id }
        })
      })

      const result = await response.json()

      if (!response.ok || result.error) {
        throw new Error(result.error || 'Failed to delete operator')
      }

      setOperatorSuccess(`Operator "${email}" deleted successfully`)
      loadOperators()
    } catch (err) {
      setOperatorError(err instanceof Error ? err.message : 'Failed to delete operator')
    } finally {
      setLoading(false)
    }
  }

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

  const handleDeleteImage = async (image: ImageItem) => {
    if (!confirm(`Are you sure you want to delete "${image.title}"?\n\nThis will remove the entry from the database but will NOT delete the file from Google Drive.`)) {
      return;
    }

    setListLoading(true);
    setListError(null);

    try {
      const { deleteImageEntry } = await import('../lib/api');
      const result = await deleteImageEntry(image.id);

      if (result.error) {
        setListError(result.error);
        alert('Failed to delete image: ' + result.error);
      } else {
        alert('Image deleted successfully!');
        // Reload images
        loadImages();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete image';
      setListError(message);
      alert('Error: ' + message);
    } finally {
      setListLoading(false);
    }
  }

  // Login Screen
  if (!userRole) {
    return (
      <>
        <Helmet>
          <title>Login</title>
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>

        <div className="container-main py-20">
          <div className="max-w-md mx-auto">
            <div className="card p-8">
              <div className="text-center mb-6">
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
                <h1 className="text-2xl font-bold text-gray-900">Login</h1>
              </div>

              {/* Login Type Toggle */}
              <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => setLoginType('admin')}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${loginType === 'admin'
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  Admin
                </button>
                <button
                  type="button"
                  onClick={() => setLoginType('operator')}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${loginType === 'operator'
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  Operator
                </button>
              </div>

              <form onSubmit={handleLogin}>
                <div className="mb-4">
                  <label className="label" htmlFor="email">Email</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                      </svg>
                    </div>
                    <input
                      type="email"
                      id="email"
                      className="input pl-10"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={loginType === 'admin' ? "admin@example.com" : "operator@example.com"}
                      required
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="label" htmlFor="password">Password</label>
                  <input
                    type="password"
                    id="password"
                    className="input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    required
                  />
                </div>

                {authError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                    {authError}
                  </div>
                )}

                <button type="submit" className="btn-primary w-full">
                  Login as {loginType === 'admin' ? 'Admin' : 'Operator'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </>
    )
  }

  // Main Panel
  return (
    <>
      <Helmet>
        <title>{userRole === 'admin' ? 'Admin' : 'Operator'} Panel</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="container-main py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {userRole === 'admin' ? 'Admin' : 'Operator'} Panel
              </h1>
              <p className="text-sm text-gray-500">
                Logged in as: <span className="font-medium">{currentUser}</span>
                <span className={`ml-2 px-2 py-0.5 rounded text-xs ${userRole === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                  {userRole}
                </span>
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="btn-secondary text-sm"
            >
              Logout
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
            <button
              onClick={() => setActiveTab('list')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'list'
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
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'upload'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              <svg className="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Upload New
            </button>
            {userRole === 'admin' && (
              <button
                onClick={() => setActiveTab('operators')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'operators'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
              >
                <svg className="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                Operators ({operators.length})
              </button>
            )}
          </div>

          {/* Image List Tab */}
          {activeTab === 'list' && (
            <div>
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

              {listLoading && (
                <div className="flex justify-center py-12">
                  <div className="spinner"></div>
                </div>
              )}

              {listError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">
                  {listError}
                </div>
              )}

              {filterUploader && (
                <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4 flex justify-between items-center rounded-r-lg shadow-sm">
                  <div className="flex items-center">
                    <svg className="h-5 w-5 text-blue-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    <p className="text-sm text-blue-700">
                      Show uploads by: <span className="font-bold">{filterUploader}</span>
                      {' '}({filteredImages.length} items)
                    </p>
                  </div>
                  <button
                    onClick={() => setFilterUploader(null)}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium underline"
                  >
                    Clear Filter
                  </button>
                </div>
              )}

              {!listLoading && !listError && filteredImages.length === 0 && (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-gray-500">{filterUploader ? 'No images found for this operator' : 'No images uploaded yet'}</p>

                  {!filterUploader ? (
                    <button onClick={() => setActiveTab('upload')} className="btn-primary mt-4">
                      Upload First Image
                    </button>
                  ) : (
                    <button onClick={() => setFilterUploader(null)} className="btn-secondary mt-4">
                      Clear Filter
                    </button>
                  )}
                </div>
              )}

              {!listLoading && !listError && filteredImages.length > 0 && (
                <div className="space-y-4">
                  {filteredImages.map((image) => (
                    <div key={image.id} className="card p-4">
                      <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-shrink-0">
                          <img
                            src={image.thumbnailUrl || `https://drive.google.com/thumbnail?id=${image.driveFileId}&sz=s200`}
                            alt={image.title}
                            className="w-full sm:w-32 h-32 object-cover rounded-lg bg-gray-100"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">{image.title}</h3>
                          <p className="text-sm text-gray-500 mt-1">Slug: {image.slug}</p>
                          <p className="text-sm text-gray-500">ID: {image.driveFileId}</p>
                          {image.createdAt && (
                            <p className="text-sm text-gray-400 mt-1">
                              {new Date(image.createdAt).toLocaleDateString('id-ID', {
                                year: 'numeric', month: 'short', day: 'numeric',
                                hour: '2-digit', minute: '2-digit'
                              })}
                            </p>
                          )}

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
                          {userRole === 'admin' && (
                            <>
                              <button
                                onClick={() => openEditModal(image)}
                                className="btn-secondary text-sm py-2 px-3 flex-1 sm:flex-none"
                              >
                                <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteImage(image)}
                                className="btn-secondary text-sm py-2 px-3 flex-1 sm:flex-none bg-red-50 hover:bg-red-100 text-red-600 border-red-200"
                              >
                                <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Delete
                              </button>
                            </>
                          )}
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

          {/* Upload Tab */}
          {activeTab === 'upload' && (
            <div className="max-w-2xl">
              <div className="card p-6 sm:p-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Upload New Image</h2>

                <form onSubmit={handleSubmit}>
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

                  <div className="mb-4">
                    <label className="label" htmlFor="slug">
                      Slug * <span className="text-gray-400 font-normal ml-1">(auto-generated)</span>
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
                    <p className="text-xs text-gray-500 mt-1">URL: /#/p/{slug || 'your-slug'}</p>
                  </div>

                  <div className="mb-6">
                    <label className="label">Image File *</label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-500 transition-colors">
                      {imagePreview ? (
                        <div className="space-y-4">
                          <img src={imagePreview} alt="Preview" className="max-h-48 mx-auto rounded-lg" />
                          <p className="text-sm text-gray-600">{imageFile?.name}</p>
                          <button
                            type="button"
                            onClick={() => { setImageFile(null); setImagePreview(null) }}
                            className="text-red-600 text-sm hover:text-red-700"
                            disabled={loading}
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <label className="cursor-pointer">
                          <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <p className="text-gray-600 mb-2">Click to upload</p>
                          <p className="text-sm text-gray-400">PNG, JPG, GIF, WebP</p>
                          <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} disabled={loading} />
                        </label>
                      )}
                    </div>
                  </div>

                  {error && <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">{error}</div>}
                  {success && <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-600">{success}</div>}
                  {uploadProgress && (
                    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center">
                      <div className="spinner w-5 h-5 mr-3"></div>
                      <p className="text-blue-600">{uploadProgress}</p>
                    </div>
                  )}

                  <button type="submit" className="btn-primary w-full py-3" disabled={loading || !imageFile}>
                    {loading ? 'Uploading...' : 'Upload Image'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Operators Tab (Admin Only) */}
          {activeTab === 'operators' && userRole === 'admin' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Add Operator Form */}
              <div className="card p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Add New Operator</h2>
                <form onSubmit={handleAddOperator}>
                  <div className="mb-4">
                    <label className="label" htmlFor="newOpEmail">Email *</label>
                    <input
                      type="email"
                      id="newOpEmail"
                      className="input"
                      value={newOperatorEmail}
                      onChange={(e) => setNewOperatorEmail(e.target.value)}
                      placeholder="operator@example.com"
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label className="label" htmlFor="newOpPassword">Password *</label>
                    <input
                      type="password"
                      id="newOpPassword"
                      className="input"
                      value={newOperatorPassword}
                      onChange={(e) => setNewOperatorPassword(e.target.value)}
                      placeholder="Enter password (min 6 chars)"
                      minLength={6}
                      required
                    />
                  </div>

                  {operatorError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                      {operatorError}
                    </div>
                  )}
                  {operatorSuccess && (
                    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm">
                      {operatorSuccess}
                    </div>
                  )}

                  <button type="submit" className="btn-primary w-full" disabled={loading}>
                    {loading ? 'Creating...' : 'Add Operator'}
                  </button>
                </form>

                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> Operators can only upload images and view the list.
                    They cannot edit or delete images.
                  </p>
                </div>
              </div>

              {/* Operator List */}
              <div className="card p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">
                  Registered Operators ({operators.length})
                </h2>

                {operators.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <p>No operators registered</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {operators.map((op) => (
                      <div key={op.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{op.username}</p>
                          <p className="text-xs text-gray-500 mb-1">
                            Created: {new Date(op.createdAt).toLocaleDateString('id-ID')}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                              {getOperatorStats(op.username)} uploads
                            </span>
                            <button
                              onClick={() => {
                                setFilterUploader(op.username);
                                setActiveTab('list');
                              }}
                              className="text-xs text-blue-600 hover:text-blue-800 underline"
                            >
                              View Work
                            </button>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteOperator(op.id, op.username)}
                          className="text-red-600 hover:text-red-700 p-2"
                          title="Delete operator"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal (Admin Only) */}
      {editingImage && userRole === 'admin' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Edit Image</h2>
                <button onClick={closeEditModal} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-6">
                <img
                  src={editingImage.thumbnailUrl || `https://drive.google.com/thumbnail?id=${editingImage.driveFileId}&sz=s400`}
                  alt={editingImage.title}
                  className="w-full h-48 object-contain bg-gray-100 rounded-lg"
                />
              </div>

              <div className="space-y-4">
                <div>
                  <label className="label">Title</label>
                  <input type="text" className="input" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                </div>
                <div>
                  <label className="label">Slug</label>
                  <input type="text" className="input" value={editSlug} onChange={(e) => setEditSlug(e.target.value)} />
                </div>
                <div>
                  <label className="label">Download URL</label>
                  <input type="url" className="input" value={editDownloadUrl} onChange={(e) => setEditDownloadUrl(e.target.value)} placeholder="Leave empty for auto-generated" />
                </div>
                <div>
                  <label className="label">Drive File ID</label>
                  <input type="text" className="input bg-gray-50" value={editingImage.driveFileId} readOnly />
                </div>
              </div>

              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> Edit functionality requires /update endpoint in Google Apps Script.
                </p>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={closeEditModal} className="btn-secondary flex-1">Close</button>
                <button className="btn-primary flex-1" onClick={() => alert('Implement /update endpoint in Google Apps Script.')}>
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
