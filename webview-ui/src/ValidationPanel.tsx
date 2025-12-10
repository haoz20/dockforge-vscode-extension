interface Props {
  warnings: string[];
  suggestions: string[];
}

export default function ValidationPanel({ warnings, suggestions }: Props) {
  return (
    <div className="mt-4 p-4 df-card">
      <h2 className="text-lg font-bold df-heading mb-3">Validation & Hints</h2>

      {/* Warnings */}
      <div className="mb-4">
        <p className="font-semibold df-tag-warning">
          ⚠ {warnings.length} warnings
        </p>
        {warnings.map((msg, idx) => (
          <div
            key={idx}
            className="mt-2 p-3 df-card"
          >
            {msg}
          </div>
        ))}
      </div>

      {/* Suggestions */}
      <div>
        <p className="font-semibold df-tag-info">
          💡 {suggestions.length} suggestions
        </p>
        {suggestions.map((msg, idx) => (
          <div
            key={idx}
            className="mt-2 p-3 df-card"
          >
            {msg}
          </div>
        ))}
      </div>
    </div>
  );
}