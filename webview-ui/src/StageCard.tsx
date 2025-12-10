import React from "react";
import { VSCodeButton, VSCodeTextField, VSCodeDivider } from "@vscode/webview-ui-toolkit/react";
import CommandDropdown from "./CommandDropdown";

export interface CommandItem {
  id: string;
  type: string;
  value: string;
}

export interface StageData {
  id: string;
  baseImage: string;
  stageName?: string;
  commands: CommandItem[];
}

interface StageCardProps {
  stage: StageData;
  stageNumber: number;
  onUpdate: (updatedStage: StageData) => void;
  onDelete: (id: string) => void;
}


const commandOptions = [
  "ADD",
  "ARG",
  "CMD",
  "COPY",
  "ENTRYPOINT",
  "ENV",
  "EXPOSE",
  "FROM",
  "HEALTHCHECK",
  "LABEL",
  "MAINTAINER",
  "ONBUILD",
  "RUN",
  "SHELL",
  "STOPSIGNAL",
  "USER",
  "VOLUME",
  "WORKDIR",
];

const baseImageOptions = [
  "node:18-alpine",
  "node:20-alpine",
  "python:3.11-slim",
  "python:3.10-slim",
  "ubuntu:22.04",
  "ubuntu:20.04",
  "alpine:3.18",
  "golang:1.21-alpine",
  "openjdk:17-jdk-slim",
  "nginx:alpine",
  "redis:alpine",
  "postgres:15-alpine",
];

export const StageCard: React.FC<StageCardProps> = ({ stage, stageNumber, onUpdate, onDelete }) => {
  const updateField = (field: keyof StageData, value: any) => {
    onUpdate({ ...stage, [field]: value });
  };

  const updateCommand = (id: string, value: Partial<CommandItem>) => {
    const updatedCommands = stage.commands.map((cmd) =>
      cmd.id === id ? { ...cmd, ...value } : cmd
    );
    updateField("commands", updatedCommands);
  };

  const addCommand = () => {
    const newCommand: CommandItem = {
      id: crypto.randomUUID(),
      type: "RUN",
      value: "",
    };
    updateField("commands", [...stage.commands, newCommand]);
  };

  const deleteCommand = (id: string) => {
    updateField(
      "commands",
      stage.commands.filter((cmd) => cmd.id !== id)
    );
  };

  return (
    <div className="stage-card">
      <div className="stage-header">
        <h2>Stage {stageNumber}</h2>
        <VSCodeButton appearance="icon" onClick={() => onDelete(stage.id)} title="Delete stage">
          ✕
        </VSCodeButton>
      </div>

      <VSCodeDivider />

      {/* Base Image Field */}
      <div className="field-container">
        <label className="field-label">Base Image *</label>
        <CommandDropdown
          value={stage.baseImage}
          options={baseImageOptions}
          onChange={(val) => updateField("baseImage", val)}
          className="w-full"
        />
      </div>

      {/* Stage Name Field */}
      <div className="field-container">
        <label className="field-label">Stage Name (optional)</label>
        <VSCodeTextField
          style={{ width: "100%" }}
          placeholder="builder, production..."
          value={stage.stageName}
          onInput={(e) => updateField("stageName", (e.target as HTMLInputElement).value)}
        />
      </div>

      {/* Commands */}
      <div className="commands-section">
        <div className="commands-header">
          <label className="commands-label">Commands</label>
          <VSCodeButton appearance="secondary" onClick={addCommand}>
            + Add Command
          </VSCodeButton>
        </div>

        {stage.commands.length === 0 ? (
          <div className="empty-state">
            No commands added yet. Click <strong>"Add Command"</strong> to start.
          </div>
        ) : (
          stage.commands.map((cmd) => (
            <div key={cmd.id} className="command-row">
              <CommandDropdown
                value={cmd.type}
                options={commandOptions}
                onChange={(val) => updateCommand(cmd.id, { type: val })}
                className="w-40"
              />

              <VSCodeTextField
                className="command-input"
                placeholder="Enter value..."
                value={cmd.value}
                onInput={(e) => updateCommand(cmd.id, { value: (e.target as HTMLInputElement).value })}
              />

              <VSCodeButton
                appearance="icon"
                onClick={() => deleteCommand(cmd.id)}
                title="Delete command">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="delete-icon">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 7h12M9 7v10m6-10v10M4 7h16l-1 12a2 2 0 01-2 2H7a2 2 0 01-2-2L4 7zm5-3h6v2H9V4z"
                  />
                </svg>
              </VSCodeButton>
            </div>
          ))
        )}
      </div>
    </div>
  );
};