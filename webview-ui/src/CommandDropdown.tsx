import { useState, useRef, useEffect } from "react";

interface DropdownProps {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  className?: string;
}

export default function CommandDropdown({ value, options, onChange, className }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className={`relative ${className ?? "w-40"}`}>

      {/* Selected Box */}
      <button
        className="
          w-full p-2.5 rounded-lg df-dropdown
          text-left text-sm flex justify-between items-center shadow-sm
          hover:border-[var(--df-focus-ring)]
          focus:outline-none focus:ring-2 focus:ring-[var(--df-focus-ring)]
          transition
        "
        onClick={() => setOpen(!open)}
      >
        {value}
        <span className="text-gray-600 text-2xl leading-none">▾</span>
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div
          className="
            absolute z-20 mt-1 w-full rounded-lg df-dropdown-panel
            shadow-lg max-h-60 overflow-y-auto animate-fadeIn
          "
        >
          {options.map((option) => (
            <div
              key={option}
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
              className={`
                px-3 py-2 text-sm cursor-pointer select-none df-dropdown-option
                hover:bg-[var(--df-list-hover)]
                ${option === value ? "is-active font-semibold" : ""}
              `}
            >
              {option}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}