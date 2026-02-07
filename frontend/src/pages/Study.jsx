import { useState, useEffect } from 'react'
import { studyService } from '../services/api'
import { useUserPreferences } from '../context/UserPreferencesContext'
import QuestionCard from '../components/QuestionCard'
import Timer from '../components/Timer'
import ExplanationViewer from '../components/ExplanationViewer';
import AdventureMap from '../components/AdventureMap';

const MODES = {
    SELECT: 'select',
    PLAYING: 'playing',
    RESULTS: 'results'
}

const FALLBACK_ENTITIES = [
    { id: 1, name: 'DIAN', icon: 'account_balance' },
    { id: 2, name: 'CAR', icon: 'eco' },
    { id: 3, name: 'Acueducto', icon: 'water_drop' },
    { id: 4, name: 'General', icon: 'school' }
]

const FALLBACK_PROFILES = {
    'DIAN': [
        { id: 1, name: 'Gestor I', description: 'Nivel asistencial' },
        { id: 2, name: 'Gestor II', description: 'Nivel técnico' },
        { id: 3, name: 'Profesional', description: 'Nivel profesional' }
    ],
    'CAR': [
        { id: 4, name: 'Técnico', description: 'Nivel técnico' },
        { id: 5, name: 'Profesional', description: 'Nivel profesional' }
    ],
    'Acueducto': [
        { id: 6, name: 'Operativo', description: 'Nivel operativo' },
        { id: 7, name: 'Profesional', description: 'Nivel profesional' }
    ],
    'General': [
        { id: 8, name: 'Estándar', description: 'Competencias generales' }
    ]
}

