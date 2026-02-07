import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
    const [isLogin, setIsLogin] = useState(true)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [fullName, setFullName] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    const { login, register } = useAuth()
    const navigate = useNavigate()

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const result = isLogin
                ? await login(email, password)
                : await register(email, password, fullName)

            if (result.success) {
                navigate('/')
            } else {
                setError(result.error)
            }
        } catch (err) {
            setError('Ocurrió un error inesperado')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-background-dark flex flex-col items-center justify-center p-6">
            {/* Background effects */}
            <div className="fixed top-20 left-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -z-10"></div>
            <div className="fixed bottom-20 right-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl -z-10"></div>

            {/* Logo */}
            <div className="mb-8 text-center">
                <div className="inline-flex items-center justify-center size-16 bg-primary/20 rounded-2xl mb-4">
                    <span className="material-symbols-outlined text-primary text-4xl">school</span>
                </div>
                <h1 className="text-3xl font-bold text-white">MeritSim</h1>
                <p className="text-gray-400 text-sm mt-1">Prepara tu examen de estado</p>
            </div>

            {/* Card */}
            <div className="w-full max-w-sm bg-card-dark rounded-2xl p-6 shadow-xl border border-white/5">
                <h2 className="text-xl font-bold text-white mb-6 text-center">
                    {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
                </h2>

                {error && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {!isLogin && (
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">
                                Nombre completo
                            </label>
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="w-full px-4 py-3 bg-background-dark border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-primary focus:outline-none"
                                placeholder="Tu nombre"
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                            Correo electrónico
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 bg-background-dark border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-primary focus:outline-none"
                            placeholder="tu@email.com"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                            Contraseña
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 pr-12 bg-background-dark border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-primary focus:outline-none"
                                placeholder="••••••••"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                            >
                                <span className="material-symbols-outlined">
                                    {showPassword ? 'visibility_off' : 'visibility'}
                                </span>
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-primary text-background-dark font-bold rounded-lg hover:bg-primary-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <span className="material-symbols-outlined animate-spin">progress_activity</span>
                        ) : (
                            <>
                                <span>{isLogin ? 'Entrar' : 'Registrarse'}</span>
                                <span className="material-symbols-outlined">arrow_forward</span>
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-primary text-sm hover:underline"
                    >
                        {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
                    </button>
                </div>
            </div>

            {/* Footer */}
            <p className="mt-8 text-gray-500 text-xs text-center">
                DIAN • CAR • Acueducto
            </p>
        </div>
    )
}
