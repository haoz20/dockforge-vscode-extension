import type { editor } from 'monaco-editor';

/**
 * Monaco Editor configuration optimized for read-only Dockerfile preview
 */
export const MONACO_OPTIONS: editor.IStandaloneEditorConstructionOptions = {
  readOnly: true,
  domReadOnly: true,
  minimap: { 
    enabled: true,
    side: 'right'
  },
  scrollBeyondLastLine: false,
  fontSize: 14,
  fontFamily: 'var(--vscode-editor-font-family, Consolas, "Courier New", monospace)',
  lineNumbers: 'on',
  renderLineHighlight: 'line',
  automaticLayout: true,
  wordWrap: 'on',
  wrappingStrategy: 'advanced',
  padding: { 
    top: 16, 
    bottom: 16 
  },
  scrollbar: {
    vertical: 'visible',
    horizontal: 'visible',
    verticalScrollbarSize: 10,
    horizontalScrollbarSize: 10,
    useShadows: false,
  },
  overviewRulerLanes: 0,
  hideCursorInOverviewRuler: true,
  overviewRulerBorder: false,
  lineDecorationsWidth: 10,
  lineNumbersMinChars: 3,
  glyphMargin: false,
  folding: true,
  foldingStrategy: 'indentation',
  showFoldingControls: 'mouseover',
  matchBrackets: 'always',
  renderWhitespace: 'selection',
  contextmenu: false,
  links: false,
  quickSuggestions: false,
  suggest: {
    showWords: false
  }
};

/**
 * Get Monaco theme based on VS Code theme
 * In production, you can detect the theme from VS Code API
 */
export function getMonacoTheme(): string {
  // Check if VS Code theme is available
  const body = document.body;
  const theme = body.getAttribute('data-vscode-theme-kind');
  
  if (theme === 'vscode-light') {
    return 'vs';
  } else if (theme === 'vscode-high-contrast') {
    return 'hc-black';
  }
  
  return 'vs-dark'; // Default to dark theme
}
