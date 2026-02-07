import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function Profile() {
    const { user, logout } = useAuth()
    const navigate = useNavigate()

    const handleLogout = () => {
        logout()
        navigate('/login')
    }

    const xpProgress = user ? ((user.xp_points % 1000) / 1000) * 100 : 0
    const xpToNext = 1000 - (user?.xp_points % 1000 || 0)

    const getRankName = (level) => {
        if (level >= 20) return 'Maestro Supremo'
        if (level >= 15) return 'Gran Estratega'
        if (level >= 10) return 'Estratega Maestro'
        if (level >= 7) return 'Experto Avanzado'
        if (level >= 5) return 'Experto'
        if (level >= 3) return 'Estudioso'
        return 'Aprendiz'
    }

    return (
        <div className="px-4 py-6 max-w-md mx-auto">
            {/* Profile Card */}
            <div className="card p-6 text-center mb-6">
                <div className="relative inline-block mb-4">
                    <div className="size-24 bg-primary/20 rounded-full flex items-center justify-center border-4 border-primary">
                        <span className="text-4xl font-bold text-primary">
                            {user?.full_name?.[0] || user?.email?.[0] || 'U'}
                        </span>
                    </div>
                    <div className="absolute bottom-0 right-0 bg-primary text-background-dark rounded-full p-1">
                        <span className="material-symbols-outlined text-lg">verified</span>
                    </div>
                </div>
                <h1 className="text-xl font-bold mb-1">{user?.full_name || 'Usuario'}</h1>
                <p className="text-gray-500 text-sm mb-4">{user?.email}</p>

                {/* Badges */}
                <div className="flex justify-center gap-2 mb-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${user?.role === 'ADMIN' ? 'bg-primary/20 text-primary' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                        }`}>
                        {user?.role === 'ADMIN' ? 'Administrador' : 'Usuario'}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-500">
                        {getRankName(user?.level || 1)}
                    </span>
                </div>
            </div>

            {/* Gamification Stats */}
            <div className="card p-5 mb-6">
                <h2 className="font-bold mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">military_tech</span>
                    Progreso de Nivel
                </h2>

                <div className="flex items-center gap-4 mb-3">
                    <div className="text-center">
                        <span className="text-3xl font-bold">{user?.level || 1}</span>
                        <span className="block text-xs text-gray-500">Nivel</span>
                    </div>
                    <div className="flex-1">
                        <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-primary to-green-300 transition-all duration-500"
                                style={{ width: `${xpProgress}%` }}
                            />
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>{user?.xp_points || 0} XP</span>
                            <span>{xpToNext} XP restantes</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3 mb-6">
                <StatCard icon="auto_stories" value={user?.xp_points || 0} label="XP Total" />
                <StatCard icon="emoji_events" value={user?.level || 1} label="Nivel" />
                <StatCard icon="stars" value={getRankName(user?.level || 1).split(' ')[0]} label="Rango" />
            </div>

            {/* Actions */}
            <div className="space-y-3">
                <button className="w-full card p-4 flex items-center gap-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <span className="material-symbols-outlined text-gray-400">settings</span>
                    <span className="flex-1 font-medium">Configuración</span>
                    <span className="material-symbols-outlined text-gray-400">chevron_right</span>
                </button>

                <button className="w-full card p-4 flex items-center gap-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <span className="material-symbols-outlined text-gray-400">help</span>
                    <span className="flex-1 font-medium">Ayuda</span>
                    <span className="material-symbols-outlined text-gray-400">chevron_right</span>
                </button>

                <button
                    onClick={handleLogout}
                    className="w-full card p-4 flex items-center gap-4 text-left hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-red-500"
                >
                    <span className="material-symbols-outlined">logout</span>
                    <span className="flex-1 font-medium">Cerrar Sesión</span>
                    <span className="material-symbols-outlined">chevron_right</span>
                </button>
            </div>

            {/* Version */}
            <p className="text-center text-xs text-gray-400 mt-8">
                MeritSim v1.0.0 • Hecho con ❤️ en Colombia
            </p>
        </div>
    )
}

function StatCard({ icon, value, label }) {
    return (
        <div className="card p-3 text-center">
            <span className="material-symbols-outlined text-primary text-xl mb-1">{icon}</span>
            <p className="text-lg font-bold truncate">{value}</p>
            <p className="text-xs text-gray-500">{label}</p>
        </div>
    )
}
