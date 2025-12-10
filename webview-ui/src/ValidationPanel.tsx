interface Props {
  warnings: string[];
  suggestions: string[];
}

export default function ValidationPanel({ warnings, suggestions }: Props) {
  return (
    <div className="validation-panel">
      <h2 className="validation-title">Validation & Hints</h2>

      {/* Warnings */}
      <div className="warnings-section">
        <p className="warning-header">
          ⚠ {warnings.length} warnings
        </p>
        {warnings.map((msg, idx) => (
          <div key={idx} className="warning-item">
            {msg}
          </div>
        ))}
      </div>

      {/* Suggestions */}
      <div>
        <p className="info-header">
          💡 {suggestions.length} suggestions
        </p>
        {suggestions.map((msg, idx) => (
          <div key={idx} className="info-item">
            {msg}
          </div>
        ))}
      </div>
    </div>
  );
}