import React, { useState } from "react";
import { VSCodeButton, VSCodeTextField, VSCodeDivider } from "@vscode/webview-ui-toolkit/react";
import { StageCard, StageData } from "./StageCard";
import { validateDockerfile } from "./utilities/validations";
import ValidationPanel from "./ValidationPanel";

export default function DockerfileBuilder() {
  const [stages, setStages] = useState<StageData[]>([]);
  const [imageName, setImageName] = useState("my-app");
  const [imageTag, setImageTag] = useState("latest");

  const addStage = () => {
    const newStage: StageData = {
      id: (stages.length + 1).toString(),
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

  const results = validateDockerfile(stages);

  return (
    <div className="container">
      <div className="header-row">
        <h1>Dockerfile Builder</h1>
        <VSCodeButton onClick={addStage}>+ Add Stage</VSCodeButton>
      </div>

      {/* Render Stage Cards */}
      {stages.map((stage) => (
        <StageCard key={stage.id} stage={stage} onUpdate={updateStage} onDelete={deleteStage} />
      ))}

      {/* Example buttons */}
      <div className="button-row">
        <VSCodeButton>Insert to Workspace</VSCodeButton>
        <VSCodeButton appearance="secondary">Copy</VSCodeButton>
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

          <VSCodeButton className="run-test-button" onClick={handleRunTestBuild}>
            <span className="button-icon">▶</span> Run Test Build
          </VSCodeButton>
        </div>
      </div>

      {/* Validation panel */}
      <div className="validation-container">
        <ValidationPanel warnings={results.warnings} suggestions={results.suggestions} />
      </div>
    </div>
  );
}
