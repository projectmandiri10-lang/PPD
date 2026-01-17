import { useEffect, useRef } from 'react'
import { MONETAG_MULTITAG_URL, MONETAG_MULTITAG_ZONE } from '../../config/ads'

function MonetagMultitag() {
    const scriptLoaded = useRef(false)

    useEffect(() => {
        // Prevent double injection
        if (scriptLoaded.current) return
        if (document.querySelector(`script[src="${MONETAG_MULTITAG_URL}"]`)) {
            scriptLoaded.current = true
            return
        }

        try {
            const script = document.createElement('script')
            script.src = MONETAG_MULTITAG_URL
            script.dataset.zone = MONETAG_MULTITAG_ZONE
            script.async = true
            script.dataset.cfasync = "false"

            // Inject to head as requested by Monetag
            document.head.appendChild(script)
            scriptLoaded.current = true

            console.log('Monetag Multitag loaded')
        } catch (error) {
            console.error('Failed to load Monetag Multitag', error)
        }
    }, [])

    return null // This component doesn't render anything visible
}

export default MonetagMultitag
