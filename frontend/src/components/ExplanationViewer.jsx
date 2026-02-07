
import React from 'react';

const ExplanationViewer = ({ explanation, isCorrect, pageReference }) => {
    if (!explanation) return null;

    return (
        <div className={`mt-4 p-4 rounded-xl border ${isCorrect ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
            <div className="flex items-center gap-2 mb-2">
                <span className={`material-symbols-outlined ${isCorrect ? 'text-green-500' : 'text-red-500'}`}>
                    {isCorrect ? 'check_circle' : 'cancel'}
                </span>
                <span className={`font-bold ${isCorrect ? 'text-green-500' : 'text-red-500'}`}>
                    {isCorrect ? '¡Correcto!' : 'Incorrecto'}
                </span>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
                {explanation}
            </p>
            {pageReference && (
                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">menu_book</span>
                    Referencia: {pageReference}
                </p>
            )}
        </div>
    );
};

export default ExplanationViewer;
