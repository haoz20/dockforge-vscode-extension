import { useState } from "react";
import { VSCodeButton, VSCodeTextField, VSCodeDropdown, VSCodeOption, VSCodeTextArea } from "@vscode/webview-ui-toolkit/react";
import "./DockerfileBuilder.css";

interface Stage {
  id: number;
  name: string;
  baseImage: string;
  customBaseImage: string;
  commands: Command[];
}

interface Command {
  id: number;
  type: string;
  value: string;
}

function DockerfileBuilder() {
  const [stages, setStages] = useState<Stage[]>([
    {
      id: 1,
      name: "",
      baseImage: "",
      customBaseImage: "",
      commands: []
    }
  ]);
  const [imageName, setImageName] = useState("my-app");
  const [tag, setTag] = useState("latest");
  const [containerName, setContainerName] = useState("Auto-generated");
  const [portMapping, setPortMapping] = useState("8080:80");

  const addStage = () => {
    const newStage: Stage = {
      id: stages.length + 1,
      name: "",
      baseImage: "",
      customBaseImage: "",
      commands: []
    };
    setStages([...stages, newStage]);
  };

  const addCommand = (stageId: number) => {
    setStages(stages.map(stage => {
      if (stage.id === stageId) {
        return {
          ...stage,
          commands: [...stage.commands, { id: stage.commands.length + 1, type: "RUN", value: "" }]
        };
      }
      return stage;
    }));
  };

  const updateStageBaseImage = (stageId: number, value: string) => {
    setStages(stages.map(stage => {
      if (stage.id === stageId) {
        return { ...stage, baseImage: value };
      }
      return stage;
    }));
  };

  const updateStageCustomBaseImage = (stageId: number, value: string) => {
    setStages(stages.map(stage => {
      if (stage.id === stageId) {
        return { ...stage, customBaseImage: value };
      }
      return stage;
    }));
  };

  const updateStageName = (stageId: number, value: string) => {
    setStages(stages.map(stage => {
      if (stage.id === stageId) {
        return { ...stage, name: value };
      }
      return stage;
    }));
  };

  const hasValidationError = stages.some(stage => !stage.baseImage && !stage.customBaseImage);

  return (
    <div className="dockerfile-builder">
      <div className="builder-header">
        <h1>Dockerfile Builder</h1>
        <VSCodeButton onClick={addStage}>
          <span className="codicon codicon-layers"></span> Add Stage
        </VSCodeButton>
      </div>

      <div className="builder-content">
        {stages.map((stage, index) => (
          <div key={stage.id} className="stage-card">
            <div className="stage-header">
              <span className="codicon codicon-layers"></span>
              <h2>Stage {index + 1}</h2>
            </div>

            <div className="form-group">
              <label htmlFor={`base-image-${stage.id}`}>
                Base Image <span className="required">*</span>
              </label>
              <VSCodeDropdown
                id={`base-image-${stage.id}`}
                value={stage.baseImage}
                onChange={(e: any) => updateStageBaseImage(stage.id, e.target.value)}
              >
                <VSCodeOption value="">Select a base image...</VSCodeOption>
                {/* <VSCodeOption value="node:18-alpine">node:18-alpine</VSCodeOption>
                <VSCodeOption value="python:3.11-slim">python:3.11-slim</VSCodeOption>
                <VSCodeOption value="nginx:alpine">nginx:alpine</VSCodeOption>
                <VSCodeOption value="golang:1.21-alpine">golang:1.21-alpine</VSCodeOption>
                <VSCodeOption value="openjdk:17-slim">openjdk:17-slim</VSCodeOption>
                <VSCodeOption value="ubuntu:22.04">ubuntu:22.04</VSCodeOption>
                <VSCodeOption value="alpine:latest">alpine:latest</VSCodeOption> */}
              </VSCodeDropdown>
              <VSCodeTextField
                placeholder="Enter custom base image (e.g., myimage:tag)"
                value={stage.customBaseImage}
                onInput={(e: any) => updateStageCustomBaseImage(stage.id, e.target.value)}
                style={{ marginTop: '8px' }}
              />
            </div>

            <div className="form-group">
              <label htmlFor={`stage-name-${stage.id}`}>
                Stage Name <span className="optional">(optional)</span>
              </label>
              <VSCodeTextField
                id={`stage-name-${stage.id}`}
                placeholder="e.g., builder, dependencies, production"
                value={stage.name}
                onInput={(e: any) => updateStageName(stage.id, e.target.value)}
              />
              <div className="hint">Use with COPY --from=stagename to reference this stage</div>
            </div>

            <div className="form-group">
              <div className="commands-header">
                <label>Commands</label>
                <VSCodeButton appearance="secondary" onClick={() => addCommand(stage.id)}>
                  <span className="codicon codicon-add"></span> Add Command
                </VSCodeButton>
              </div>
              {stage.commands.length === 0 ? (
                <div className="empty-state">
                  No commands added yet. Click "Add Command" to start.
                </div>
              ) : (
                <div className="commands-list">
                  {stage.commands.map(cmd => (
                    <div key={cmd.id} className="command-item">
                      <VSCodeDropdown value={cmd.type}>
                        <VSCodeOption value="RUN">RUN</VSCodeOption>
                        <VSCodeOption value="COPY">COPY</VSCodeOption>
                        <VSCodeOption value="ADD">ADD</VSCodeOption>
                        <VSCodeOption value="WORKDIR">WORKDIR</VSCodeOption>
                        <VSCodeOption value="ENV">ENV</VSCodeOption>
                        <VSCodeOption value="EXPOSE">EXPOSE</VSCodeOption>
                        <VSCodeOption value="CMD">CMD</VSCodeOption>
                        <VSCodeOption value="ENTRYPOINT">ENTRYPOINT</VSCodeOption>
                      </VSCodeDropdown>
                      <VSCodeTextField placeholder="Command value" />
                      <VSCodeButton appearance="icon">
                        <span className="codicon codicon-trash"></span>
                      </VSCodeButton>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="stage-actions">
              <VSCodeButton appearance="secondary">
                <span className="codicon codicon-insert"></span> Insert to Workspace
              </VSCodeButton>
              <VSCodeButton appearance="secondary">
                <span className="codicon codicon-copy"></span> Copy
              </VSCodeButton>
            </div>
          </div>
        ))}
      </div>

      <div className="validation-section">
        <h2>Validation & Hints</h2>
        {hasValidationError ? (
          <div className="validation-error">
            <span className="codicon codicon-error"></span>
            <div className="error-content">
              <div className="error-count">1 error</div>
              <div className="error-message">
                <span className="codicon codicon-error"></span>
                Missing base image: At least one FROM instruction is required
              </div>
            </div>
          </div>
        ) : (
          <div className="validation-success">
            <span className="codicon codicon-pass"></span> No issues found
          </div>
        )}
      </div>

      <div className="test-build-section">
        <h2>Test Build Script</h2>
        <div className="build-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="test-image-name">
                Image Name <span className="required">*</span>
              </label>
              <VSCodeTextField
                id="test-image-name"
                value={imageName}
                onInput={(e: any) => setImageName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="test-tag">Tag</label>
              <VSCodeTextField
                id="test-tag"
                value={tag}
                onInput={(e: any) => setTag(e.target.value)}
              />
            </div>
          </div>
          <VSCodeButton>
            <span className="codicon codicon-play"></span> Run Test Build
          </VSCodeButton>
        </div>
      </div>

      <div className="build-run-section">
        <h2>Build & Run Image</h2>
        <div className="build-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="build-image-name">
                Image Name <span className="required">*</span>
              </label>
              <VSCodeTextField
                id="build-image-name"
                value={imageName}
                onInput={(e: any) => setImageName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="build-tag">Tag</label>
              <VSCodeTextField
                id="build-tag"
                value={tag}
                onInput={(e: any) => setTag(e.target.value)}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="container-name">Container Name</label>
              <VSCodeTextField
                id="container-name"
                value={containerName}
                onInput={(e: any) => setContainerName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="port-mapping">Port Mapping</label>
              <VSCodeTextField
                id="port-mapping"
                value={portMapping}
                onInput={(e: any) => setPortMapping(e.target.value)}
              />
            </div>
          </div>
          <div className="action-buttons">
            <VSCodeButton>
              <span className="codicon codicon-tools"></span> Build Image
            </VSCodeButton>
            <VSCodeButton appearance="secondary">
              <span className="codicon codicon-play"></span> Build & Run
            </VSCodeButton>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DockerfileBuilder;
