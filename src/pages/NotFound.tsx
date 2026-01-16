import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'

const siteName = import.meta.env.VITE_SITE_NAME || 'Image Download Hub'

function NotFound() {
  return (
    <>
      <Helmet>
        <title>404 - Page Not Found - {siteName}</title>
        <meta name="robots" content="noindex, follow" />
      </Helmet>

      <div className="container-main py-20">
        <div className="max-w-md mx-auto text-center">
          {/* 404 Icon */}
          <div className="mb-8">
            <span className="text-9xl font-bold text-gray-200">404</span>
          </div>

          {/* Message */}
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Page Not Found
          </h1>
          <p className="text-gray-500 mb-8">
            Oops! The page you are looking for doesn't exist or has been moved.
          </p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/" className="btn-primary">
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
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" 
                />
              </svg>
              Go Home
            </Link>
            <button 
              onClick={() => window.history.back()}
              className="btn-secondary"
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
                  d="M10 19l-7-7m0 0l7-7m-7 7h18" 
                />
              </svg>
              Go Back
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default NotFound
