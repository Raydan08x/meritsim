import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useUserPreferences } from '../context/UserPreferencesContext'
import { studyService, materialService } from '../services/api'
import ProgressCircle from '../components/ProgressCircle'

export default function Dashboard() {
    const { user } = useAuth()
    const { selectedEntity, selectedProfile } = useUserPreferences()
    const navigate = useNavigate()
    const [progress, setProgress] = useState(null)
    const [suggestions, setSuggestions] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadDashboard()
    }, [])

    const loadDashboard = async () => {
        try {
            const [progressRes, suggestionsRes] = await Promise.all([
                studyService.getProgress(),
                materialService.getSuggestions()
            ])
            setProgress(progressRes.data)
            setSuggestions(suggestionsRes.data.suggestions || [])
        } catch (error) {
            console.error('Failed to load dashboard:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <span className="material-symbols-outlined text-primary animate-spin text-4xl">progress_activity</span>
            </div>
        )
    }

    const xpProgress = user ? ((user.xp_points % 1000) / 1000) * 100 : 0
    const xpToNext = 1000 - (user?.xp_points % 1000 || 0)

    return (
        <div className="px-4 py-6 flex flex-col gap-6 max-w-md mx-auto w-full">
            {/* Gamification Section */}
            <section className="card p-5">
                <div className="flex justify-between items-end mb-3">
                    <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-primary mb-1 block">
                            Rango Actual
                        </span>
                        <h3 className="text-xl font-bold">
                            {user?.level >= 10 ? 'Estratega Maestro' :
                                user?.level >= 5 ? 'Experto' : 'Aprendiz'}
                        </h3>
                    </div>
                    <div className="flex items-center gap-1 bg-primary/10 px-2 py-1 rounded text-primary text-sm font-bold">
                        <span className="material-symbols-outlined text-base">military_tech</span>
                        <span>Nvl {user?.level || 1}</span>
                    </div>
                </div>

                {/* Selected Profile Badge */}
                {selectedEntity && (
                    <div className="mb-4 flex items-center gap-2 bg-blue-500/5 px-3 py-2 rounded-lg border border-blue-500/10">
                        <div className="bg-blue-500/10 p-1.5 rounded-full">
                            <span className="material-symbols-outlined text-blue-500 text-lg">{selectedEntity.icon || 'business'}</span>
                        </div>
                        <div className="flex-1">
                            <p className="text-xs text-blue-500 font-bold uppercase tracking-wider">Estudiando para</p>
                            <p className="text-sm font-medium leading-none mt-0.5">
                                {selectedEntity.name} {selectedProfile ? `• ${selectedProfile.name}` : ''}
                            </p>
                        </div>
                        <button
                            onClick={() => navigate('/setup')}
                            className="text-gray-400 hover:text-primary transition-colors"
                        >
                            <span className="material-symbols-outlined text-lg">edit</span>
                        </button>
                    </div>
                )}
                <div className="relative h-3 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-2">
                    <div
                        className="absolute top-0 left-0 h-full bg-primary transition-all duration-1000 ease-out"
                        style={{ width: `${xpProgress}%` }}
                    />
                </div>
                <div className="flex justify-between text-xs font-medium text-gray-500 dark:text-gray-400">
                    <span>{user?.xp_points || 0} XP</span>
                    <span>{xpToNext} XP para siguiente nivel</span>
                </div>
            </section>

            {/* Performance by Entity */}
            <section>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold">Rendimiento por Entidad</h2>
                    <button className="text-primary text-sm font-semibold flex items-center hover:opacity-80">
                        Ver Todo <span className="material-symbols-outlined text-sm ml-0.5">chevron_right</span>
                    </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    {progress?.entity_progress?.length > 0 ? (
                        progress.entity_progress
                            .filter(e => !selectedEntity || e.entity_id === selectedEntity.id || e.entity_name === 'General')
                            .map((entity) => (
                                <EntityCard key={entity.entity_id} entity={entity} />
                            ))
                    ) : (
                        <>
                            <PlaceholderEntityCard name="DIAN" color="#3B82F6" percentage={0} />
                            <PlaceholderEntityCard name="CAR" color="#10B981" percentage={0} />
                            <PlaceholderEntityCard name="Acueducto" color="#06B6D4" percentage={0} />
                            <PlaceholderEntityCard name="General" color="#8B5CF6" percentage={0} />
                        </>
                    )}
                </div>
            </section>

            {/* Recommended Study */}
            <section className="mt-2">
                <h2 className="text-lg font-bold mb-3">Estudio Recomendado</h2>
                {suggestions.length > 0 ? (
                    <div className="card p-5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full -mr-4 -mt-4"></div>
                        <div className="flex items-start gap-4 relative z-10">
                            <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg text-red-500 shrink-0">
                                <span className="material-symbols-outlined text-2xl">picture_as_pdf</span>
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="bg-primary/20 text-green-800 dark:text-primary text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide">
                                        Selección IA
                                    </span>
                                    <span className="text-xs text-gray-400">{suggestions[0].reason}</span>
                                </div>
                                <h3 className="font-bold text-base leading-tight mb-1">
                                    {suggestions[0].title || suggestions[0].filename}
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                                    {suggestions[0].entity && `Entidad: ${suggestions[0].entity}`}
                                </p>
                                <button className="w-full btn-primary">
                                    <span>Abrir PDF</span>
                                    <span className="material-symbols-outlined text-lg">open_in_new</span>
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="card p-5 text-center">
                        <span className="material-symbols-outlined text-4xl text-gray-400 mb-2">auto_stories</span>
                        <p className="text-gray-500 text-sm">
                            Completa algunos ejercicios para recibir recomendaciones personalizadas
                        </p>
                        <button
                            onClick={() => navigate('/study')}
                            className="mt-4 btn-primary"
                        >
                            <span>Comenzar a Estudiar</span>
                            <span className="material-symbols-outlined">arrow_forward</span>
                        </button>
                    </div>
                )}
            </section>

            {/* Quick Stats */}
            <section className="grid grid-cols-3 gap-3">
                <StatCard
                    icon="quiz"
                    value={progress?.total_sessions || 0}
                    label="Sesiones"
                />
                <StatCard
                    icon="check_circle"
                    value={`${Math.round(progress?.correct_percentage || 0)}%`}
                    label="Aciertos"
                />
                <StatCard
                    icon="local_fire_department"
                    value={user?.xp_points || 0}
                    label="XP Total"
                />
            </section>
        </div>
    )
}

