import { useState } from "react";
import * as monaco from 'monaco-editor';
import Editor, { loader } from "@monaco-editor/react";
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import { MONACO_OPTIONS, getMonacoTheme } from "./utilities/monacoConfig";
import "./DockerfilePreview.css";

// Import Monaco Editor workers
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';

// Configure Monaco Editor environment
self.MonacoEnvironment = {
  getWorker(_: string, label: string) {
    return new editorWorker();
  }
};

// Configure loader to use the imported monaco
loader.config({ monaco });

interface DockerfilePreviewProps {
  dockerfileText: string;
  onCopy?: () => void;
  onExport?: () => void;
}

export default function DockerfilePreview({ 
  dockerfileText,
  onCopy,
  onExport
}: DockerfilePreviewProps) {
  const [wordWrap, setWordWrap] = useState<'on' | 'off'>('on');

  const handleCopy = () => {
    navigator.clipboard.writeText(dockerfileText).then(() => {
      if (onCopy) {
        onCopy();
      }
    });
  };

  // const handleExport = () => {
  //   if (onExport) {
  //     onExport();
  //   } else {
  //     // Default export behavior - download as file
  //     const blob = new Blob([dockerfileText], { type: 'text/plain' });
  //     const url = URL.createObjectURL(blob);
  //     const a = document.createElement('a');
  //     a.href = url;
  //     a.download = 'Dockerfile';
  //     document.body.appendChild(a);
  //     a.click();
  //     document.body.removeChild(a);
  //     URL.revokeObjectURL(url);
  //   }
  // };

  const toggleWordWrap = () => {
    setWordWrap(prev => prev === 'on' ? 'off' : 'on');
  };

  const lineCount = dockerfileText.split('\n').length;
  const charCount = dockerfileText.length;

  return (
    <div className="dockerfile-preview">
      {/* Header */}
      <div className="preview-header">
        <h2 className="preview-title">Dockerfile Preview</h2>
        <div className="preview-actions">
          <VSCodeButton 
            appearance="icon"
            onClick={toggleWordWrap}
            title={wordWrap === 'on' ? "Disable word wrap" : "Enable word wrap"}
            aria-label="Toggle word wrap"
          >
            {wordWrap === 'on' ? '↔' : '⤴'}
          </VSCodeButton>
          <VSCodeButton onClick={handleCopy} title="Copy Dockerfile to clipboard">
            Copy
          </VSCodeButton>
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="preview-editor">
        <Editor
          height="100%"
          language="dockerfile"
          value={dockerfileText}
          theme={getMonacoTheme()}
          options={{
            ...MONACO_OPTIONS,
            wordWrap
          }}
          onMount={(editor, monaco) => {
            console.log('Monaco editor mounted successfully');
          }}
          loading={
            <div className="editor-loading">
              <div className="loading-spinner"></div>
              <p>Loading editor...</p>
            </div>
          }
        />
      </div>

      {/* Footer with stats */}
      <div className="preview-footer">
        <span className="footer-stat">{lineCount} lines</span>
        <span className="footer-separator">•</span>
        <span className="footer-stat">{charCount} characters</span>
      </div>
    </div>
  );
}
