import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { fetchImageBySlug, getDriveThumbnailUrl } from '../lib/api'
import type { ImageItem } from '../types'

const siteName = import.meta.env.VITE_SITE_NAME || 'Image Download Hub'
const siteUrl = import.meta.env.VITE_SITE_URL || ''

function Post() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [item, setItem] = useState<ImageItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [imageLoaded, setImageLoaded] = useState(false)

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
      }
      
      setLoading(false)
    }
    
    loadItem()
  }, [slug, navigate])

  // Get image URL - prefer thumbnailUrl, fallback to Drive thumbnail
  const getImageUrl = (item: ImageItem, size: 'medium' | 'large' = 'large') => {
    if (item.thumbnailUrl && item.thumbnailUrl.trim()) {
      return item.thumbnailUrl
    }
    return getDriveThumbnailUrl(item.driveFileId, size)
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Image Not Found</h1>
          <p className="text-gray-500 mb-6">
            {error || 'The image you are looking for does not exist.'}
          </p>
          <Link to="/" className="btn-primary">
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  const pageUrl = `${siteUrl}/#/p/${item.slug}`
  const downloadPageUrl = `${siteUrl}/#/d/${item.slug}`

  return (
    <>
      <Helmet>
        <title>{item.title} - {siteName}</title>
        <meta name="description" content={`Download ${item.title} - High quality image from ${siteName}. Free HD download.`} />
        <meta name="keywords" content={`${item.title}, download, free image, HD, wallpaper, ${siteName}`} />
        
        {/* Open Graph */}
        <meta property="og:title" content={`${item.title} - ${siteName}`} />
        <meta property="og:description" content={`Download ${item.title} - High quality image. Free HD download.`} />
        <meta property="og:image" content={getImageUrl(item, 'large')} />
        <meta property="og:image:alt" content={item.title} />
        <meta property="og:type" content="article" />
        <meta property="og:site_name" content={siteName} />
        {siteUrl && <meta property="og:url" content={pageUrl} />}
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${item.title} - ${siteName}`} />
        <meta name="twitter:description" content={`Download ${item.title} - High quality image`} />
        <meta name="twitter:image" content={getImageUrl(item, 'large')} />
        <meta name="twitter:image:alt" content={item.title} />
        
        {/* SEO */}
        <link rel="canonical" href={pageUrl} />
        <meta name="robots" content="index, follow, max-image-preview:large" />
        
        {/* Structured Data - ImageObject */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ImageObject",
            "name": item.title,
            "description": `Download ${item.title} - High quality image from ${siteName}`,
            "contentUrl": getImageUrl(item, 'large'),
            "thumbnailUrl": getImageUrl(item, 'medium'),
            "uploadDate": item.createdAt,
            "author": {
              "@type": "Organization",
              "name": siteName
            },
            "copyrightHolder": {
              "@type": "Organization", 
              "name": siteName
            }
          })}
        </script>
        
        {/* Breadcrumb Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": siteUrl || window.location.origin
              },
              {
                "@type": "ListItem",
                "position": 2,
                "name": item.title,
                "item": pageUrl
              }
            ]
          })}
        </script>
      </Helmet>

      <div className="container-main py-8">
        {/* Breadcrumb */}
        <nav className="mb-6">
          <ol className="flex items-center text-sm text-gray-500">
            <li>
              <Link to="/" className="hover:text-primary-600 transition-colors">Home</Link>
            </li>
            <li className="mx-2">/</li>
            <li className="text-gray-900 font-medium truncate max-w-xs">{item.title}</li>
          </ol>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Image Preview */}
          <div className="lg:col-span-2">
            <div className="card p-4">
              <div className="relative bg-gray-100 rounded-lg overflow-hidden">
                {!imageLoaded && (
                  <div className="absolute inset-0 img-placeholder"></div>
                )}
                <img
                  src={getImageUrl(item, 'large')}
                  alt={item.title}
                  className={`w-full h-auto max-h-[70vh] object-contain transition-opacity duration-300 ${
                    imageLoaded ? 'opacity-100' : 'opacity-0'
                  }`}
                  onLoad={() => setImageLoaded(true)}
                  onError={() => setImageLoaded(true)}
                />
              </div>
            </div>
          </div>

          {/* Info & Actions */}
          <div className="lg:col-span-1">
            <div className="card p-6 sticky top-24">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                {item.title}
              </h1>

              {item.createdAt && (
                <p className="text-sm text-gray-500 mb-6">
                  Added: {new Date(item.createdAt).toLocaleDateString('id-ID', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              )}

              {/* Download Button */}
              <Link
                to={`/d/${item.slug}`}
                className="btn-primary w-full text-center mb-4 py-3"
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
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" 
                  />
                </svg>
                Download
              </Link>

              {/* Share Section */}
              <div className="border-t border-gray-200 pt-4 mt-4">
                <p className="text-sm font-medium text-gray-700 mb-3">Share:</p>
                <div className="flex gap-2">
                  {/* Pinterest Share - uses /#/d/slug for better monetization */}
                  <a
                    href={`https://pinterest.com/pin/create/button/?url=${encodeURIComponent(downloadPageUrl)}&media=${encodeURIComponent(getImageUrl(item, 'large'))}&description=${encodeURIComponent(item.title)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-10 h-10 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    title="Share on Pinterest"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z"/>
                    </svg>
                  </a>

                  {/* Twitter Share */}
                  <a
                    href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(pageUrl)}&text=${encodeURIComponent(item.title)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-10 h-10 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
                    title="Share on Twitter"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                    </svg>
                  </a>

                  {/* Facebook Share */}
                  <a
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-10 h-10 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    title="Share on Facebook"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </a>

                  {/* Copy Link */}
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(pageUrl)
                      alert('Link copied!')
                    }}
                    className="flex items-center justify-center w-10 h-10 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    title="Copy Link"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default Post
