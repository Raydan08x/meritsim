import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { UserPreferencesProvider } from './context/UserPreferencesContext.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <BrowserRouter>
            <ThemeProvider>
                <UserPreferencesProvider>
                    <AuthProvider>
                        <App />
                    </AuthProvider>
                </UserPreferencesProvider>
            </ThemeProvider>
        </BrowserRouter>
    </React.StrictMode>,
)

