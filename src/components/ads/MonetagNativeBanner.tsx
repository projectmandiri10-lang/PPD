import { useEffect, useRef } from 'react'
import { MONETAG_TAG_ID, MONETAG_SRC } from '../../config/ads'

/**
 * Monetag Native Banner Ad Component
 * 
 * Native Banner adalah format iklan yang menyatu dengan konten halaman.
 * Iklan ini ditampilkan inline di dalam container yang disediakan.
 * 
 * Untuk mengganti key:
 * 1. Buka file src/config/ads.ts
 * 2. Ganti nilai MONETAG_TAG_ID dengan Tag ID dari Monetag dashboard
 */
function MonetagNativeBanner() {
  const containerRef = useRef<HTMLDivElement>(null)
  const scriptLoaded = useRef(false)

  useEffect(() => {
    // Cek apakah key sudah dikonfigurasi
    if (MONETAG_TAG_ID === 'YOUR_MONETAG_TAG_ID') {
      console.warn('Monetag Native Banner: Tag ID belum dikonfigurasi. Ganti di src/config/ads.ts')
      return
    }

    // Cegah double injection per instance
    if (scriptLoaded.current) return
    if (!containerRef.current) return

    // Cek apakah script sudah ada di container ini
    const existingScript = containerRef.current.querySelector('script')
    if (existingScript) {
      scriptLoaded.current = true
      return
    }

    try {
      // Buat container untuk iklan dengan ID unik
      const adContainer = document.createElement('div')
      adContainer.id = `container-${MONETAG_TAG_ID}`
      containerRef.current.appendChild(adContainer)

      // Buat dan inject script
      const script = document.createElement('script')
      script.type = 'text/javascript'
      script.async = true
      script.src = MONETAG_SRC
      
      // Error handling
      script.onerror = () => {
        console.error('Monetag Native Banner: Failed to load script')
      }
      
      containerRef.current.appendChild(script)
      scriptLoaded.current = true
    } catch (error) {
      console.error('Monetag Native Banner: Error injecting script', error)
    }

    // Cleanup saat unmount
    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }
      scriptLoaded.current = false
    }
  }, [])

  // Jika key belum dikonfigurasi, tampilkan placeholder
  if (MONETAG_TAG_ID === 'YOUR_MONETAG_TAG_ID') {
    return (
      <div className="ad-container">
        <p className="text-sm text-gray-400">
          [Ad Placeholder - Configure MONETAG_TAG_ID]
        </p>
      </div>
    )
  }

  return (
    <div 
      ref={containerRef} 
      className="ad-container min-h-[250px]"
      aria-label="Advertisement"
    />
  )
}

export default MonetagNativeBanner
