import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserPreferences } from '../context/UserPreferencesContext'
import { studyService } from '../services/api'

// Hardcoded profiles per entity
const PROFILES = {
    DIAN: [
        { id: 1, name: 'Gestor I', description: 'Nivel asistencial', xp_bonus: 1.0 },
        { id: 2, name: 'Gestor II', description: 'Nivel técnico', xp_bonus: 1.1 },
        { id: 3, name: 'Profesional I', description: 'Nivel profesional junior', xp_bonus: 1.2 },
        { id: 4, name: 'Profesional II', description: 'Nivel profesional senior', xp_bonus: 1.3 },
    ],
    CAR: [
        { id: 5, name: 'Técnico Operativo', description: 'Nivel técnico', xp_bonus: 1.0 },
        { id: 6, name: 'Profesional Universitario', description: 'Nivel profesional', xp_bonus: 1.2 },
        { id: 7, name: 'Profesional Especializado', description: 'Nivel especializado', xp_bonus: 1.3 },
    ],
    Acueducto: [
        { id: 8, name: 'Auxiliar Administrativo', description: 'Nivel auxiliar', xp_bonus: 1.0 },
        { id: 9, name: 'Técnico', description: 'Nivel técnico', xp_bonus: 1.1 },
        { id: 10, name: 'Profesional', description: 'Nivel profesional', xp_bonus: 1.2 },
    ],
    General: [
        { id: 11, name: 'Competencias Comportamentales', description: 'Aplica a todas las entidades', xp_bonus: 1.0 },
    ]
}

export default function EntitySelection() {
    const navigate = useNavigate()
    const { selectedEntity, setSelectedEntity, selectedProfile, setSelectedProfile } = useUserPreferences()
    const [entities, setEntities] = useState([])
    const [loading, setLoading] = useState(true)
    const [step, setStep] = useState(1) // 1 = entity, 2 = profile

    useEffect(() => {
        loadEntities()
    }, [])

    const loadEntities = async () => {
        try {
            const res = await studyService.getEntities()
            setEntities(res.data)
        } catch (error) {
            // Fallback to hardcoded
            setEntities([
                { id: 1, name: 'DIAN', description: 'Dirección de Impuestos y Aduanas', icon: 'account_balance', color: '#3B82F6' },
                { id: 2, name: 'CAR', description: 'Corporación Autónoma Regional', icon: 'park', color: '#10B981' },
                { id: 3, name: 'Acueducto', description: 'Empresa de Acueducto de Bogotá', icon: 'water_drop', color: '#06B6D4' },
                { id: 4, name: 'General', description: 'Competencias Generales', icon: 'school', color: '#8B5CF6' },
            ])
        } finally {
            setLoading(false)
        }
    }

    const handleEntitySelect = (entity) => {
        setSelectedEntity(entity)
        setStep(2)
    }

    const handleProfileSelect = (profile) => {
        setSelectedProfile(profile)
        navigate('/')
    }

    const getProfiles = () => {
        if (!selectedEntity) return []
        return PROFILES[selectedEntity.name] || PROFILES.General
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
                <span className="material-symbols-outlined text-primary animate-spin text-4xl">progress_activity</span>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark p-4 sm:p-6">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center size-16 bg-primary/20 rounded-2xl mb-4">
                        <span className="material-symbols-outlined text-primary text-4xl">school</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold mb-2">
                        {step === 1 ? '¿Para qué entidad estudias?' : 'Selecciona tu cargo'}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">
                        {step === 1
                            ? 'Personaliza tu experiencia de estudio'
                            : `Cargo en ${selectedEntity?.name}`
                        }
                    </p>
                </div>

                {/* Progress */}
                <div className="flex items-center justify-center gap-2 mb-8">
                    <div className={`size-8 rounded-full flex items-center justify-center font-bold ${step >= 1 ? 'bg-primary text-background-dark' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}>
                        1
                    </div>
                    <div className={`w-16 h-1 rounded ${step >= 2 ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
                    <div className={`size-8 rounded-full flex items-center justify-center font-bold ${step >= 2 ? 'bg-primary text-background-dark' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}>
                        2
                    </div>
                </div>

                {/* Step 1: Entity Selection */}
                {step === 1 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in-up">
                        {entities.map(entity => (
                            <button
                                key={entity.id}
                                onClick={() => handleEntitySelect(entity)}
                                className={`card p-5 text-left hover:scale-[1.02] transition-all group ${selectedEntity?.id === entity.id ? 'ring-2 ring-primary' : ''
                                    }`}
                            >
                                <div className="flex items-start gap-4">
                                    <div
                                        className="p-3 rounded-xl"
                                        style={{ backgroundColor: `${entity.color}20` }}
                                    >
                                        <span
                                            className="material-symbols-outlined text-2xl"
                                            style={{ color: entity.color }}
                                        >
                                            {entity.icon}
                                        </span>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-lg mb-1 group-hover:text-primary transition-colors">
                                            {entity.name}
                                        </h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {entity.description}
                                        </p>
                                        {entity.question_count > 0 && (
                                            <p className="text-xs text-gray-400 mt-2">
                                                {entity.question_count} preguntas disponibles
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {/* Step 2: Profile Selection */}
                {step === 2 && (
                    <div className="space-y-3 animate-fade-in-up">
                        <button
                            onClick={() => setStep(1)}
                            className="flex items-center gap-2 text-gray-500 hover:text-primary mb-4"
                        >
                            <span className="material-symbols-outlined">arrow_back</span>
                            <span>Cambiar entidad</span>
                        </button>

                        {getProfiles().map(profile => (
                            <button
                                key={profile.id}
                                onClick={() => handleProfileSelect(profile)}
                                className={`w-full card p-4 text-left hover:scale-[1.01] transition-all flex items-center gap-4 ${selectedProfile?.id === profile.id ? 'ring-2 ring-primary' : ''
                                    }`}
                            >
                                <div className="bg-primary/10 p-2 rounded-lg">
                                    <span className="material-symbols-outlined text-primary">badge</span>
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold">{profile.name}</h3>
                                    <p className="text-sm text-gray-500">{profile.description}</p>
                                </div>
                                {profile.xp_bonus > 1 && (
                                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded font-medium">
                                        +{Math.round((profile.xp_bonus - 1) * 100)}% XP
                                    </span>
                                )}
                            </button>
                        ))}

                        <button
                            onClick={() => {
                                setSelectedProfile(null)
                                navigate('/')
                            }}
                            className="w-full text-center text-gray-500 hover:text-primary py-3"
                        >
                            Omitir por ahora
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
