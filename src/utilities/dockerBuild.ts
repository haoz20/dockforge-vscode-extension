import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { spawn, ChildProcess } from "child_process";

export interface BuildOptions {
  imageName: string;
  imageTag: string;
  dockerfile?: string; // Path to existing Dockerfile
  dockerfileContent?: string; // Pre-generated Dockerfile content
  contextPath: string;
  noCache?: boolean;
  pull?: boolean;
  buildArgs?: Record<string, string>;
  target?: string; // For multi-stage builds
  platform?: string;
}

export interface RunOptions {
  imageName: string;
  imageTag: string;
  containerName?: string;
  portMappings?: string[]; // ["8080:80", "3000:3000"]
  envVariables?: Record<string, string>;
  volumes?: string[];
  detached?: boolean;
  remove?: boolean;
  interactive?: boolean;
  tty?: boolean;
  workingDir?: string;
  network?: string;
}

export interface BuildResult {
  success: boolean;
  imageId?: string;
  error?: string;
  logs: string[];
}

export interface RunResult {
  success: boolean;
  containerId?: string;
  containerName?: string;
  error?: string;
  logs: string[];
}

/**
 * Output channel for Docker operations
 */
let dockerOutputChannel: vscode.OutputChannel | undefined;

function getDockerOutputChannel(): vscode.OutputChannel {
  dockerOutputChannel ??= vscode.window.createOutputChannel("DockForge - Docker");
  return dockerOutputChannel;
}

/**
 * Generate a temporary Dockerfile from content string
 */
export async function createTempDockerfile(
  dockerfileContent: string,
  contextPath: string,
  dockerfileId: string
): Promise<string> {
  const tempDir = path.join(contextPath, "");
  
  // Create .dockforge directory if it doesn't exist
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  const tempDockerfilePath = path.join(tempDir, `Dockerfile.${dockerfileId}`);
  fs.writeFileSync(tempDockerfilePath, dockerfileContent, "utf8");
  
  return tempDockerfilePath;
}

/**
 * Clean up temporary Dockerfile
 */
export function cleanupTempDockerfile(dockerfilePath: string): void {
  try {
    if (fs.existsSync(dockerfilePath) && dockerfilePath.includes(".dockforge")) {
      fs.unlinkSync(dockerfilePath);
    }
  } catch (error) {
    console.error("Failed to cleanup temp Dockerfile:", error);
  }
}

/**
 * Build Docker image with streaming output
 */
