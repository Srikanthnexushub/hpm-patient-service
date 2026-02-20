export default function ErrorAlert({ message, onRetry }) {
  return (
    <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
      <span className="text-red-500 text-lg mt-0.5">⚠️</span>
      <div className="flex-1">
        <p className="text-sm font-medium text-red-800">Error</p>
        <p className="text-sm text-red-700 mt-0.5">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-xs text-red-600 underline hover:text-red-800 whitespace-nowrap"
        >
          Try again
        </button>
      )}
    </div>
  )
}
