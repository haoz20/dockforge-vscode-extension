import React, { useState } from "react";
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import { StageCard, StageData } from "./StageCard";
import { validateDockerfile } from "./utilities/validations";
import ValidationPanel from "./ValidationPanel";  

export default function DockerfileBuilder() {
  const [stages, setStages] = useState<StageData[]>([]);

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
    setStages(stages.map((stage) =>
      stage.id === updatedStage.id ? updatedStage : stage
    ));
  };

  const deleteStage = (id: string) => {
    setStages(stages.filter((stage) => stage.id !== id));
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
        <StageCard
          key={stage.id}
          stage={stage}
          onUpdate={updateStage}
          onDelete={deleteStage}
        />
      ))}

      {/* Example buttons */}
      <div className="button-row">
        <VSCodeButton>Insert to Workspace</VSCodeButton>
        <VSCodeButton appearance="secondary">Copy</VSCodeButton>
      </div>

      {/* Validation panel */}
      <div className="validation-container">
        <ValidationPanel warnings={results.warnings} suggestions={results.suggestions} />
      </div>
    </div>
  );
}