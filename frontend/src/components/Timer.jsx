import { useState, useEffect } from 'react'

export default function Timer({ minutes, onExpire }) {
    const [seconds, setSeconds] = useState(minutes * 60)

    useEffect(() => {
        if (seconds <= 0) {
            onExpire?.()
            return
        }

        const interval = setInterval(() => {
            setSeconds(prev => prev - 1)
        }, 1000)

        return () => clearInterval(interval)
    }, [seconds, onExpire])

    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    const isLow = seconds < 60 * 5 // Less than 5 minutes

    return (
        <div className={`flex items-center gap-1 px-2 py-1 rounded font-mono text-sm font-bold ${isLow ? 'bg-red-500/10 text-red-500' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}>
            <span className="material-symbols-outlined text-base">timer</span>
            <span>
                {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
            </span>
        </div>
    )
}
