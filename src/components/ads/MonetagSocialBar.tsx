import { useEffect, useRef } from 'react'
import { MONETAG_TAG_ID, MONETAG_SRC } from '../../config/ads'

/**
 * Monetag Social Bar Ad Component
 * 
 * Social Bar adalah format iklan yang biasanya muncul sebagai floating bar
 * di bagian bawah layar. Iklan ini tidak mengganggu konten utama.
 * 
 * Untuk mengganti key:
 * 1. Buka file src/config/ads.ts
 * 2. Ganti nilai MONETAG_TAG_ID dengan Tag ID dari Monetag dashboard
 */
function MonetagSocialBar() {
  const containerRef = useRef<HTMLDivElement>(null)
  const scriptLoaded = useRef(false)

  useEffect(() => {
    // Cek apakah key sudah dikonfigurasi
    if (MONETAG_TAG_ID === 'YOUR_MONETAG_TAG_ID') {
      console.warn('Monetag Social Bar: Tag ID belum dikonfigurasi. Ganti di src/config/ads.ts')
      return
    }

    // Cegah double injection
    if (scriptLoaded.current) return
    
    // Cek apakah script sudah ada
    const existingScript = document.querySelector(`script[src*="${MONETAG_TAG_ID}"]`)
    if (existingScript) {
      scriptLoaded.current = true
      return
    }

    try {
      // Buat dan inject script
      const script = document.createElement('script')
      script.type = 'text/javascript'
      script.async = true
      script.src = MONETAG_SRC
      
      // Error handling
      script.onerror = () => {
        console.error('Monetag Social Bar: Failed to load script')
      }
      
      document.body.appendChild(script)
      scriptLoaded.current = true
    } catch (error) {
      console.error('Monetag Social Bar: Error injecting script', error)
    }

    // Cleanup tidak diperlukan untuk Social Bar karena biasanya persistent
  }, [])

  // Social Bar tidak memerlukan container visible karena menggunakan posisi fixed
  // Tapi kita tetap render div kosong untuk reference
  return <div ref={containerRef} id="monetag-social-bar" style={{ display: 'none' }} />
}

export default MonetagSocialBar
