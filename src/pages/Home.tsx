import { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { fetchImageList } from '../lib/api'
import GalleryGrid from '../components/GalleryGrid'
import type { ImageItem } from '../types'

const siteName = import.meta.env.VITE_SITE_NAME || 'Image Download Hub'
const siteUrl = import.meta.env.VITE_SITE_URL || ''

function Home() {
  const [images, setImages] = useState<ImageItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadImages() {
      setLoading(true)
      setError(null)
      
      const result = await fetchImageList()
      
      if (result.error) {
        setError(result.error)
      } else if (result.data) {
        setImages(result.data)
      }
      
      setLoading(false)
    }
    
    loadImages()
  }, [])

  return (
    <>
      <Helmet>
        <title>{siteName} - Download High Quality Images</title>
        <meta 
          name="description" 
          content={`Download high quality images for free at ${siteName}. Browse our collection of beautiful images.`} 
        />
        <meta property="og:title" content={`${siteName} - Download High Quality Images`} />
        <meta 
          property="og:description" 
          content={`Download high quality images for free at ${siteName}.`} 
        />
        <meta property="og:type" content="website" />
        {siteUrl && <meta property="og:url" content={siteUrl} />}
        <link rel="canonical" href={siteUrl || window.location.origin} />
      </Helmet>

      <div className="container-main py-8">
        {/* Hero Section */}
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Welcome to {siteName}
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Discover and download high quality images for your projects. 
            Browse our collection and find the perfect image.
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="spinner mb-4"></div>
            <p className="text-gray-500">Loading images...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="max-w-md mx-auto bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <svg 
              className="w-12 h-12 text-red-400 mx-auto mb-4" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
              />
            </svg>
            <h3 className="text-lg font-semibold text-red-800 mb-2">Failed to load images</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="btn-primary"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && images.length === 0 && (
          <div className="text-center py-20">
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
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
              />
            </svg>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No images yet</h3>
            <p className="text-gray-500">Check back later for new content.</p>
          </div>
        )}

        {/* Image Grid */}
        {!loading && !error && images.length > 0 && (
          <GalleryGrid images={images} />
        )}
      </div>
    </>
  )
}

export default Home
