import { Outlet, NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useUserPreferences } from '../context/UserPreferencesContext'

export default function Layout() {
    const { user } = useAuth()
    const { theme, toggleTheme } = useTheme()
    const { selectedEntity } = useUserPreferences()

    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col transition-colors duration-300">
            {/* Top App Bar */}
            <header className="sticky top-0 z-50 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-sm border-b border-gray-200 dark:border-white/10 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="bg-primary/20 rounded-full size-10 flex items-center justify-center border-2 border-primary">
                            <span className="text-primary font-bold">
                                {user?.full_name?.[0] || user?.email?.[0] || 'U'}
                            </span>
                        </div>
                        <div className="absolute bottom-0 right-0 size-3 bg-primary rounded-full border-2 border-background-light dark:border-background-dark"></div>
                    </div>
                    <div>
                        <h2 className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-none">Bienvenido</h2>
                        <h1 className="text-lg font-bold leading-tight">{user?.full_name || 'Usuario'}</h1>
                    </div>
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                    {/* Entity Badge */}
                    {selectedEntity && (
                        <div className="hidden sm:flex items-center gap-1 bg-blue-500/10 px-2 py-1 rounded text-blue-500 text-xs font-medium">
                            <span className="material-symbols-outlined text-sm">{selectedEntity.icon || 'business'}</span>
                            <span className="max-w-20 truncate">{selectedEntity.name}</span>
                        </div>
                    )}
                    {/* Level Badge */}
                    <div className="flex items-center gap-1 bg-primary/10 px-2 py-1 rounded text-primary text-sm font-bold">
                        <span className="material-symbols-outlined text-base">military_tech</span>
                        <span>Nvl {user?.level || 1}</span>
                    </div>
                    {/* Theme Toggle */}
                    <button
                        onClick={toggleTheme}
                        className="p-2 text-gray-500 dark:text-gray-400 hover:text-primary transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-white/5"
                        aria-label="Toggle theme"
                    >
                        <span className="material-symbols-outlined text-xl">
                            {theme === 'dark' ? 'light_mode' : 'dark_mode'}
                        </span>
                    </button>
                    {/* Notifications */}
                    <button className="relative p-2 text-gray-500 dark:text-gray-400 hover:text-primary transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-white/5">
                        <span className="material-symbols-outlined text-xl">notifications</span>
                    </button>
                </div>
            </header>

            {/* Main Content - Responsive padding */}
            <main className="flex-1 pb-24 lg:pb-8 lg:pl-64">
                <div className="max-w-4xl mx-auto">
                    <Outlet />
                </div>
            </main>

            {/* Bottom Navigation - Mobile */}
            <nav className="fixed bottom-0 w-full bg-white dark:bg-card-dark border-t border-gray-200 dark:border-white/5 px-6 py-3 pb-6 safe-area-bottom z-40 lg:hidden">
                <ul className="flex justify-between items-center max-w-md mx-auto">
                    <NavItem to="/" icon="dashboard" label="Inicio" />
                    <NavItem to="/study" icon="quiz" label="Exámenes" />
                    <NavItem to="/library" icon="library_books" label="Biblioteca" />
                    <NavItem to="/profile" icon="person" label="Perfil" />
                </ul>
            </nav>

            {/* Side Navigation - Desktop */}
            <nav className="hidden lg:flex fixed left-0 top-0 h-full w-64 bg-white dark:bg-card-dark border-r border-gray-200 dark:border-white/5 flex-col pt-20 px-4 z-30">
                <div className="mb-8 px-3">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/20 rounded-xl p-2">
                            <span className="material-symbols-outlined text-primary text-2xl">school</span>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold">MeritSim</h1>
                            <p className="text-xs text-gray-500">Exámenes de Estado</p>
                        </div>
                    </div>
                </div>
                <ul className="space-y-1">
                    <SideNavItem to="/" icon="dashboard" label="Dashboard" />
                    <SideNavItem to="/study" icon="quiz" label="Exámenes" />
                    <SideNavItem to="/library" icon="library_books" label="Biblioteca" />
                    <SideNavItem to="/profile" icon="person" label="Mi Perfil" />
                </ul>
                <div className="mt-auto pb-6">
                    <div className="bg-gradient-to-r from-primary/20 to-green-400/20 rounded-xl p-4">
                        <h3 className="font-bold text-sm mb-1">🎯 Tip del día</h3>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Estudia 20 minutos diarios para mejores resultados</p>
                    </div>
                </div>
            </nav>

            {/* Background decorations */}
            <div className="fixed top-20 left-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>
            <div className="fixed bottom-40 right-0 w-40 h-40 bg-blue-500/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>
        </div>
    )
}

function NavItem({ to, icon, label }) {
    return (
        <li>
            <NavLink
                to={to}
                className={({ isActive }) =>
                    `flex flex-col items-center gap-1 group transition-colors ${isActive ? 'text-primary' : 'text-gray-400 hover:text-primary'
                    }`
                }
            >
                {({ isActive }) => (
                    <>
                        <div className="p-1 rounded-full group-hover:bg-primary/10 transition-colors">
                            <span className={`material-symbols-outlined ${isActive ? 'fill-1' : ''}`}>
                                {icon}
                            </span>
                        </div>
                        <span className="text-[10px] font-medium">{label}</span>
                    </>
                )}
            </NavLink>
        </li>
    )
}

function SideNavItem({ to, icon, label }) {
    return (
        <li>
            <NavLink
                to={to}
                className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all ${isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
                    }`
                }
            >
                {({ isActive }) => (
                    <>
                        <span className={`material-symbols-outlined text-xl ${isActive ? 'fill-1' : ''}`}>
                            {icon}
                        </span>
                        <span>{label}</span>
                    </>
                )}
            </NavLink>
        </li>
    )
}
