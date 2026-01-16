import { useEffect, useRef } from 'react'
import { ADSTERRA_SOCIALBAR_KEY } from '../../config/ads'

/**
 * Adsterra Social Bar Ad Component
 * 
 * Social Bar adalah format iklan yang biasanya muncul sebagai floating bar
 * di bagian bawah layar. Iklan ini tidak mengganggu konten utama.
 * 
 * Untuk mengganti key:
 * 1. Buka file src/config/ads.ts
 * 2. Ganti nilai ADSTERRA_SOCIALBAR_KEY dengan key dari Adsterra dashboard
 */
function AdsterraSocialBar() {
  const containerRef = useRef<HTMLDivElement>(null)
  const scriptLoaded = useRef(false)

  useEffect(() => {
    // Cek apakah key sudah dikonfigurasi
    if (ADSTERRA_SOCIALBAR_KEY === 'YOUR_SOCIALBAR_KEY_HERE') {
      console.warn('Adsterra Social Bar: Key belum dikonfigurasi. Ganti di src/config/ads.ts')
      return
    }

    // Cegah double injection
    if (scriptLoaded.current) return
    
    // Cek apakah script sudah ada
    const existingScript = document.querySelector(`script[src*="${ADSTERRA_SOCIALBAR_KEY}"]`)
    if (existingScript) {
      scriptLoaded.current = true
      return
    }

    try {
      // Buat dan inject script
      const script = document.createElement('script')
      script.type = 'text/javascript'
      script.async = true
      script.src = `//www.topcreativeformat.com/${ADSTERRA_SOCIALBAR_KEY}/invoke.js`
      
      // Error handling
      script.onerror = () => {
        console.error('Adsterra Social Bar: Failed to load script')
      }
      
      document.body.appendChild(script)
      scriptLoaded.current = true
    } catch (error) {
      console.error('Adsterra Social Bar: Error injecting script', error)
    }

    // Cleanup tidak diperlukan untuk Social Bar karena biasanya persistent
  }, [])

  // Social Bar tidak memerlukan container visible karena menggunakan posisi fixed
  // Tapi kita tetap render div kosong untuk reference
  return <div ref={containerRef} id="adsterra-social-bar" style={{ display: 'none' }} />
}

export default AdsterraSocialBar
