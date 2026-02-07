export default function ProgressCircle({ percentage = 0, color = '#13ec5b', size = 80 }) {
    const strokeWidth = 3
    const radius = 15.9155
    const circumference = 2 * Math.PI * radius
    const offset = circumference - (percentage / 100) * circumference

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg className="size-full -rotate-90" viewBox="0 0 36 36">
                {/* Background Circle */}
                <path
                    className="text-gray-100 dark:text-gray-800"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                />
                {/* Progress Circle */}
                <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${percentage}, 100`}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dasharray 0.5s ease-out' }}
                />
            </svg>
            <div className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 text-lg font-bold">
                {Math.round(percentage)}<span className="text-xs">%</span>
            </div>
        </div>
    )
}
