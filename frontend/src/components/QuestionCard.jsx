export default function QuestionCard({ question, selectedOption, onSelect, feedback, disabled }) {
    const options = [
        { key: 'A', text: question.option_a },
        { key: 'B', text: question.option_b },
        { key: 'C', text: question.option_c },
        { key: 'D', text: question.option_d },
    ]

    const getOptionClass = (key) => {
        const isSelected = selectedOption === key
        const isCorrect = feedback?.correct_answer === key
        const isWrong = feedback && isSelected && !feedback.is_correct

        if (isWrong) {
            return 'border-red-500 bg-red-500/10'
        }
        if (feedback && isCorrect) {
            return 'border-green-500 bg-green-500/10'
        }
        if (isSelected) {
            return 'border-primary bg-primary/10'
        }
        return 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
    }

    return (
        <div className="card p-5">
            {/* Entity & Topic Tags */}
            <div className="flex flex-wrap gap-2 mb-4">
                {question.entity && (
                    <span className="text-xs font-medium px-2 py-1 rounded bg-blue-500/10 text-blue-500">
                        {question.entity}
                    </span>
                )}
                {question.topic && (
                    <span className="text-xs font-medium px-2 py-1 rounded bg-purple-500/10 text-purple-500">
                        {question.topic}
                    </span>
                )}
                {question.difficulty && (
                    <span className="text-xs font-medium px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-500">
                        {'★'.repeat(question.difficulty)}{'☆'.repeat(5 - question.difficulty)}
                    </span>
                )}
            </div>

            {/* Question Text */}
            <h2 className="text-lg font-medium mb-6 leading-relaxed">{question.text}</h2>

            {/* Options */}
            <div className="space-y-3">
                {options.map(option => (
                    <button
                        key={option.key}
                        onClick={() => !disabled && onSelect(option.key)}
                        disabled={disabled}
                        className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-start gap-3 ${getOptionClass(option.key)} ${disabled ? 'cursor-default' : 'cursor-pointer'}`}
                    >
                        <span className={`size-7 rounded-full border-2 flex items-center justify-center shrink-0 font-bold text-sm ${selectedOption === option.key
                                ? 'bg-primary border-primary text-background-dark'
                                : 'border-gray-300 dark:border-gray-600'
                            }`}>
                            {option.key}
                        </span>
                        <span className="flex-1 pt-0.5">{option.text}</span>
                        {feedback?.correct_answer === option.key && (
                            <span className="material-symbols-outlined text-green-500 shrink-0">check_circle</span>
                        )}
                        {feedback && selectedOption === option.key && !feedback.is_correct && (
                            <span className="material-symbols-outlined text-red-500 shrink-0">cancel</span>
                        )}
                    </button>
                ))}
            </div>
        </div>
    )
}
