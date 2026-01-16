import { useEffect, useRef } from 'react'
import { ADSTERRA_NATIVE_KEY } from '../../config/ads'

/**
 * Adsterra Native Banner Ad Component
 * 
 * Native Banner adalah format iklan yang menyatu dengan konten halaman.
 * Iklan ini ditampilkan inline di dalam container yang disediakan.
 * 
 * Untuk mengganti key:
 * 1. Buka file src/config/ads.ts
 * 2. Ganti nilai ADSTERRA_NATIVE_KEY dengan key dari Adsterra dashboard
 */
function AdsterraNativeBanner() {
  const containerRef = useRef<HTMLDivElement>(null)
  const scriptLoaded = useRef(false)

  useEffect(() => {
    // Cek apakah key sudah dikonfigurasi
    if (ADSTERRA_NATIVE_KEY === 'YOUR_NATIVE_KEY_HERE') {
      console.warn('Adsterra Native Banner: Key belum dikonfigurasi. Ganti di src/config/ads.ts')
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
      adContainer.id = `container-${ADSTERRA_NATIVE_KEY}`
      containerRef.current.appendChild(adContainer)

      // Buat dan inject script
      const script = document.createElement('script')
      script.type = 'text/javascript'
      script.async = true
      script.src = `//www.profitabledisplaynetwork.com/${ADSTERRA_NATIVE_KEY}/invoke.js`
      
      // Error handling
      script.onerror = () => {
        console.error('Adsterra Native Banner: Failed to load script')
      }
      
      containerRef.current.appendChild(script)
      scriptLoaded.current = true
    } catch (error) {
      console.error('Adsterra Native Banner: Error injecting script', error)
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
  if (ADSTERRA_NATIVE_KEY === 'YOUR_NATIVE_KEY_HERE') {
    return (
      <div className="ad-container">
        <p className="text-sm text-gray-400">
          [Ad Placeholder - Configure ADSTERRA_NATIVE_KEY]
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

export default AdsterraNativeBanner