export default function Study() {
    const [mode, setMode] = useState(MODES.SELECT)
    const [studyMode, setStudyMode] = useState(null) // 'simulacro' | 'advanced' | 'ai_gen'
    const { selectedEntity, selectedProfile } = useUserPreferences()
    const [entities, setEntities] = useState([])
    const [profiles, setProfiles] = useState([])
    const [tempSelectedEntity, setTempSelectedEntity] = useState(selectedEntity?.id || null)
    const [tempSelectedProfile, setTempSelectedProfile] = useState(selectedProfile?.id || null)

    // Config State
    const [config, setConfig] = useState({
        difficulty: null, // null = mixed, 1=easy, 2=medium, 3=hard
        count: 10,
        isRealMode: false // for simulacro
    })

    const [session, setSession] = useState(null)
    const [questions, setQuestions] = useState([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [answers, setAnswers] = useState({})
    const [results, setResults] = useState(null)
    const [loading, setLoading] = useState(false)
    const [feedback, setFeedback] = useState(null)

    useEffect(() => {
        loadEntities()
    }, [])

    const loadEntities = async () => {
        try {
            const res = await studyService.getEntities()
            if (res.data && res.data.length > 0) {
                setEntities(res.data)
            } else {
                setEntities(FALLBACK_ENTITIES)
            }
        } catch (error) {
            console.warn('Failed to load entities, using fallback:', error)
            setEntities(FALLBACK_ENTITIES)
        }
    }

    // Update profiles when entity changes
    useEffect(() => {
        if (tempSelectedEntity) {
            const entity = entities.find(e => e.id === tempSelectedEntity)
            if (entity) {
                // In real app we would fetch profiles from API. For now use fallback
                setProfiles(FALLBACK_PROFILES[entity.name] || [])
            }
        } else {
            setProfiles([])
            setTempSelectedProfile(null)
        }
    }, [tempSelectedEntity, entities])

    // Update default config when real mode changes
    useEffect(() => {
        if (config.isRealMode) {
            setConfig(prev => ({ ...prev, count: 40, difficulty: null }))
        }
    }, [config.isRealMode])

    const startSession = async (topic = null) => {
        if (!studyMode) return
        setLoading(true)
        let sessionData;

        try {
            const params = {
                entity_id: tempSelectedEntity,
                profile_id: tempSelectedProfile,
                topic: topic, // Pass topic for Adventure Mode
                num_questions: config.count,
                difficulty: config.difficulty
            };

            if (studyMode === 'simulacro') {
                sessionData = await studyService.startSimulacro({
                    entity_id: params.entity_id,
                    num_questions: config.isRealMode ? 40 : params.num_questions,
                    time_limit_minutes: config.isRealMode ? 60 : Math.ceil(params.num_questions * 1.5),
                    difficulty: config.isRealMode ? null : params.difficulty
                })
            } else if (studyMode === 'advanced') {
                sessionData = await studyService.startAdvanced(params)
            } else if (studyMode === 'ai_gen') {
                const entityName = entities.find(e => e.id === tempSelectedEntity)?.name || "General"
                let profileName = null
                if (tempSelectedProfile && profiles.length > 0) {
                    profileName = profiles.find(p => p.id === tempSelectedProfile)?.name
                }

                // AI endpoint usually creates one question, but we wrap it
                const res = await studyService.generateAIQuestion(entityName, null, profileName)
                const question = { ...res.data, id: 'ai_' + Date.now() }
                setQuestions([question])
                setSession({ session_id: 'ai_session', mode: 'ai_gen' })
                setMode(MODES.PLAYING)
                setLoading(false)
                return // AI gen handles its own state updates
            }


            if (!sessionData.questions || sessionData.questions.length === 0) {
                alert('No hay preguntas disponibles para esta configuración. Intenta "Ingerir Materiales" en Admin.')
                setLoading(false)
                return
            }

            setSession(sessionData)
            setQuestions(sessionData.questions)
            setMode(MODES.PLAYING)
        } catch (error) {
            console.error('Failed to start session:', error)
        } finally {
            setLoading(false)
        }
    }



    const handleAnswer = async (questionId, option) => {
        if (studyMode === 'simulacro') {
            // Just store answer, no feedback yet
            setAnswers(prev => ({ ...prev, [questionId]: option }))

            // Auto-advance to next question
            if (currentIndex < questions.length - 1) {
                setTimeout(() => setCurrentIndex(prev => prev + 1), 300)
            }
        } else if (studyMode === 'ai_gen') {
            // AI Question mode - immediate local feedback
            const question = questions[0]
            const isCorrect = option === question.correct_answer

            setFeedback({
                is_correct: isCorrect,
                correct_answer: question.correct_answer,
                explanation: question.explanation,
                xp_earned: isCorrect ? 50 : 0
            })
            setAnswers(prev => ({ ...prev, [questionId]: option }))

        } else {
            // Advanced mode - immediate feedback from server
            setLoading(true)
            try {
                const res = await studyService.answerAdvanced(session.session_id, {
                    question_id: questionId,
                    selected_option: option
                })
                setFeedback(res.data)
                setAnswers(prev => ({ ...prev, [questionId]: option }))
            } catch (error) {
                console.error('Failed to submit answer:', error)
            } finally {
                setLoading(false)
            }
        }
    }

    const nextQuestion = () => {
        setFeedback(null)

        if (studyMode === 'ai_gen') {
            // Generate another question
            startSession()
            setAnswers({})
            return
        }

        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1)
        } else {
            // End of questions in advanced mode
            setMode(MODES.RESULTS)
            setResults({
                total_questions: questions.length,
                correct_answers: Object.values(answers).filter((_, i) => {
                    // This is simplified - in real app we'd track correct/incorrect
                    return true
                }).length,
                score: 85, // Placeholder
                xp_earned: 150
            })
        }
    }

    const submitSimulacro = async () => {
        setLoading(true)
        try {
            const formattedAnswers = Object.entries(answers).map(([qId, opt]) => ({
                question_id: parseInt(qId),
                selected_option: opt
            }))

            const res = await studyService.submitSimulacro({
                session_id: session.session_id,
                answers: formattedAnswers
            })

            setResults(res.data)
            setMode(MODES.RESULTS)
        } catch (error) {
            console.error('Failed to submit simulacro:', error)
        } finally {
            setLoading(false)
        }
    }

    const resetSession = () => {
        setMode(MODES.SELECT)
        setStudyMode(null)
        setSession(null)
        setQuestions([])
        setCurrentIndex(0)
        setAnswers({})
        setResults(null)
        setFeedback(null)
    }

    // Mode Selection Screen
    if (mode === MODES.SELECT) {
        return (
            <div className="px-4 py-6 max-w-md mx-auto min-h-[80vh] flex flex-col">
                {!studyMode ? (
                    <div className="animate-fade-in-up">
                        <h1 className="text-2xl font-bold mb-6">Modo de Estudio</h1>
                        <div className="space-y-4 mb-8">
                            <ModeCard
                                selected={false}
                                onClick={() => setStudyMode('simulacro')}
                                icon="timer"
                                title="Simulacro"
                                description="Examen cronometrado. Simula las condiciones reales de la prueba."
                                color="blue"
                            />
                            <ModeCard
                                selected={false}
                                onClick={() => setStudyMode('advanced')}
                                icon="psychology"
                                title="Estudio Avanzado"
                                description="Feedback inmediato con explicaciones detalladas y sin límite de tiempo."
                                color="green"
                            />
                            <ModeCard
                                selected={false}
                                onClick={() => setStudyMode('ai_gen')}
                                icon="smart_toy"
                                title="IA Generativa"
                                description="Preguntas infinitas y únicas generadas por IA según tu perfil."
                                color="purple"
                            />
                        </div>
                    </div>
                ) : (
                    <div className="animate-fade-in-right flex-1 flex flex-col">
                        <button
                            onClick={() => {
                                setStudyMode(null)
                                setTempSelectedEntity(null)
                                setTempSelectedProfile(null)
                            }}
                            className="mb-4 flex items-center text-sm text-gray-500 hover:text-white transition-colors self-start"
                        >
                            <span className="material-symbols-outlined mr-1 text-lg">arrow_back</span>
                            Cambiar Modo
                        </button>

                        <div className="flex items-center gap-3 mb-6">
                            <div className={`p-2 rounded-lg ${studyMode === 'simulacro' ? 'bg-blue-500/10 text-blue-500' :
                                studyMode === 'advanced' ? 'bg-green-500/10 text-green-500' :
                                    'bg-purple-500/10 text-purple-500'
                                }`}>
                                <span className="material-symbols-outlined text-xl">
                                    {studyMode === 'simulacro' ? 'timer' : studyMode === 'advanced' ? 'psychology' : 'smart_toy'}
                                </span>
                            </div>
                            <h2 className="text-xl font-bold capitalize">
                                {studyMode === 'ai_gen' ? 'IA Generativa' : studyMode === 'simulacro' ? 'Simulacro Exam' : 'Estudio Avanzado'}
                            </h2>
                        </div>

                        <div className="space-y-6">
                            {/* Entity Selection */}
                            <div className="animate-fade-in-up delay-100">
                                <label className="block text-sm font-medium text-gray-500 mb-2">1. Entidad</label>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={() => setTempSelectedEntity(null)}
                                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${tempSelectedEntity === null
                                            ? 'bg-primary text-background-dark border-primary'
                                            : 'bg-card border-gray-100 dark:border-gray-800 hover:border-gray-300'
                                            }`}
                                    >
                                        🌐 Todas
                                    </button>
                                    {entities.map(entity => (
                                        <button
                                            key={entity.id}
                                            onClick={() => setTempSelectedEntity(entity.id)}
                                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${tempSelectedEntity === entity.id
                                                ? 'bg-primary text-background-dark border-primary'
                                                : 'bg-card border-gray-100 dark:border-gray-800 hover:border-gray-300'
                                                }`}
                                        >
                                            {entity.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Profile Selection */}
                            {tempSelectedEntity && profiles.length > 0 && (
                                <div className="animate-fade-in-up delay-200">
                                    <label className="block text-sm font-medium text-gray-500 mb-2">2. Cargo / Perfil</label>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            onClick={() => setTempSelectedProfile(null)}
                                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${tempSelectedProfile === null
                                                ? 'bg-primary text-background-dark border-primary'
                                                : 'bg-card border-gray-100 dark:border-gray-800 hover:border-gray-300'
                                                }`}
                                        >
                                            General
                                        </button>
                                        {profiles.map(profile => (
                                            <button
                                                key={profile.id}
                                                onClick={() => setTempSelectedProfile(profile.id)}
                                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${tempSelectedProfile === profile.id
                                                    ? 'bg-primary text-background-dark border-primary'
                                                    : 'bg-card border-gray-100 dark:border-gray-800 hover:border-gray-300'
                                                    }`}
                                            >
                                                {profile.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Configuration or Adventure Map */}
                            {studyMode === 'advanced' && tempSelectedEntity ? (
                                <div className="card p-5 animate-fade-in-up delay-300 border border-gray-100 dark:border-gray-800">
                                    <h3 className="font-bold mb-4 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-primary">map</span>
                                        Ruta de Aventura
                                    </h3>
                                    <p className="text-sm text-gray-500 mb-4">
                                        Selecciona una lección desbloqueada para continuar tu camino.
                                    </p>
                                    <AdventureMap
                                        entityId={tempSelectedEntity}
                                        profileId={tempSelectedProfile}
                                        onStartNode={(node) => startSession(node.topic)}
                                    />
                                </div>
                            ) : studyMode !== 'ai_gen' && (
                                <div className="card p-5 animate-fade-in-up delay-300 border border-gray-100 dark:border-gray-800">
                                    <h3 className="font-bold mb-4 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-primary">tune</span>
                                        Configuración
                                    </h3>

                                    {/* Real Mode Toggle (Simulacro Only) */}
                                    {studyMode === 'simulacro' && (
                                        <div className="flex items-center justify-between mb-6 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                            <div>
                                                <span className="font-bold block">Modo Realista</span>
                                                <span className="text-xs text-gray-500">40 preguntas, 60 mins, dificultad variada</span>
                                            </div>
                                            <button
                                                onClick={() => setConfig(prev => ({ ...prev, isRealMode: !prev.isRealMode }))}
                                                className={`w-12 h-6 rounded-full transition-colors relative ${config.isRealMode ? 'bg-primary' : 'bg-gray-300'}`}
                                            >
                                                <span className={`absolute top-1 size-4 bg-white rounded-full transition-transform ${config.isRealMode ? 'left-7' : 'left-1'}`} />
                                            </button>
                                        </div>
                                    )}

                                    {/* Question Count */}
                                    <div className={`mb-4 transition-opacity ${config.isRealMode ? 'opacity-50 pointer-events-none' : ''}`}>
                                        <div className="flex justify-between mb-2">
                                            <label className="text-sm font-medium">Cantidad de Preguntas</label>
                                            <span className="text-sm font-bold text-primary">{config.count}</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-xs text-gray-500">5</span>
                                            <input
                                                type="range"
                                                min="5"
                                                max={studyMode === 'simulacro' ? "100" : "50"}
                                                step="5"
                                                value={config.count}
                                                onChange={(e) => setConfig(prev => ({ ...prev, count: parseInt(e.target.value) }))}
                                                className="flex-1 accent-primary h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                            />
                                            <span className="text-xs text-gray-500">{studyMode === 'simulacro' ? "100" : "50"}</span>
                                        </div>
                                    </div>

                                    {/* Difficulty */}
                                    <div className={`transition-opacity ${config.isRealMode ? 'opacity-50 pointer-events-none' : ''}`}>
                                        <label className="block text-sm font-medium mb-2">Dificultad</label>
                                        <div className="grid grid-cols-4 gap-2">
                                            {[
                                                { val: null, label: 'Mixta' },
                                                { val: 1, label: 'Básica' },
                                                { val: 2, label: 'Media' },
                                                { val: 3, label: 'Alta' }
                                            ].map(opt => (
                                                <button
                                                    key={opt.label}
                                                    onClick={() => setConfig(prev => ({ ...prev, difficulty: opt.val }))}
                                                    className={`py-2 text-xs rounded-lg border transition-colors ${config.difficulty === opt.val
                                                        ? 'bg-primary text-background-dark border-primary font-bold'
                                                        : 'bg-transparent border-gray-200 dark:border-gray-700 hover:border-gray-300'
                                                        }`}
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Start Button */}
                            {(studyMode !== 'advanced' || !tempSelectedEntity) && (
                                <button
                                    onClick={() => startSession()}
                                    disabled={loading}
                                    className="w-full btn-primary py-4 text-lg shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:scale-100 animate-fade-in-up delay-300 mt-6"
                                >
                                    {loading ? (
                                        <span className="material-symbols-outlined animate-spin">progress_activity</span>
                                    ) : (
                                        <>
                                            <span>Comenzar Examen</span>
                                            <span className="material-symbols-outlined">play_circle</span>
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        )
    }


    // Playing Screen
    if (mode === MODES.PLAYING && questions.length > 0) {
        const currentQuestion = questions[currentIndex]
        const isAnswered = answers[currentQuestion.id] !== undefined

        return (
            <div className="px-4 py-6 max-w-md mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <button onClick={resetSession} className="text-gray-400 hover:text-white">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                    <div className="text-center">
                        <span className="text-sm text-gray-400">Pregunta</span>
                        <span className="block font-bold">{currentIndex + 1} / {questions.length}</span>
                    </div>
                    {studyMode === 'simulacro' && session.time_limit_minutes && (
                        <Timer minutes={session.time_limit_minutes} onExpire={submitSimulacro} />
                    )}
                    {studyMode === 'advanced' && <div className="w-10"></div>}
                </div>

                {/* Progress Bar */}
                <div className="h-1 bg-gray-200 dark:bg-gray-800 rounded-full mb-6 overflow-hidden">
                    <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                    />
                </div>

                {/* Question */}
                <QuestionCard
                    question={currentQuestion}
                    selectedOption={answers[currentQuestion.id]}
                    onSelect={(option) => handleAnswer(currentQuestion.id, option)}
                    feedback={feedback}
                    disabled={loading || ((studyMode === 'advanced' || studyMode === 'ai_gen') && isAnswered)}
                />

                {/* Feedback for Advanced & AI Mode */}
                {(studyMode === 'advanced' || studyMode === 'ai_gen') && feedback && (
                    <div className={`mt-4 p-4 rounded-xl ${feedback.is_correct ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                        <div className="flex items-center gap-2 mb-2">
                            <span className={`material-symbols-outlined ${feedback.is_correct ? 'text-green-500' : 'text-red-500'}`}>
                                {feedback.is_correct ? 'check_circle' : 'cancel'}
                            </span>
                            <span className={`font-bold ${feedback.is_correct ? 'text-green-500' : 'text-red-500'}`}>
                                {feedback.is_correct ? '¡Correcto!' : 'Incorrecto'}
                            </span>
                            <span className="ml-auto text-primary font-bold">+{feedback.xp_earned} XP</span>
                        </div>
                        {feedback.explanation && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">{feedback.explanation}</p>
                        )}
                        {feedback.page_reference && (
                            <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">menu_book</span>
                                Referencia: {feedback.page_reference}
                            </p>
                        )}
                        <button onClick={nextQuestion} className="w-full btn-primary mt-4">
                            <span>
                                {studyMode === 'ai_gen'
                                    ? 'Generar Nueva Pregunta'
                                    : (currentIndex < questions.length - 1 ? 'Siguiente' : 'Ver Resultados')
                                }
                            </span>
                            <span className="material-symbols-outlined">
                                {studyMode === 'ai_gen' ? 'autorenew' : 'arrow_forward'}
                            </span>
                        </button>
                    </div>
                )}

                {/* Navigation for Simulacro */}
                {studyMode === 'simulacro' && (
                    <div className="mt-6 flex gap-3">
                        <button
                            onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                            disabled={currentIndex === 0}
                            className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 font-medium disabled:opacity-30"
                        >
                            Anterior
                        </button>
                        {currentIndex < questions.length - 1 ? (
                            <button
                                onClick={() => setCurrentIndex(prev => prev + 1)}
                                className="flex-1 py-3 rounded-xl bg-primary text-background-dark font-medium"
                            >
                                Siguiente
                            </button>
                        ) : (
                            <button
                                onClick={submitSimulacro}
                                disabled={loading}
                                className="flex-1 py-3 rounded-xl bg-primary text-background-dark font-medium"
                            >
                                {loading ? 'Enviando...' : 'Enviar Examen'}
                            </button>
                        )}
                    </div>
                )}
            </div>
        )
    }

    // Results Screen
    if (mode === MODES.RESULTS && results) {
        const passed = results.score >= 60

        return (
            <div className="px-4 py-6 max-w-md mx-auto text-center">
                <div className={`inline-flex items-center justify-center size-20 rounded-full mb-4 ${passed ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                    <span className={`material-symbols-outlined text-4xl ${passed ? 'text-green-500' : 'text-red-500'}`}>
                        {passed ? 'emoji_events' : 'sentiment_dissatisfied'}
                    </span>
                </div>

                <h1 className="text-2xl font-bold mb-2">
                    {passed ? '¡Felicitaciones!' : 'Sigue Practicando'}
                </h1>
                <p className="text-gray-500 mb-8">
                    {passed ? 'Has completado el examen exitosamente' : 'La práctica hace al maestro'}
                </p>

                {/* Score Card */}
                <div className="card p-6 mb-6">
                    <div className="text-5xl font-bold text-primary mb-2">{Math.round(results.score)}%</div>
                    <p className="text-gray-500">Porcentaje de aciertos</p>

                    <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                        <div>
                            <p className="text-2xl font-bold">{results.correct_answers}</p>
                            <p className="text-xs text-gray-500">Correctas</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{results.total_questions - results.correct_answers}</p>
                            <p className="text-xs text-gray-500">Incorrectas</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-primary">+{results.xp_earned}</p>
                            <p className="text-xs text-gray-500">XP</p>
                        </div>
                    </div>
                </div>

                {/* Review Answers (Simulacro only) */}
                {studyMode === 'simulacro' && results.results && (
                    <div className="card p-4 mb-6 text-left max-h-60 overflow-y-auto">
                        <h3 className="font-bold mb-3">Revisión de Respuestas</h3>
                        {results.results.map((r, i) => (
                            <div key={i} className={`flex items-start gap-3 py-2 border-b border-gray-100 dark:border-gray-800 last:border-0 ${r.is_correct ? 'text-green-600' : 'text-red-500'}`}>
                                <span className="material-symbols-outlined text-lg mt-0.5">
                                    {r.is_correct ? 'check_circle' : 'cancel'}
                                </span>
                                <div className="flex-1 text-sm">
                                    <p className="text-gray-700 dark:text-gray-300">Pregunta {i + 1}</p>
                                    <p className="text-xs text-gray-500">
                                        Tu respuesta: {r.selected} | Correcta: {r.correct_answer}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <button onClick={resetSession} className="w-full btn-primary">
                    <span>Volver a Empezar</span>
                    <span className="material-symbols-outlined">refresh</span>
                </button>
            </div>
        )
    }

    // Loading state
    return (
        <div className="flex items-center justify-center min-h-[50vh]">
            <span className="material-symbols-outlined text-primary animate-spin text-4xl">progress_activity</span>
        </div>
    )
}

function ModeCard({ selected, onClick, icon, title, description, color }) {
    const colorClasses = {
        blue: 'bg-blue-500/10 text-blue-500 border-blue-500',
        green: 'bg-green-500/10 text-green-500 border-green-500',
        purple: 'bg-purple-500/10 text-purple-500 border-purple-500'
    }

    return (
        <button
            onClick={onClick}
            className={`w-full card p-5 text-left transition-all ${selected ? `border-2 ${colorClasses[color].split(' ')[2]}` : ''
                }`}
        >
            <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${colorClasses[color].split(' ').slice(0, 2).join(' ')}`}>
                    <span className="material-symbols-outlined text-2xl">{icon}</span>
                </div>
                <div className="flex-1">
                    <h3 className="font-bold mb-1">{title}</h3>
                    <p className="text-sm text-gray-500">{description}</p>
                </div>
                {selected && (
                    <span className={`material-symbols-outlined ${colorClasses[color].split(' ')[1]}`}>check_circle</span>
                )}
            </div>
        </button>
    )
}
