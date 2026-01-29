import { VSCodeDropdown, VSCodeOption } from "@vscode/webview-ui-toolkit/react";

interface DropdownProps {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  className?: string;
}

export default function CommandDropdown({ value, options, onChange, className }: DropdownProps) {
  return (
    <VSCodeDropdown
      className={className}
      value={value}
      onChange={(e) => onChange((e.target as HTMLSelectElement).value)}
    >
      {options.map((option) => (
        <VSCodeOption key={option} value={option}>
          {option}
        </VSCodeOption>
      ))}
    </VSCodeDropdown>
  );
}