import { useState, useEffect, useCallback } from 'react'

interface CountdownProps {
  duration: number // in seconds
  onComplete: () => void
}

function Countdown({ duration, onComplete }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState(duration)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (timeLeft <= 0) {
      onComplete()
      return
    }

    const timer = setInterval(() => {
      setTimeLeft((prev: number) => {
        const newTime = prev - 0.1
        if (newTime <= 0) {
          clearInterval(timer)
          return 0
        }
        return newTime
      })
    }, 100) // Update every 100ms for smoother animation

    return () => clearInterval(timer)
  }, [timeLeft, onComplete])

  // Update progress
  useEffect(() => {
    const newProgress = ((duration - timeLeft) / duration) * 100
    setProgress(Math.min(newProgress, 100))
  }, [timeLeft, duration])

  const formatTime = useCallback((seconds: number) => {
    return Math.ceil(seconds).toString()
  }, [])

  // Calculate SVG circle properties
  const radius = 45
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <div className="flex flex-col items-center">
      {/* Circular Progress */}
      <div className="relative w-28 h-28 mb-4">
        {/* Background circle */}
        <svg className="w-full h-full" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="8"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="8"
            strokeLinecap="round"
            className="countdown-circle transition-all duration-100"
            style={{
              strokeDasharray: circumference,
              strokeDashoffset: strokeDashoffset,
            }}
          />
        </svg>
        
        {/* Timer text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-3xl font-bold text-gray-800">
            {formatTime(timeLeft)}
          </span>
        </div>
      </div>

      {/* Progress bar (alternative visual) */}
      <div className="w-full max-w-xs bg-gray-200 rounded-full h-2 overflow-hidden">
        <div 
          className="h-full bg-primary-600 rounded-full progress-bar"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Status text */}
      <p className="text-sm text-gray-500 mt-3">
        {timeLeft > 0 ? (
          <>
            Your download will be ready in <strong>{formatTime(timeLeft)}</strong> seconds
          </>
        ) : (
          <span className="text-green-600 font-medium">Ready!</span>
        )}
      </p>
    </div>
  )
}

export default Countdown
