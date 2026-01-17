import { Outlet, Link, useLocation } from 'react-router-dom'

const siteName = import.meta.env.VITE_SITE_NAME || 'Image Download Hub'

function Layout() {
  const location = useLocation()
  const isAdmin = location.pathname === '/admin'

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="container-main">
          <div className="flex items-center h-16">
            {/* Logo - Left */}
            <div className="flex-shrink-0 z-10">
              <Link
                to="/"
                className="text-xl font-bold text-primary-600 hover:text-primary-700 transition-colors"
              >
                {siteName}
              </Link>
            </div>

            {/* Navigation - Centered */}
            <nav className="flex-1 flex items-center justify-center gap-6 absolute inset-x-0 h-16 pointer-events-none">
              <div className="pointer-events-auto flex items-center gap-6">
                <Link
                  to="/"
                  className={`text-sm font-medium transition-colors ${location.pathname === '/'
                      ? 'text-primary-600'
                      : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  Home
                </Link>
                {!isAdmin && (
                  <Link
                    to="/admin"
                    className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    Login
                  </Link>
                )}
              </div>
            </nav>

            {/* Spacer for Right side balance if needed, or actions */}
            <div className="flex-shrink-0 w-[100px] hidden sm:block"></div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="container-main py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500">
              &copy; {new Date().getFullYear()} {siteName}. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <Link
                to="/"
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Home
              </Link>
              <a
                href="#/privacy"
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Privacy
              </a>
              <a
                href="#/terms"
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Terms
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Layout
