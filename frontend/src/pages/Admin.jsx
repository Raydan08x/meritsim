
import React, { useState } from 'react'
import api from '../services/api'

export default function Admin() {
    const [loading, setLoading] = useState(false)

    const handleIngest = async () => {
        if (!confirm('¿Estás seguro de iniciar la ingestión de materiales? Esto puede tomar varios minutos.')) return

        setLoading(true)
        try {
            await api.post('/admin/ingest-materials')
            alert('✅ Ingestión iniciada correctamente en segundo plano. Los materiales aparecerán pronto.')
        } catch (error) {
            console.error(error)
            alert('❌ Error al iniciar ingestión: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="px-4 py-8">
            <h1 className="text-3xl font-bold mb-8">Panel de Administración</h1>

            <div className="card p-6 border border-gray-100 dark:border-gray-800">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">library_books</span>
                    Gestión de Materiales
                </h2>
                <p className="text-gray-500 mb-6">
                    Escanea la carpeta "MATERIAL DE ESTUDIO 2026", indexa los PDFs y genera preguntas automáticamente usando OpenAI.
                </p>

                <button
                    onClick={handleIngest}
                    disabled={loading}
                    className="btn-primary w-full md:w-auto"
                >
                    {loading ? (
                        <>
                            <span className="material-symbols-outlined animate-spin">refresh</span>
                            Procesando...
                        </>
                    ) : (
                        <>
                            <span className="material-symbols-outlined">cloud_sync</span>
                            Ingerir Materiales y Generar Preguntas
                        </>
                    )}
                </button>
            </div>
        </div>
    )
}
