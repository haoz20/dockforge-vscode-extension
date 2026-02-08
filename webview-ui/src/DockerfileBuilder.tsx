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
  const [containerName, setContainerName] = useState("");
  const [portMapping, setPortMapping] = useState("");
  const [envVariables, setEnvVariables] = useState("");
  const stageCounterRef = useRef(0);
  const isInitialLoadRef = useRef(true);
  const isSavingRef = useRef(false);

  // Build state
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildLogs, setBuildLogs] = useState<string[]>([]);
  const [buildProgress, setBuildProgress] = useState<{ stage: string; progress: number } | null>(null);
  const [buildResult, setBuildResult] = useState<{ success: boolean; error?: string } | null>(null);
  const [showBuildOutput, setShowBuildOutput] = useState(false);

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
      setContainerName(data.runtime.containerName || "");
      
      // Load port mappings
      if (data.runtime.portMappings && data.runtime.portMappings.length > 0) {
        const portStr = data.runtime.portMappings
          .map(p => `${p.hostPort || p.containerPort}:${p.containerPort}`)
          .join(", ");
        setPortMapping(portStr);
      }

      // Load environment variables
      if (data.runtime.environmentVariables && data.runtime.environmentVariables.length > 0) {
        const envStr = data.runtime.environmentVariables
          .map(e => `${e.key}=${e.value}`)
          .join(",");
        setEnvVariables(envStr);
      }
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
      
      // Handle build output messages
      switch (message.command) {
        case "buildOutput":
        case "runOutput":
        case "buildRunOutput":
          setBuildLogs(prev => [...prev, message.line]);
          break;
          
        case "buildProgress":
          setBuildProgress({ stage: message.stage, progress: message.progress });
          break;
          
        case "buildComplete":
        case "runComplete":
        case "buildRunComplete":
          setIsBuilding(false);
          setBuildResult({ 
            success: message.success || message.buildSuccess, 
            error: message.error 
          });
          break;
          
        case "loadDockerfileData":
          if (message.data) {
            loadDockerfileData(message.data);
          }
          break;
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

    // Parse port mappings with validation
    const portMappings = portMapping
      .split(",")
      .map(p => p.trim())
      .filter(p => p.length > 0)
      .map(p => {
        const [host, container] = p.split(":");
        const containerPort = parseInt(container || host, 10);
        const hostPort = container ? parseInt(host, 10) : undefined;

        // Skip invalid entries where parsing failed
        if (
          Number.isNaN(containerPort) ||
          (hostPort !== undefined && Number.isNaN(hostPort))
        ) {
          return null;
        }

        const portMapping: { containerPort: number; hostPort?: number; protocol: "tcp" } = {
          containerPort,
          protocol: "tcp" as const
        };
        
        if (hostPort !== undefined) {
          portMapping.hostPort = hostPort;
        }

        return portMapping;
      })
      .filter(
        (mapping): mapping is { containerPort: number; hostPort?: number; protocol: "tcp" } =>
          mapping !== null
      );

    // Parse environment variables
    const environmentVariables = envVariables
      .split(",")
      .map(e => e.trim())
      .filter(e => e.length > 0)
      .map(e => {
        const [key, value] = e.split("=", 2);
        return { key: key.trim(), value: value?.trim() || "" };
      });

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
        imageTag: imageTag || "latest",
        containerName: containerName || undefined,
        portMappings: portMappings.length > 0 ? portMappings : undefined,
        environmentVariables: environmentVariables.length > 0 ? environmentVariables : undefined
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
  }, [stages, imageName, imageTag, containerName, portMapping, envVariables]);

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
  }, [stages, imageName, imageTag, containerName, portMapping, envVariables, saveDockerfileData]);

  const handleRunTestBuild = () => {
    setIsBuilding(true);
    setBuildLogs([]);
    setBuildResult(null);
    setBuildProgress(null);
    setShowBuildOutput(true);
    
    vscode.postMessage({
      type: "TEST_BUILD",
      payload: {
        imageName: imageName || "dockforge-test",
        imageTag: imageTag || "latest",
        dockerfileText, // Send pre-generated Dockerfile text
      },
    });
  };

  const handleBuildImage = () => {
    setIsBuilding(true);
    setBuildLogs([]);
    setBuildResult(null);
    setBuildProgress(null);
    setShowBuildOutput(true);
    
    vscode.postMessage({
      type: "BUILD_IMAGE",
      payload: {
        imageName,
        imageTag,
        dockerfileText, // Send pre-generated Dockerfile text
      },
    });
  };

  const handleRunContainer = () => {
    setIsBuilding(true);
    setBuildLogs([]);
    setBuildResult(null);
    setShowBuildOutput(true);
    
    vscode.postMessage({
      type: "RUN_CONTAINER",
      payload: {
        imageName,
        imageTag,
        containerName,
        portMapping,
        envVariables,
      },
    });
  };

  const handleBuildAndRun = () => {
    setIsBuilding(true);
    setBuildLogs([]);
    setBuildResult(null);
    setBuildProgress(null);
    setShowBuildOutput(true);
    
    vscode.postMessage({
      type: "BUILD_AND_RUN",
      payload: {
        imageName,
        imageTag,
        dockerfileText, // Send pre-generated Dockerfile text
        containerName,
        portMapping,
        envVariables,
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
        imageTag: imageTag || "latest",
        containerName: containerName || undefined,
        portMappings: portMapping
          .split(",")
          .map(p => p.trim())
          .filter(p => p.length > 0)
          .map(p => {
            const [host, container] = p.split(":");
            const containerPort = parseInt(container || host, 10);
            const hostPort = container ? parseInt(host, 10) : undefined;
            
            if (Number.isNaN(containerPort) || (hostPort !== undefined && Number.isNaN(hostPort))) {
              return null;
            }
            
            return {
              containerPort,
              hostPort,
              protocol: "tcp" as const
            };
          })
          .filter((m): m is NonNullable<typeof m> => m !== null),
        environmentVariables: envVariables
          .split(",")
          .map(e => e.trim())
          .filter(e => e.length > 0)
          .map(e => {
            const [key, value] = e.split("=", 2);
            return { key: key.trim(), value: value?.trim() || "" };
          })
      }
    };
    
    return generateDockerfile(data);
  }, [stages, imageName, imageTag, containerName, portMapping, envVariables]);

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

      {/* Build & Run Image Section */}
      <div className="build-run-section">
        <VSCodeDivider />
        <h2 className="section-title">Build & Run Image</h2>

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
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label className="field-label">Container Name</label>
              <VSCodeTextField
                value={containerName}
                onInput={(e: any) => setContainerName(e.target.value)}
                placeholder="Auto-generated"
              />
            </div>

            <div className="form-field">
              <label className="field-label">Port Mapping</label>
              <VSCodeTextField
                value={portMapping}
                onInput={(e: any) => setPortMapping(e.target.value)}
                placeholder="8080:80"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-field full-width">
              <label className="field-label">Environment Variables (comma-separated)</label>
              <VSCodeTextField
                value={envVariables}
                onInput={(e: any) => setEnvVariables(e.target.value)}
                placeholder="NODE_ENV=production,PORT=3000"
              />
            </div>
          </div>

          <div className="button-group">
            <VSCodeButton className="build-button" onClick={handleBuildImage}>
              <span className="button-icon">🔨</span> Build Image
            </VSCodeButton>
            <VSCodeButton className="run-button green-button" onClick={handleRunContainer}>
              <span className="button-icon">▶</span> Run Container
            </VSCodeButton>
            <VSCodeButton className="build-run-button" onClick={handleBuildAndRun}>
              <span className="button-icon">🚀</span> Build & Run
            </VSCodeButton>
          </div>
        </div>
      </div>

        </div>

        {/* Build Output Panel - Show when building or when user wants to see output */}
        {showBuildOutput && (
          <div className="build-output-overlay">
            <div className="build-output-panel">
              <div className="build-output-header">
                <h3>Build Output</h3>
                <div className="build-output-controls">
                  {buildResult && (
                    <span className={`build-status ${buildResult.success ? 'success' : 'error'}`}>
                      {buildResult.success ? '✅ Success' : '❌ Failed'}
                    </span>
                  )}
                  <VSCodeButton appearance="icon" onClick={() => setBuildLogs([])}>
                    Clear
                  </VSCodeButton>
                  <VSCodeButton appearance="icon" onClick={() => setShowBuildOutput(false)}>
                    ✕
                  </VSCodeButton>
                </div>
              </div>
              
              {buildProgress && (
                <div className="build-progress">
                  <div className="progress-bar" style={{ width: `${buildProgress.progress}%` }} />
                  <span className="progress-text">{buildProgress.stage}</span>
                </div>
              )}
              
              <div className="build-logs">
                {buildLogs.length === 0 && isBuilding && (
                  <div className="log-line">Starting build...</div>
                )}
                {buildLogs.map((log, i) => (
                  <div key={i} className="log-line">{log}</div>
                ))}
                {buildResult && buildResult.error && (
                  <div className="log-line error-line">{buildResult.error}</div>
                )}
              </div>
            </div>
          </div>
        )}

        </div>
      </Panel>

      {/* Resize Handle */}
      <Separator
        className="resize-handle"
        aria-label="Resize panels"
        aria-orientation="vertical"
      />

      {/* Right Panel - Preview */}
      <Panel defaultSize={50} minSize={30}>
        <div className="panel-scroll-container preview-panel-wrapper">
          <DockerfilePreview 
            dockerfileText={dockerfileText}
            onCopy={handleCopyDockerfile}
            onExport={handleExportDockerfile}
          />
        </div>
      </Panel>
    </Group>
  );
}
