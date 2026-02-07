import { createContext, useContext, useState, useEffect } from 'react'

const UserPreferencesContext = createContext()

export function UserPreferencesProvider({ children }) {
    const [selectedEntity, setSelectedEntity] = useState(() => {
        const saved = localStorage.getItem('selectedEntity')
        return saved ? JSON.parse(saved) : null
    })

    const [selectedProfile, setSelectedProfile] = useState(() => {
        const saved = localStorage.getItem('selectedProfile')
        return saved ? JSON.parse(saved) : null
    })

    useEffect(() => {
        if (selectedEntity) {
            localStorage.setItem('selectedEntity', JSON.stringify(selectedEntity))
        } else {
            localStorage.removeItem('selectedEntity')
        }
    }, [selectedEntity])

    useEffect(() => {
        if (selectedProfile) {
            localStorage.setItem('selectedProfile', JSON.stringify(selectedProfile))
        } else {
            localStorage.removeItem('selectedProfile')
        }
    }, [selectedProfile])

    const clearPreferences = () => {
        setSelectedEntity(null)
        setSelectedProfile(null)
        localStorage.removeItem('selectedEntity')
        localStorage.removeItem('selectedProfile')
    }

    return (
        <UserPreferencesContext.Provider value={{
            selectedEntity,
            setSelectedEntity,
            selectedProfile,
            setSelectedProfile,
            clearPreferences
        }}>
            {children}
        </UserPreferencesContext.Provider>
    )
}

export function useUserPreferences() {
    const context = useContext(UserPreferencesContext)
    if (!context) {
        throw new Error('useUserPreferences must be used within UserPreferencesProvider')
    }
    return context
}
