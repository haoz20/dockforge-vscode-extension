interface Props {
  warnings: string[];
  suggestions: string[];
}

export default function ValidationPanel({ warnings, suggestions }: Props) {
  return (
    <div className="mt-4 p-4 bg-[#1e1e1e] text-white rounded-lg shadow">
      <h2 className="text-lg font-bold mb-3">Validation & Hints</h2>

      {/* Warnings */}
      <div className="mb-4">
        <p className="font-semibold text-yellow-400">
          ⚠ {warnings.length} warnings
        </p>
        {warnings.map((msg, idx) => (
          <div
            key={idx}
            className="mt-2 p-3 border border-yellow-600 bg-yellow-900/20 rounded"
          >
            {msg}
          </div>
        ))}
      </div>

      {/* Suggestions */}
      <div>
        <p className="font-semibold text-blue-400">
          💡 {suggestions.length} suggestions
        </p>
        {suggestions.map((msg, idx) => (
          <div
            key={idx}
            className="mt-2 p-3 border border-blue-600 bg-blue-900/20 rounded"
          >
            {msg}
          </div>
        ))}
      </div>
    </div>
  );
}
