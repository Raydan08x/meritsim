
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { studyService } from '../services/api';

const AdventureMap = ({ entityId, profileId, onStartNode }) => {
    const [nodes, setNodes] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMap = async () => {
            try {
                const data = await studyService.getAdventureMap(entityId, profileId);
                setNodes(data.nodes || []);
            } catch (error) {
                console.error("Error fetching map:", error);
            } finally {
                setLoading(false);
            }
        };
        if (entityId) fetchMap();
    }, [entityId, profileId]);

    if (loading) return <div className="text-center p-10 text-gray-400">Cargando mapa de aventura...</div>;

    if (nodes.length === 0) {
        return (
            <div className="text-center p-10">
                <p className="text-gray-400 mb-4">No hay lecciones disponibles para esta ruta aún.</p>
                <p className="text-xs text-gray-500">Intenta "Ingerir Materiales" en Admin.</p>
            </div>
        );
    }

    return (
        <div className="relative w-full max-w-2xl mx-auto py-10 px-4 min-h-[400px]">
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                <svg className="w-full h-full visible">
                    {/* Draw paths between nodes */}
                    {nodes.map((node, i) => {
                        if (i === nodes.length - 1) return null;
                        const next = nodes[i + 1];
                        return (
                            <line
                                key={`line-${i}`}
                                x1={`${node.x}%`}
                                y1={`${node.y}%`}
                                x2={`${next.x}%`}
                                y2={`${next.y}%`}
                                stroke={node.status === 'completed' ? '#10B981' : '#475569'}
                                strokeWidth="4"
                                strokeDasharray="8"
                                className="animate-pulse-soft"
                            />
                        );
                    })}
                </svg>
            </div>

            {nodes.map((node, i) => (
                <motion.div
                    key={node.id}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${node.x}%`, top: `${node.y}%` }}
                >
                    <button
                        onClick={() => node.status !== 'locked' && onStartNode(node)}
                        disabled={node.status === 'locked'}
                        className={`
              relative w-16 h-16 rounded-full flex items-center justify-center border-4 shadow-lg transition-all
              ${node.status === 'completed'
                                ? 'bg-green-500 border-green-300 scale-110'
                                : node.status === 'available'
                                    ? 'bg-blue-600 border-blue-400 hover:scale-110 hover:shadow-blue-500/50 animate-bounce-slow'
                                    : 'bg-slate-700 border-slate-600 opacity-60 cursor-not-allowed'}
            `}
                    >
                        {node.status === 'completed' ? (
                            <span className="material-symbols-outlined text-white text-3xl">check</span>
                        ) : node.status === 'locked' ? (
                            <span className="material-symbols-outlined text-gray-400 text-2xl">lock</span>
                        ) : (
                            <span className="material-symbols-outlined text-white text-3xl">play_arrow</span>
                        )}

                        {/* Circular Progress (if partially done) */}
                        {node.status === 'available' && node.progress > 0 && (
                            <svg className="absolute w-full h-full -rotate-90 pointer-events-none">
                                <circle
                                    cx="50%" cy="50%" r="28"
                                    stroke="white" strokeWidth="3"
                                    fill="none"
                                    className="opacity-20"
                                />
                                <circle
                                    cx="50%" cy="50%" r="28"
                                    stroke="white" strokeWidth="3"
                                    fill="none"
                                    strokeDasharray="175" // 2*pi*r approx
                                    strokeDashoffset={175 - (175 * node.progress) / 100}
                                    strokeLinecap="round"
                                />
                            </svg>
                        )}
                    </button>

                    {/* Label Tooltip */}
                    <div className={`
             absolute top-full left-1/2 -translate-x-1/2 mt-2 w-32 text-center
             bg-slate-800 text-white text-xs rounded py-1 px-2 z-10 shadow-lg
             ${node.status === 'locked' ? 'text-gray-500' : 'font-bold'}
          `}>
                        <div className="truncate">{node.label}</div>
                        {node.status !== 'locked' && (
                            <div className="text-[10px] text-gray-400">{node.completed_questions}/{node.total_questions}</div>
                        )}
                    </div>
                </motion.div>
            ))}
        </div>
    );
};

export default AdventureMap;
