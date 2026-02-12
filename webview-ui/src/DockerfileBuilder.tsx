import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { VSCodeButton, VSCodeTextField, VSCodeDivider } from "@vscode/webview-ui-toolkit/react";
import { Group, Panel, Separator } from "react-resizable-panels";
import { StageCard, StageData } from "./StageCard";
import { validateDockerfile } from "./utilities/validations";
import ValidationPanel from "./ValidationPanel";
import { DockerfileData, DockerStage, DockerCommandType } from "./types/DockerfileData";
import { generateDockerfile } from "./utilities/dockerfileGenerator";
import DockerfilePreview from "./DockerfilePreview";
import { vscode } from "./utilities/vscode";

// Extend window interface
declare global {
  interface Window {
    dockerfileId?: string;
    dockerfileName?: string;
    dockerfileData?: DockerfileData | null;
  }
}

export default function DockerfileBuilder() {
  const [stages, setStages] = useState<StageData[]>([]);
  const [imageName, setImageName] = useState("");
  const [imageTag, setImageTag] = useState("");
  const stageCounterRef = useRef(0);
  const isInitialLoadRef = useRef(true);
  const isSavingRef = useRef(false);
  const [testBuildLogs, setTestBuildLogs] = useState<
    { kind: "stdout" | "stderr"; line: string; ts: number }[]
  >([]);

  const [testBuildStatus, setTestBuildStatus] = useState<
    "idle" | "running" | "success" | "error"
  >("idle");
  const logRef = useRef<HTMLPreElement | null>(null);

      useEffect(() => {
      const el = logRef.current;
      if (!el) return;

      // Auto-scroll only if user is near the bottom
      const isNearBottom =
        el.scrollHeight - el.scrollTop - el.clientHeight < 40;

      if (isNearBottom) {
        el.scrollTop = el.scrollHeight;
      }
    }, [testBuildLogs]);

  // Load Dockerfile data into state
  const loadDockerfileData = useCallback((data: DockerfileData) => {
    if (!data) return;

    // Load stages
    if (data.stages && data.stages.length > 0) {
      const loadedStages: StageData[] = data.stages.map((stage: DockerStage, index: number) => ({
        id: stage.id || `stage-${index + 1}`,
        baseImage: stage.baseImage || "node:18-alpine",
        stageName: stage.stageName,
        commands: stage.commands.map(cmd => ({
          id: cmd.id || crypto.randomUUID(),
          type: cmd.type,
          value: cmd.value
        }))
      }));
      setStages(loadedStages);
      stageCounterRef.current = loadedStages.length;
    }

    // Load runtime config
    if (data.runtime) {
      setImageName(data.runtime.imageName || "");
      setImageTag(data.runtime.imageTag || "latest");
    }

    // Mark that initial load is complete after a small delay
    // This ensures all state updates have been processed
    setTimeout(() => {
      isInitialLoadRef.current = false;
    }, 50);
  }, []); // Empty deps - all setState functions and refs are stable

  // Load initial data from window or request it from extension
  useEffect(() => {
    // Load data from window object if available
    if (window.dockerfileData) {
      loadDockerfileData(window.dockerfileData);
    } else {
      // Request data from extension
      vscode.postMessage({ command: "requestDockerfileData" });
    }

    // Listen for messages from extension
    const messageHandler = (event: MessageEvent) => {
      const message = event.data;

      if (message.command === "loadDockerfileData" && message.data) {
        loadDockerfileData(message.data);
      }

      if (message.command === "testBuildStart") {
        setTestBuildLogs([]);
        setTestBuildStatus("running");
      }

      if (message.command === "testBuildLog") {
        setTestBuildLogs(prev => [
          ...prev,
          { kind: message.kind, line: message.line, ts: message.ts ?? Date.now() }
        ]);
      }

      if (message.command === "testBuildError") {
        setTestBuildStatus("error");
        setTestBuildLogs(prev => [
          ...prev,
          { kind: "stderr", line: message.message, ts: message.ts ?? Date.now() }
        ]);
      }

      if (message.command === "testBuildDone") {
        setTestBuildStatus(message.ok ? "success" : "error");
      }
    };

    window.addEventListener("message", messageHandler);
    return () => window.removeEventListener("message", messageHandler);
  }, [loadDockerfileData]); // Add loadDockerfileData as dependency

  // Save current state to DockerfileData format
  const saveDockerfileData = useCallback((showNotification = false) => {
    // Prevent concurrent saves
    if (isSavingRef.current) {
      return;
    }

    isSavingRef.current = true;

    const dockerfileId = window.dockerfileId || "default";
    const dockerfileName = window.dockerfileName || "Dockerfile";
    const now = new Date().toISOString();



    const data: DockerfileData = {
      id: dockerfileId,
      metadata: {
        name: dockerfileName,
        updatedAt: now,
        createdAt: window.dockerfileData?.metadata?.createdAt || now
      },
      stages: stages.map(stage => ({
        id: stage.id,
        baseImage: stage.baseImage,
        stageName: stage.stageName,
        commands: stage.commands.map(cmd => ({
          id: cmd.id,
          type: cmd.type as DockerCommandType,
          value: cmd.value
        }))
      })),
      runtime: {
        imageName: imageName || dockerfileName.toLowerCase().replace(/\s+/g, "-"),
        imageTag: imageTag || "latest"
      }
    };

    // Send to extension
    vscode.postMessage({
      command: "saveDockerfileData",
      data,
      showNotification
    });

    // Reset saving flag after a short delay to allow message to be processed
    setTimeout(() => {
      isSavingRef.current = false;
    }, 100);
  }, [stages, imageName, imageTag]);

  const addStage = () => {
    stageCounterRef.current += 1;
    const newStage: StageData = {
      id: stageCounterRef.current.toString(),
      baseImage: "node:18-alpine",
      stageName: "",
      commands: [],
    };
    setStages([...stages, newStage]);
  };

  const updateStage = (updatedStage: StageData) => {
    setStages(stages.map((stage) => (stage.id === updatedStage.id ? updatedStage : stage)));
  };

  const deleteStage = (id: string) => {
    setStages(stages.filter((stage) => stage.id !== id));
  };

  // Auto-save on changes (debounced)
  useEffect(() => {
    // Skip auto-save on initial load
    if (isInitialLoadRef.current) {
      return;
    }

    const timer = setTimeout(() => {
      if (stages.length > 0 || imageName) {
        saveDockerfileData();
      }
    }, 1000); // Save 1 second after last change

    return () => clearTimeout(timer);
  }, [stages, imageName, imageTag, saveDockerfileData]);

  const handleRunTestBuild = () => {
    vscode.postMessage({
      type: "TEST_BUILD",
      payload: {
        imageName: imageName || "dockforge-test",
        imageTag: imageTag || "latest",
        stages,
      },
    });
  };

  const handleBuildImage = () => {
    vscode.postMessage({
      type: "BUILD_IMAGE",
      payload: {
        imageName,
        imageTag,
        dockerfileText,
      },
    });
  };

  const handleInsertToWorkspace = () => {
  vscode.postMessage({
    type: "INSERT_TO_WORKSPACE",
    payload: {
      dockerfileText,
      stages,
      warnings: results.warnings,
      suggestions: results.suggestions,
    },
  });
};

  const results = validateDockerfile(stages);

  // Generate Dockerfile text for preview (memoized for performance)
  const dockerfileText = useMemo(() => {
    const data: DockerfileData = {
      id: window.dockerfileId || "preview",
      metadata: {
        name: window.dockerfileName || "Dockerfile",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      stages: stages.map(stage => ({
        id: stage.id,
        baseImage: stage.baseImage,
        stageName: stage.stageName,
        commands: stage.commands.map(cmd => ({
          id: cmd.id,
          type: cmd.type as DockerCommandType,
          value: cmd.value
        }))
      })),
      runtime: {
        imageName: imageName || "my-app",
        imageTag: imageTag || "latest"
      }
    };
    
    return generateDockerfile(data);
  }, [stages, imageName, imageTag]);

  const handleCopyDockerfile = () => {
    vscode.postMessage({
      type: "SHOW_INFO",
      message: "Dockerfile copied to clipboard!"
    });
  };

  const handleExportDockerfile = () => {
    vscode.postMessage({
      command: "exportDockerfile",
      data: dockerfileText
    });
  };

  return (
    <Group orientation="horizontal" className="split-view">
      {/* Left Panel - Builder */}
      <Panel defaultSize={50} minSize={30}>
        <div className="panel-scroll-container builder-panel-wrapper">
          <div className="container builder-panel">
            <div className="header-row">
            <h1>Dockerfile Builder</h1>
            <div style={{ display: "flex", gap: "8px" }}>
              <VSCodeButton onClick={() => saveDockerfileData(true)} appearance="secondary">
                Save
              </VSCodeButton>
              <VSCodeButton onClick={addStage}>+ Add Stage</VSCodeButton>
            </div>
        </div>

      {/* Render Stage Cards */}
      {stages.map((stage, index) => (
        <StageCard
          key={stage.id}
          stage={stage}
          stageNumber={index + 1}
          onUpdate={updateStage}
          onDelete={deleteStage}
        />
      ))}

      {/* Example buttons */}
      <div className="button-row">
        <VSCodeButton onClick={handleInsertToWorkspace}>
          Insert to Workspace
        </VSCodeButton>
        <VSCodeButton appearance="secondary">Copy</VSCodeButton>
      </div>

      {/* Validation panel */}
      <div className="validation-container">
        <ValidationPanel warnings={results.warnings} suggestions={results.suggestions} />
      </div>

      {/* Test Build Script Section */}
      <div className="test-build-section">
        <VSCodeDivider />
        <h2 className="section-title">Test Build Script</h2>

        <div className="test-build-form">
          <div className="form-row">
            <div className="form-field">
              <label className="field-label">
                Image Name <span className="required">*</span>
              </label>
              <VSCodeTextField
                value={imageName}
                onInput={(e) => setImageName((e.target as HTMLInputElement).value)}
                placeholder="my-app"
              />
            </div>

            <div className="form-field">
              <label className="field-label">Tag</label>
              <VSCodeTextField
                value={imageTag}
                onInput={(e) => setImageTag((e.target as HTMLInputElement).value)}
                placeholder="latest"
              />
            </div>
          </div>

          <VSCodeButton className="run-test-button" onClick={handleRunTestBuild}>
            <span className="button-icon" aria-hidden="true">▶</span> Run Test Build
          </VSCodeButton>
        </div>
      </div>

      {/* Build Image Section */}
      <div className="build-run-section">
        <VSCodeDivider />
        <h2 className="section-title">Build Image</h2>

        <div className="build-run-form">
          <div className="form-row">
            <div className="form-field">
              <label className="field-label">
                Image Name <span className="required">*</span>
              </label>
              <VSCodeTextField
                value={imageName}
                onInput={(e: any) => setImageName(e.target.value)}
                placeholder="my-app"
              />
            </div>

            <div className="form-field">
              <label className="field-label">Tag</label>
              <VSCodeTextField
                value={imageTag}
                onInput={(e: any) => setImageTag(e.target.value)}
                placeholder="latest"
              />
            </div>
          </div>

          <div className="button-group">
            <VSCodeButton className="build-button" onClick={handleBuildImage}>
              <span className="button-icon">🔨</span> Build Image
            </VSCodeButton>
          </div>
          
          <p style={{ marginTop: "12px", fontSize: "13px", color: "var(--vscode-descriptionForeground)" }}>
            💡 After building, run your image from the <strong>Docker Images</strong> view in the sidebar.
          </p>
        </div>
      </div>
        </div>
      </div>
      </Panel>  

      {/* Resize Handle */}
      <Separator
        className="resize-handle"
        aria-label="Resize panels"
        aria-orientation="vertical"
      />

{/* Right Panel - Preview + Test Build */}
<Panel defaultSize={50} minSize={30}>
  <div className="panel-scroll-container preview-panel-wrapper">
    <Group orientation="vertical" className="right-split">

      {/* Top: Dockerfile Preview */}
      <Panel defaultSize={50} minSize={25}>
        <div className="right-top-scroll">
          <DockerfilePreview
            dockerfileText={dockerfileText}
            onCopy={handleCopyDockerfile}
            onExport={handleExportDockerfile}
          />
        </div>
      </Panel>

      {/* Horizontal resize handle */}
      <Separator
        className="resize-handle-horizontal"
        aria-label="Resize right panels"
        aria-orientation="horizontal"
      />

      {/* Bottom: Test Build Panel */}
      <Panel defaultSize={50} minSize={25}>
        <div className="right-bottom-scroll">
          <div className="test-build-panel">
            <div className="test-build-header">
              <h3>Test Build Panel</h3>
              <VSCodeButton onClick={handleRunTestBuild} disabled={testBuildStatus === "running"}>
                {testBuildStatus === "running" ? "Running..." : "Run Test Build"}
              </VSCodeButton>
            </div>

            <div className="test-build-status">
              Status: {testBuildStatus}
            </div>


            <pre ref={logRef} className="test-build-log">
              {testBuildLogs.map((l, i) => {
                const s = l.line;

                // Decide color by content first (because docker often uses stderr for normal output)
                let cls = "log-out";

                const lower = s.toLowerCase();

                if (
                  lower.includes("error") ||
                  lower.includes("failed") ||
                  lower.includes("executor failed") ||
                  lower.includes("no such file") ||
                  lower.includes("cannot")
                ) {
                  cls = "log-err";
                } else if (lower.includes("warning") || lower.includes("deprecated")) {
                  cls = "log-warn";
                } else if (
                  s.includes("DONE") ||
                  lower.includes("successfully built") ||
                  lower.includes("writing image") ||
                  lower.includes("exporting to image")
                ) {
                  cls = "log-success";
                } else if (s.startsWith("#") || s.includes("[") || lower.includes("building with")) {
                  cls = "log-step";
                } else if (l.kind === "stderr") {
                  // only fallback to red if it wasn't classified above
                  cls = "log-err";
                }

                return (
                  <span key={i} className={`log-line ${cls}`}>
                    {s + "\n"}
                  </span>
                );
              })}
            </pre>
          </div>
        </div>
      </Panel>

    </Group>
  </div>
</Panel>
    </Group>
  );
}
