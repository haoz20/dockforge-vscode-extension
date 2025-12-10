import React from "react";
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

export const StageCard: React.FC<StageCardProps> = ({ stage, onUpdate, onDelete }) => {
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
    <div className="df-card p-5 mt-4">
      <div className="flex justify-between items-center mb-3">
        <h2 className="df-heading font-semibold">Stage {stage.id}</h2>
        <button onClick={() => onDelete(stage.id)} className="df-danger hover:opacity-75" title="Delete stage">
          ✕
        </button>
      </div>

      {/* Base Image Field */}
      <label className="df-label font-medium">Base Image *</label>
      <CommandDropdown
        value={stage.baseImage}
        options={baseImageOptions}
        onChange={(val) => updateField("baseImage", val)}
        className="w-full"
      />
      <div className="mb-4"></div>

      {/* Stage Name Field */}
      <label className="df-label font-medium">Stage Name (optional)</label>
      <input
        className="df-input w-full p-2 rounded mb-4"
        placeholder="builder, production..."
        value={stage.stageName}
        onChange={(e) => updateField("stageName", e.target.value)}
      />

      {/* Commands */}
      <div className="flex justify-between items-center mb-2">
        <label className="df-label font-medium">Commands</label>
        <button
          onClick={addCommand}
          className="px-3 py-1 rounded text-sm df-button-primary">
          + Add Command
        </button>
      </div>

      {stage.commands.length === 0 ? (
        <div className="df-card df-border-dashed text-sm p-4 italic">
          No commands added yet. Click <span className="font-medium">"Add Command"</span> to start.
        </div>
      ) : (
        stage.commands.map((cmd) => (
          <div key={cmd.id} className="flex gap-3 mb-3 items-center">
            <CommandDropdown
              value={cmd.type}
              options={commandOptions}
              onChange={(val) => updateCommand(cmd.id, { type: val })}
              className="w-40"
            />

            <input
              className="df-input flex-1 p-2.5 rounded-lg text-sm"
              placeholder="Enter value..."
              value={cmd.value}
              onChange={(e) => updateCommand(cmd.id, { value: e.target.value })}
            />

            <button
              onClick={() => deleteCommand(cmd.id)}
              className="df-danger hover:opacity-75"
              title="Delete command">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 7h12M9 7v10m6-10v10M4 7h16l-1 12a2 2 0 01-2 2H7a2 2 0 01-2-2L4 7zm5-3h6v2H9V4z"
                />
              </svg>
            </button>
          </div>
        ))
      )}
    </div>
  );
};