export async function buildDockerImage(
  options: BuildOptions,
  onOutput?: (line: string) => void,
  onProgress?: (stage: string, progress: number) => void
): Promise<BuildResult> {
  const output = getDockerOutputChannel();
  output.show(true);
  output.appendLine(`\n${"=".repeat(60)}`);
  output.appendLine(`🔨 Building Docker Image: ${options.imageName}:${options.imageTag}`);
  output.appendLine(`${"=".repeat(60)}\n`);

  const logs: string[] = [];
  let tempDockerfilePath: string | undefined;

  try {
    // Determine Dockerfile path
    let dockerfilePath: string;
    
    if (options.dockerfileContent) {
      // Generate temporary Dockerfile from pre-generated content
      tempDockerfilePath = await createTempDockerfile(
        options.dockerfileContent,
        options.contextPath,
        Date.now().toString()
      );
      dockerfilePath = tempDockerfilePath;
      output.appendLine(`📄 Using Dockerfile from DockForge`);
    } else if (options.dockerfile) {
      dockerfilePath = options.dockerfile;
      output.appendLine(`📄 Using existing Dockerfile: ${dockerfilePath}`);
    } else {
      throw new Error("No Dockerfile or Dockerfile content provided");
    }

    // Build docker build command arguments
    const args: string[] = ["build"];
    
    // Add tag
    args.push("-t", `${options.imageName}:${options.imageTag}`);
    
    // Add Dockerfile path
    args.push("-f", dockerfilePath);
    
    // Add optional flags
    if (options.noCache) {
      args.push("--no-cache");
    }
    
    if (options.pull) {
      args.push("--pull");
    }
    
    if (options.target) {
      args.push("--target", options.target);
    }
    
    if (options.platform) {
      args.push("--platform", options.platform);
    }
    
    // Add build args
    if (options.buildArgs) {
      for (const [key, value] of Object.entries(options.buildArgs)) {
        args.push("--build-arg", `${key}=${value}`);
      }
    }
    
    // Add context path
    args.push(options.contextPath);

    output.appendLine(`🐳 Running: docker ${args.join(" ")}\n`);

    // Execute docker build
    const result = await executeDockerCommand(args, output, logs, onOutput, onProgress);

    if (result.success) {
      output.appendLine(`\n✅ Build successful: ${options.imageName}:${options.imageTag}`);
      vscode.window.showInformationMessage(
        `Successfully built ${options.imageName}:${options.imageTag}`
      );
    } else {
      output.appendLine(`\n❌ Build failed`);
      vscode.window.showErrorMessage(`Build failed: ${result.error}`);
    }

    return {
      success: result.success,
      imageId: result.imageId,
      error: result.error,
      logs,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    output.appendLine(`\n❌ Error: ${errorMessage}`);
    logs.push(`Error: ${errorMessage}`);
    
    return {
      success: false,
      error: errorMessage,
      logs,
    };
  } finally {
    // Cleanup temporary Dockerfile
    if (tempDockerfilePath) {
      cleanupTempDockerfile(tempDockerfilePath);
    }
  }
}

/**
 * Run Docker container with streaming output
 */
export async function runDockerContainer(
  options: RunOptions,
  onOutput?: (line: string) => void
): Promise<RunResult> {
  const output = getDockerOutputChannel();
  output.show(true);
  output.appendLine(`\n${"=".repeat(60)}`);
  output.appendLine(`🚀 Running Container: ${options.imageName}:${options.imageTag}`);
  output.appendLine(`${"=".repeat(60)}\n`);

  const logs: string[] = [];

  try {
    const args: string[] = ["run"];
    
    // Container name
    if (options.containerName) {
      args.push("--name", options.containerName);
    }
    
    // Detached mode
    if (options.detached) {
      args.push("-d");
    }
    
    // Remove after exit
    if (options.remove) {
      args.push("--rm");
    }
    
    // Interactive and TTY
    if (options.interactive) {
      args.push("-i");
    }
    if (options.tty) {
      args.push("-t");
    }
    
    // Port mappings
    if (options.portMappings) {
      for (const port of options.portMappings) {
        args.push("-p", port);
      }
    }
    
    // Environment variables
    if (options.envVariables) {
      for (const [key, value] of Object.entries(options.envVariables)) {
        args.push("-e", `${key}=${value}`);
      }
    }
    
    // Volumes
    if (options.volumes) {
      for (const volume of options.volumes) {
        args.push("-v", volume);
      }
    }
    
    // Working directory
    if (options.workingDir) {
      args.push("-w", options.workingDir);
    }
    
    // Network
    if (options.network) {
      args.push("--network", options.network);
    }
    
    // Image
    args.push(`${options.imageName}:${options.imageTag}`);

    output.appendLine(`🐳 Running: docker ${args.join(" ")}\n`);

    const result = await executeDockerCommand(args, output, logs, onOutput);

    if (result.success) {
      output.appendLine(`\n✅ Container started successfully`);
      if (result.containerId) {
        output.appendLine(`   Container ID: ${result.containerId}`);
      }
      vscode.window.showInformationMessage(
        `Container started: ${options.containerName || result.containerId}`
      );
    } else {
      output.appendLine(`\n❌ Failed to start container`);
      vscode.window.showErrorMessage(`Failed to start container: ${result.error}`);
    }

    return {
      success: result.success,
      containerId: result.containerId,
      containerName: options.containerName,
      error: result.error,
      logs,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    output.appendLine(`\n❌ Error: ${errorMessage}`);
    logs.push(`Error: ${errorMessage}`);
    
    return {
      success: false,
      error: errorMessage,
      logs,
    };
  }
}

/**
 * Execute Docker command with streaming output
 */
function executeDockerCommand(
  args: string[],
  output: vscode.OutputChannel,
  logs: string[],
  onOutput?: (line: string) => void,
  onProgress?: (stage: string, progress: number) => void
): Promise<{ success: boolean; error?: string; imageId?: string; containerId?: string }> {
  return new Promise((resolve) => {
    const dockerProcess: ChildProcess = spawn("docker", args, {
      shell: true,
      env: { ...process.env, DOCKER_BUILDKIT: "1" }, // eslint-disable-line @typescript-eslint/naming-convention
    });

    let imageId: string | undefined;
    let containerId: string | undefined;
    let errorOutput = "";

    dockerProcess.stdout?.on("data", (data: Buffer) => {
      const lines = data.toString().split("\n").filter(Boolean);
      
      for (const line of lines) {
        output.appendLine(line);
        logs.push(line);
        onOutput?.(line);

        // Parse build progress for multi-stage builds
        const stageRegex = /Step (\d+)\/(\d+)\s*:\s*(.+)/i;
        const stageMatch = stageRegex.exec(line);
        if (stageMatch && onProgress) {
          const [, current, total, instruction] = stageMatch;
          const progress = (Number.parseInt(current, 10) / Number.parseInt(total, 10)) * 100;
          onProgress(instruction, progress);
        }

        // Capture image ID from build output
        const imageIdRegex = /Successfully built ([a-f0-9]+)/i;
        const imageIdMatch = imageIdRegex.exec(line);
        if (imageIdMatch) {
          imageId = imageIdMatch[1];
        }

        // Capture container ID from run output
        const containerIdRegex = /^([a-f0-9]{64})$/i;
        const containerIdMatch = containerIdRegex.exec(line);
        if (containerIdMatch) {
          containerId = containerIdMatch[1].substring(0, 12);
        }
      }
    });

    dockerProcess.stderr?.on("data", (data: Buffer) => {
      const lines = data.toString().split("\n").filter(Boolean);
      
      for (const line of lines) {
        // Docker BuildKit sends normal output to stderr, so don't prefix it as error
        // Only add [stderr] prefix for actual error messages
        const isError = line.toLowerCase().includes("error") || 
                       line.toLowerCase().includes("failed") ||
                       line.toLowerCase().includes("cannot");
        
        const displayLine = isError ? `[stderr] ${line}` : line;
        output.appendLine(displayLine);
        logs.push(line);
        
        // Only accumulate actual errors
        if (isError) {
          errorOutput += line + "\n";
        }
        
        onOutput?.(line);
      }
    });

    dockerProcess.on("close", (code: number | null) => {
      if (code === 0) {
        resolve({ success: true, imageId, containerId });
      } else {
        resolve({ 
          success: false, 
          error: errorOutput || `Process exited with code ${code}` 
        });
      }
    });

    dockerProcess.on("error", (error: Error) => {
      resolve({ success: false, error: error.message });
    });
  });
}

/**
 * Test build - validates Dockerfile can be built without creating final image
 */
export async function testBuild(
  options: BuildOptions,
  onOutput?: (line: string) => void
): Promise<BuildResult> {
  const output = getDockerOutputChannel();
  output.appendLine(`\n🧪 Test Build: ${options.imageName}:${options.imageTag}`);
  
  // For test build, we use --no-cache to ensure fresh build
  // and could add --target to stop at a specific stage
  return buildDockerImage(
    { 
      ...options, 
      imageTag: `${options.imageTag}-test-${Date.now()}`,
      noCache: true 
    },
    onOutput
  );
}

/**
 * Build and run in one operation
 */
export async function buildAndRun(
  buildOptions: BuildOptions,
  runOptions: Omit<RunOptions, "imageName" | "imageTag">,
  onOutput?: (line: string) => void
): Promise<{ build: BuildResult; run?: RunResult }> {
  // First, build the image
  const buildResult = await buildDockerImage(buildOptions, onOutput);
  
  if (!buildResult.success) {
    return { build: buildResult };
  }
  
  // Then, run the container
  const runResult = await runDockerContainer(
    {
      ...runOptions,
      imageName: buildOptions.imageName,
      imageTag: buildOptions.imageTag,
    },
    onOutput
  );
  
  return { build: buildResult, run: runResult };
}
