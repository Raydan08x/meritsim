import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Study from './pages/Study'
import Library from './pages/Library'
import Profile from './pages/Profile'
import Admin from './pages/Admin'
import EntitySelection from './pages/EntitySelection'
import Layout from './components/Layout'

function PrivateRoute({ children }) {
    const { user, loading } = useAuth()

    // TEMPORARY: Skip auth check for testing
    const SKIP_AUTH = true
    if (SKIP_AUTH) {
        return children
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background-dark">
                <div className="animate-pulse-soft text-primary">
                    <span className="material-symbols-outlined text-5xl">school</span>
                </div>
            </div>
        )
    }

    return user ? children : <Navigate to="/login" />
}

function App() {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/setup" element={<EntitySelection />} />
            <Route path="/" element={
                <PrivateRoute>
                    <Layout />
                </PrivateRoute>
            }>
                <Route index element={<Dashboard />} />
                <Route path="study" element={<Study />} />
                <Route path="library" element={<Library />} />
                <Route path="profile" element={<Profile />} />
                <Route path="admin" element={<Admin />} />
            </Route>
        </Routes>
    )
}

export default App

