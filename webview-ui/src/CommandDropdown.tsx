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
          w-full p-2.5 rounded-lg border border-[#cccccc]
          bg-white text-left text-sm text-[#1e1e1e]
          flex justify-between items-center shadow-sm
          hover:border-[#999]
          focus:outline-none focus:ring-2 focus:ring-[#0078d4]
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
            absolute z-20 mt-1 w-full bg-white rounded-lg border border-[#d0d0d0]
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
                px-3 py-2 text-sm cursor-pointer select-none
                hover:bg-[#e5f1fb]
                ${option === value ? "bg-[#e8f3ff] font-semibold text-[#005a9e]" : ""}
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
