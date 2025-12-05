import React, { useState } from "react";
import { StageCard, StageData } from "./StageCard";

import { validateDockerfile } from "./utilities/validations";

import ValidationPanel from "./ValidationPanel";  





// console.log(results.warnings);
// console.log(results.suggestions);


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
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold text-white">Dockerfile Builder</h1>
        <button
          onClick={addStage}
          className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-500"
        >
          + Add Stage
        </button>
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
      <div className="mt-6 flex gap-3">
        <button className="px-4 py-2 bg-blue-700 text-white rounded">Insert to Workspace</button>
        <button className="px-4 py-2 bg-gray-700 text-white rounded">Copy</button>
      </div>

      {/* Validation panel */}
      <div className="mt-4">
        <ValidationPanel warnings={results.warnings} suggestions={results.suggestions} />
      </div>
    </div>
  );
}
