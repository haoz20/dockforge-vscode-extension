import { useState, useRef, useEffect } from "react";
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
  panelSize?: number;
}

export default function DockerfilePreview({ 
  dockerfileText,
  onCopy,
  onExport,
  panelSize
}: DockerfilePreviewProps) {
  const [wordWrap, setWordWrap] = useState<'on' | 'off'>('on');
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

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

  // Trigger editor layout when panel size changes
  useEffect(() => {
    if (editorRef.current) {
      // Small delay to ensure DOM has updated
      const timer = setTimeout(() => {
        editorRef.current?.layout();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [panelSize]);

  // Use ResizeObserver for more reliable resize detection
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      // Use requestAnimationFrame to batch layout calls
      requestAnimationFrame(() => {
        editorRef.current?.layout();
      });
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

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
      <div className="preview-editor" ref={containerRef}>
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
            editorRef.current = editor;
            
            // Handle window resize events
            const handleResize = () => {
              editor.layout();
            };
            window.addEventListener('resize', handleResize);
            
            // Cleanup function stored in editor's disposal
            editor.onDidDispose(() => {
              window.removeEventListener('resize', handleResize);
            });
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
