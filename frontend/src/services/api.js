import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || ''

const api = axios.create({
    baseURL: `${API_URL}/api`,
    headers: {
        'Content-Type': 'application/json'
    }
})

// Add auth token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token')
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

// Handle 401 errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token')
            window.location.href = '/login'
        }
        return Promise.reject(error)
    }
)

export default api

// API service functions
export const authService = {
    login: (email, password) => api.post('/auth/login-json', { email, password }),
    register: (data) => api.post('/auth/register', data),
    getMe: () => api.get('/auth/me')
}

export const studyService = {
    // Entities & Topics
    getEntities: () => api.get('/entities'),
    getTopics: () => api.get('/topics'),

    // Questions
    getQuestions: (params) => api.get('/questions', { params }),

    // Simulacro Mode
    startSimulacro: (data) => api.post('/study/simulacro/start', data),
    submitSimulacro: (data) => api.post('/study/simulacro/submit', data),

    // Advanced Study Mode
    startAdvanced: async ({ entityId, profileId, topic, numQuestions, difficulty }) => {
        const payload = {
            entity_id: entityId,
            profile_id: profileId,
            topic: topic,
            num_questions: numQuestions,
            difficulty: difficulty
        };
        const response = await api.post('/study/advanced/start', payload);
        return response.data;
    },
    answerAdvanced: (sessionId, data) => api.post(`/study/advanced/answer?session_id=${sessionId}`, data),

    // Adventure Map
    getAdventureMap: async (entityId, profileId) => {
        const params = new URLSearchParams();
        if (entityId) params.append('entity_id', entityId);
        if (profileId) params.append('profile_id', profileId);
        const response = await api.get(`/study/adventure/map?${params}`);
        return response.data;
    },

    // Progress
    getProgress: () => api.get('/users/me/progress'),

    // AI Features
    // AI Features
    generateAIQuestion: (entity, topic, profile) => api.post('/study/ai-question-generate', null, { params: { entity, topic, profile } })
}

export const materialService = {
    getAll: (entityId) => api.get('/materials', { params: { entity_id: entityId } }),
    getSuggestions: () => api.get('/materials/suggestions'),
    reindex: () => api.post('/materials/index')
}

export const adminService = {
    getStats: () => api.get('/admin/stats')
}