function EntityCard({ entity }) {
    const percentage = Math.round(entity.percentage || 0)
    const isLow = percentage < 50

    return (
        <div className="card p-4 flex flex-col items-center relative overflow-hidden">
            <div className={`absolute top-3 right-3 ${isLow ? 'text-orange-500 bg-orange-50 dark:bg-orange-900/20' : 'text-green-500 bg-green-50 dark:bg-green-900/20'} px-1.5 py-0.5 rounded text-xs font-bold flex items-center`}>
                <span className="material-symbols-outlined text-xs mr-0.5">
                    {isLow ? 'priority_high' : 'trending_up'}
                </span>
                {isLow ? 'Foco' : `${entity.total_answers > 0 ? '+' : ''}${percentage - 50}%`}
            </div>
            <ProgressCircle percentage={percentage} color={entity.color} />
            <h3 className="font-bold text-center mt-2">{entity.entity_name}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                {entity.total_answers} respuestas
            </p>
        </div>
    )
}

function PlaceholderEntityCard({ name, color, percentage }) {
    return (
        <div className="card p-4 flex flex-col items-center">
            <ProgressCircle percentage={percentage} color={color} />
            <h3 className="font-bold text-center mt-2">{name}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">Sin datos</p>
        </div>
    )
}

function StatCard({ icon, value, label }) {
    return (
        <div className="card p-3 text-center">
            <span className="material-symbols-outlined text-primary text-xl mb-1">{icon}</span>
            <p className="text-lg font-bold">{value}</p>
            <p className="text-xs text-gray-500">{label}</p>
        </div>
    )
}
