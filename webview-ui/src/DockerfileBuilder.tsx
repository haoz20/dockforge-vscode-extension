import React, { useState, useRef } from "react";
import { VSCodeButton, VSCodeTextField, VSCodeDivider } from "@vscode/webview-ui-toolkit/react";
import { StageCard, StageData } from "./StageCard";
import { validateDockerfile } from "./utilities/validations";
import ValidationPanel from "./ValidationPanel";
declare function acquireVsCodeApi(): {
  postMessage(message: any): void;
};

const vscode = acquireVsCodeApi();

export default function DockerfileBuilder() {
  const [stages, setStages] = useState<StageData[]>([]);
  const [imageName, setImageName] = useState("");
  const [imageTag, setImageTag] = useState("");
  const [containerName, setContainerName] = useState("");
  const [portMapping, setPortMapping] = useState("");
  const [envVariables, setEnvVariables] = useState("");
  const stageCounterRef = useRef(0);

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

  const handleRunTestBuild = () => {
    console.log("Running test build with:", { imageName, imageTag, stages });
    // TODO: Implement docker build logic
  };

  const handleBuildImage = () => {
    console.log("Building image with:", { imageName, imageTag, stages });
    // TODO: Implement docker build logic
  };

  const handleRunContainer = () => {
    console.log("Running container with:", { imageName, imageTag, containerName, portMapping, envVariables });
    // TODO: Implement docker run logic
  };

  const handleInsertToWorkspace = () => {
  console.log("Insert clicked");
  vscode.postMessage({
    type: "INSERT_TO_WORKSPACE",
    payload: {
      stages,
      warnings: results.warnings,
      suggestions: results.suggestions,
    },
  });
};

  const results = validateDockerfile(stages);

  return (
    <div className="container">
      <div className="header-row">
        <h1>Dockerfile Builder</h1>
        <VSCodeButton onClick={addStage}>+ Add Stage</VSCodeButton>
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
          </div>
        </div>
      </div>

    </div>
  );
}
