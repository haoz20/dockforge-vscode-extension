import { StageData, CommandItem } from "../StageCard";

export interface ValidationResult {
  warnings: string[];
  suggestions: string[];
}

export function validateDockerfile(stages: StageData[]): ValidationResult {
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // -------------------------------
  // 1. Basic structural validations
  // -------------------------------

  stages.forEach((stage, index) => {
    const stageNum = index + 1;

    // W6: Base image missing
    if (!stage.baseImage || stage.baseImage.trim() === "") {
      warnings.push(`Stage ${stageNum}: Base image is required.`);
    }

    // W2: Empty commands
    const emptyCmdCount = stage.commands.filter(
      (cmd) => !cmd.value || cmd.value.trim() === ""
    ).length;

    if (emptyCmdCount > 0) {
      warnings.push(`Stage ${stageNum}: ${emptyCmdCount} empty command(s) found`);
    }

    // Detect COPY before WORKDIR
    let hasWorkdir = false;
    for (const cmd of stage.commands) {
      if (cmd.type === "WORKDIR") hasWorkdir = true;
      if (!hasWorkdir && (cmd.type === "COPY" || cmd.type === "ADD")) {
        warnings.push(
          `Stage ${stageNum}: COPY/ADD before WORKDIR may copy files to unexpected locations`
        );
      }
    }

    // W4: Invalid EXPOSE port (support multiple ports and protocol suffixes)
    const exposeCmds = stage.commands.filter((c) => c.type === "EXPOSE");
    exposeCmds.forEach((cmd) => {
      const parts = cmd.value.split(/\s+/).filter(Boolean);
      parts.forEach((p) => {
        const portStr = p.split('/')[0];
        const portNum = Number(portStr);
        if (!portStr || isNaN(portNum)) {
          warnings.push(`Stage ${stageNum}: EXPOSE value '${cmd.value}' contains invalid port '${p}'`);
        } else if (portNum <= 0 || portNum > 65535) {
          warnings.push(`Stage ${stageNum}: EXPOSE port '${portNum}' out of valid range (1-65535)`);
        }
      });
    });

    // Deprecated MAINTAINER
    if (stage.commands.some((c) => c.type === "MAINTAINER")) {
      warnings.push(`Stage ${stageNum}: MAINTAINER is deprecated; use LABEL maintainer="..." instead`);
    }

    // Suggest using COPY over ADD unless needed
    if (stage.commands.some((c) => c.type === "ADD")) {
      suggestions.push(
        `Stage ${stageNum}: Consider using COPY instead of ADD unless you need auto-extraction or remote URL fetching`
      );
    }

    // HEALTHCHECK should either be 'NONE' or use 'CMD'
    const healthCmds = stage.commands.filter((c) => c.type === "HEALTHCHECK");
    healthCmds.forEach((cmd) => {
      const v = cmd.value.trim().toUpperCase();
      if (v !== "NONE" && !/\bCMD\b/.test(v)) {
        warnings.push(
          `Stage ${stageNum}: HEALTHCHECK should be 'HEALTHCHECK NONE' or use 'HEALTHCHECK CMD ...'`
        );
      }
    });

    const entryCount = stage.commands.filter((c) => c.type === "ENTRYPOINT").length;
    if (entryCount > 1) {
      warnings.push(`Stage ${stageNum}: Multiple ENTRYPOINT instructions detected; only the last one is used`);
    }

    // If both ENTRYPOINT and CMD exist, ensure ENTRYPOINT comes before CMD so CMD can act as default args
    const firstEntry = stage.commands.findIndex((c) => c.type === "ENTRYPOINT");
    const firstCmd = stage.commands.findIndex((c) => c.type === "CMD");
    if (firstEntry !== -1 && firstCmd !== -1 && firstEntry > firstCmd) {
      warnings.push(
        `Stage ${stageNum}: CMD appears before ENTRYPOINT; put ENTRYPOINT before CMD so CMD provides default arguments`
      );
    }

    // CMD/ENTRYPOINT in non-final stages are usually ineffective for the final image
    if (index !== stages.length - 1) {
      if (stage.commands.some((c) => c.type === "CMD" || c.type === "ENTRYPOINT")) {
        suggestions.push(
          `Stage ${stageNum}: CMD/ENTRYPOINT in intermediate stage will not affect the final image; consider moving to final stage`
        );
      }
    }

    // W5: Multiple CMD/ENTRYPOINT
    const cmdCount = stage.commands.filter((c) => c.type === "CMD").length;
    if (cmdCount > 1) {
      warnings.push(`Stage ${stageNum}: Multiple CMD instructions detected; only the last one is used`);
    }
  });

  // -------------------------------
  // 2. Final stage validations
  // -------------------------------

  if (stages.length > 0) {
    const finalStage = stages[stages.length - 1];
    const hasCMD = finalStage.commands.some((c) => c.type === "CMD");
    const hasEntry = finalStage.commands.some((c) => c.type === "ENTRYPOINT");

    if (!hasCMD && !hasEntry) {
      warnings.push("No CMD or ENTRYPOINT in final stage: Container may not start properly");
    }
  }

  // -------------------------------
  // 3. Suggestions
  // -------------------------------

  if (stages.length > 1) {
    suggestions.push(`Multi-stage build detected with ${stages.length} stages`);
  }

  // H2: Suggest naming stages
  stages.forEach((stage, i) => {
    if (!stage.stageName && stages.length > 1 && i !== stages.length - 1) {
      suggestions.push(
        `Consider naming intermediate stage ${i + 1} for better COPY --from references`
      );
    }
  });

  // H3: Suggest merging RUN commands
  stages.forEach((stage, index) => {
    const runCount = stage.commands.filter((c) => c.type === "RUN").length;
    if (runCount > 2) {
      suggestions.push(`Stage ${index + 1}: Many RUN commands detected; merging can reduce layers`);
    }
  });

  // H5: Large COPY context
  stages.forEach((stage, index) => {
    if (stage.commands.some((c) => c.type === "COPY" && c.value === ". .")) {
      suggestions.push(
        `Stage ${index + 1}: "COPY . ." copies everything; consider using .dockerignore`
      );
    }
  });

  return { warnings, suggestions };
}
