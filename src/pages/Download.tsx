import { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { fetchImageBySlug, getDownloadUrl, getDriveThumbnailUrl } from '../lib/api'
import Countdown from '../components/Countdown'
import MonetagSocialBar from '../components/ads/MonetagSocialBar'
import MonetagNativeBanner from '../components/ads/MonetagNativeBanner'
import type { ImageItem } from '../types'

const siteName = import.meta.env.VITE_SITE_NAME || 'Image Download Hub'
const siteUrl = import.meta.env.VITE_SITE_URL || ''
const COUNTDOWN_DURATION = 8 // seconds

function Download() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [item, setItem] = useState<ImageItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [countdownComplete, setCountdownComplete] = useState(false)
  const [redirectFailed, setRedirectFailed] = useState(false)
  const [downloadUrl, setDownloadUrl] = useState('')

  useEffect(() => {
    async function loadItem() {
      if (!slug) {
        navigate('/404')
        return
      }

      setLoading(true)
      setError(null)

      const result = await fetchImageBySlug(slug)

      if (result.error || !result.data) {
        setError(result.error || 'Image not found')
      } else {
        setItem(result.data)
        setDownloadUrl(getDownloadUrl(result.data))
      }

      setLoading(false)
    }

    loadItem()
  }, [slug, navigate])

  const handleCountdownComplete = useCallback(() => {
    setCountdownComplete(true)
  }, [])

  const handleDownload = useCallback(() => {
    if (!downloadUrl) return

    try {
      // Try to open download in new window
      const newWindow = window.open(downloadUrl, '_blank')

      // If popup was blocked or failed, show manual link
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        setRedirectFailed(true)
      }
    } catch {
      setRedirectFailed(true)
    }
  }, [downloadUrl])

  // Get image URL
  const getImageUrl = (item: ImageItem) => {
    if (item.thumbnailUrl && item.thumbnailUrl.trim()) {
      return item.thumbnailUrl
    }
    return getDriveThumbnailUrl(item.driveFileId)
  }

  if (loading) {
    return (
      <div className="container-main py-20">
        <div className="flex flex-col items-center justify-center">
          <div className="spinner mb-4"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  if (error || !item) {
    return (
      <div className="container-main py-20">
        <div className="max-w-md mx-auto text-center">
          <svg
            className="w-16 h-16 text-gray-300 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Download Not Found</h1>
          <p className="text-gray-500 mb-6">
            {error || 'The download you are looking for does not exist.'}
          </p>
          <Link to="/" className="btn-primary">
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  const pageUrl = `${siteUrl}/#/d/${item.slug}`

  return (
    <>
      <Helmet>
        <title>Download {item.title} - {siteName}</title>
        <meta name="description" content={`Download ${item.title} - Free high quality image download from ${siteName}`} />
        <meta property="og:title" content={`Download ${item.title} - ${siteName}`} />
        <meta property="og:description" content={`Download ${item.title} - Free high quality image`} />
        <meta property="og:image" content={getImageUrl(item)} />
        <meta property="og:type" content="website" />
        {siteUrl && <meta property="og:url" content={pageUrl} />}
        <meta name="robots" content="noindex, follow" />
        <link rel="canonical" href={pageUrl} />
      </Helmet>

      <div className="container-main py-8">
        {/* Breadcrumb */}
        <nav className="mb-6">
          <ol className="flex items-center text-sm text-gray-500 flex-wrap">
            <li>
              <Link to="/" className="hover:text-primary-600 transition-colors">Home</Link>
            </li>
            <li className="mx-2">/</li>
            <li>
              <Link to={`/p/${item.slug}`} className="hover:text-primary-600 transition-colors truncate max-w-[150px] inline-block">
                {item.title}
              </Link>
            </li>
            <li className="mx-2">/</li>
            <li className="text-gray-900 font-medium">Download</li>
          </ol>
        </nav>

        {/* Ad - Native Banner Top */}
        <div className="mb-6">
          <MonetagNativeBanner />
        </div>

        {/* Main Download Card */}
        <div className="max-w-2xl mx-auto">
          <div className="card p-6 sm:p-8">
            {/* Preview Image */}
            <div className="flex justify-center mb-6">
              <img
                src={getImageUrl(item)}
                alt={item.title}
                className="max-w-full h-auto max-h-48 rounded-lg shadow-md object-contain"
              />
            </div>

            {/* Title */}
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 text-center mb-6">
              {item.title}
            </h1>

            {/* Countdown / Download Section */}
            <div className="text-center">
              {!countdownComplete ? (
                <>
                  <p className="text-gray-600 mb-4">
                    Please wait while we prepare your download...
                  </p>
                  <Countdown
                    duration={COUNTDOWN_DURATION}
                    onComplete={handleCountdownComplete}
                  />
                </>
              ) : (
                <>
                  {!redirectFailed ? (
                    <button
                      onClick={handleDownload}
                      className="btn-success w-full sm:w-auto px-8 py-3 text-lg"
                    >
                      <svg
                        className="w-6 h-6 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                      Continue Download
                    </button>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-yellow-800 mb-3">
                        Popup blocked? Click the link below to download manually:
                      </p>
                      <a
                        href={downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-primary inline-flex"
                      >
                        <svg
                          className="w-5 h-5 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                        Direct Download Link
                      </a>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Back Link */}
            <div className="text-center mt-6 pt-6 border-t border-gray-200">
              <Link
                to={`/p/${item.slug}`}
                className="text-primary-600 hover:text-primary-700 font-medium transition-colors"
              >
                &larr; Back to Image Details
              </Link>
            </div>
          </div>
        </div>

        {/* Ad - Native Banner Bottom */}
        <div className="mt-6">
          <MonetagNativeBanner />
        </div>

        {/* Social Bar Ad (fixed position) */}
        <MonetagSocialBar />
      </div>
    </>
  )
}

export default Download
