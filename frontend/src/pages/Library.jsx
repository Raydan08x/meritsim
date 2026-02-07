import { useState, useEffect } from 'react'
import { materialService, studyService } from '../services/api'

export default function Library() {
    const [entities, setEntities] = useState([])
    const [selectedEntity, setSelectedEntity] = useState(null)
    const [materials, setMaterials] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadEntities()
    }, [])

    useEffect(() => {
        loadMaterials()
    }, [selectedEntity])

    const loadEntities = async () => {
        try {
            const res = await studyService.getEntities()
            setEntities(res.data)
        } catch (error) {
            console.error('Failed to load entities:', error)
        }
    }

    const loadMaterials = async () => {
        setLoading(true)
        try {
            const res = await materialService.getAll(selectedEntity)
            setMaterials(res.data)
        } catch (error) {
            console.error('Failed to load materials:', error)
        } finally {
            setLoading(false)
        }
    }

    const formatFileSize = (bytes) => {
        if (!bytes) return ''
        const kb = bytes / 1024
        if (kb < 1024) return `${Math.round(kb)} KB`
        return `${(kb / 1024).toFixed(1)} MB`
    }

    return (
        <div className="px-4 py-6 max-w-md mx-auto">
            <h1 className="text-2xl font-bold mb-2">Biblioteca</h1>
            <p className="text-gray-500 text-sm mb-6">Material de estudio indexado</p>

            {/* Entity Filter */}
            <div className="flex gap-2 overflow-x-auto hide-scrollbar mb-6 -mx-4 px-4">
                <button
                    onClick={() => setSelectedEntity(null)}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${selectedEntity === null
                            ? 'bg-primary text-background-dark'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                        }`}
                >
                    Todos
                </button>
                {entities.map(entity => (
                    <button
                        key={entity.id}
                        onClick={() => setSelectedEntity(entity.id)}
                        className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${selectedEntity === entity.id
                                ? 'bg-primary text-background-dark'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                            }`}
                    >
                        {entity.name}
                    </button>
                ))}
            </div>

            {/* Materials List */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <span className="material-symbols-outlined text-primary animate-spin text-4xl">progress_activity</span>
                </div>
            ) : materials.length === 0 ? (
                <div className="card p-8 text-center">
                    <span className="material-symbols-outlined text-5xl text-gray-400 mb-4">folder_open</span>
                    <h3 className="font-bold mb-2">Sin materiales</h3>
                    <p className="text-gray-500 text-sm">
                        No hay materiales indexados para esta entidad. Los PDFs se indexan automáticamente desde la carpeta de estudio.
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {materials.map(material => (
                        <div key={material.id} className="card p-4 flex items-start gap-4">
                            <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg text-red-500 shrink-0">
                                <span className="material-symbols-outlined text-2xl">picture_as_pdf</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold truncate">{material.title || material.filename}</h3>
                                <div className="flex flex-wrap gap-2 mt-1">
                                    {material.entity && (
                                        <span className="text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-500">
                                            {material.entity}
                                        </span>
                                    )}
                                    {material.profile && (
                                        <span className="text-xs px-2 py-0.5 rounded bg-purple-500/10 text-purple-500">
                                            {material.profile}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                    {formatFileSize(material.file_size)}
                                </p>
                            </div>
                            <button className="p-2 text-gray-400 hover:text-primary transition-colors">
                                <span className="material-symbols-outlined">open_in_new</span>
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Stats */}
            <div className="mt-8 card p-4 flex items-center justify-between">
                <div>
                    <span className="text-2xl font-bold">{materials.length}</span>
                    <span className="text-gray-500 text-sm ml-2">documentos</span>
                </div>
                <span className="material-symbols-outlined text-3xl text-gray-400">library_books</span>
            </div>
        </div>
    )
}
