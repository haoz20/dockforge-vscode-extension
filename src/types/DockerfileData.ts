/**
 * Comprehensive data structure for storing complete Dockerfile configurations
 * This schema covers all aspects of a Dockerfile including multi-stage builds,
 * build context, runtime configuration, and metadata.
 */

/**
 * Represents a single Dockerfile instruction/command
 */
export interface DockerCommand {
  id: string;
  type: DockerCommandType;
  value: string;
  comment?: string;
}

/**
 * All supported Dockerfile instruction types
 */
export type DockerCommandType =
  | "ADD"
  | "ARG"
  | "CMD"
  | "COPY"
  | "ENTRYPOINT"
  | "ENV"
  | "EXPOSE"
  | "FROM"
  | "HEALTHCHECK"
  | "LABEL"
  | "MAINTAINER"
  | "ONBUILD"
  | "RUN"
  | "SHELL"
  | "STOPSIGNAL"
  | "USER"
  | "VOLUME"
  | "WORKDIR";

/**
 * Represents a single build stage in a multi-stage Dockerfile
 */
export interface DockerStage {
  id: string;
  baseImage: string;
  stageName?: string;
  platform?: string; // e.g., "linux/amd64", "linux/arm64"
  commands: DockerCommand[];
}

/**
 * Build arguments that can be passed during docker build
 */
export interface BuildArgument {
  key: string;
  value: string;
  description?: string;
}

/**
 * Environment variables configuration
 */
export interface EnvironmentVariable {
  key: string;
  value: string;
  description?: string;
}

/**
 * Port mapping configuration
 */
export interface PortMapping {
  containerPort: number;
  hostPort?: number;
  protocol?: "tcp" | "udp";
  description?: string;
}

/**
 * Volume mount configuration
 */
export interface VolumeMount {
  containerPath: string;
  hostPath?: string;
  mode?: "rw" | "ro"; // read-write or read-only
  description?: string;
}

/**
 * Network configuration
 */
export interface NetworkConfig {
  mode?: "bridge" | "host" | "none" | "container" | string;
  customNetwork?: string;
  aliases?: string[];
}

/**
 * Resource limits and constraints
 */
export interface ResourceLimits {
  cpus?: string; // e.g., "0.5", "2"
  memory?: string; // e.g., "512m", "2g"
  memorySwap?: string;
  memoryReservation?: string;
  cpuShares?: number;
  cpuPeriod?: number;
  cpuQuota?: number;
}

/**
 * Health check configuration
 */
export interface HealthCheckConfig {
  test: string; // e.g., "CMD curl -f http://localhost/ || exit 1"
  interval?: string; // e.g., "30s"
  timeout?: string; // e.g., "3s"
  startPeriod?: string; // e.g., "5s"
  retries?: number;
}

/**
 * Restart policy configuration
 */
export interface RestartPolicy {
  condition: "no" | "on-failure" | "always" | "unless-stopped";
  maxRetries?: number;
}

/**
 * Build context and configuration
 */
export interface BuildContext {
  contextPath?: string; // Path to build context, default "."
  dockerfilePath?: string; // Path to Dockerfile, default "Dockerfile"
  buildArgs?: BuildArgument[];
  target?: string; // Target stage for multi-stage builds
  noCache?: boolean;
  pull?: boolean; // Always pull base images
  platform?: string; // Target platform
  labels?: Record<string, string>;
  tags?: string[]; // Image tags
}

/**
 * Runtime configuration for running the container
 */
export interface RuntimeConfig {
  imageName: string;
  imageTag?: string;
  containerName?: string;
  entrypoint?: string[];
  cmd?: string[];
  environmentVariables?: EnvironmentVariable[];
  portMappings?: PortMapping[];
  volumeMounts?: VolumeMount[];
  network?: NetworkConfig;
  resources?: ResourceLimits;
  healthCheck?: HealthCheckConfig;
  restartPolicy?: RestartPolicy;
  workingDir?: string;
  user?: string;
  hostname?: string;
  interactive?: boolean; // -i flag
  tty?: boolean; // -t flag
  detached?: boolean; // -d flag
  remove?: boolean; // --rm flag
  privileged?: boolean;
  readOnly?: boolean;
  securityOpts?: string[];
  capAdd?: string[]; // Capabilities to add
  capDrop?: string[]; // Capabilities to drop
}

/**
 * Metadata about the Dockerfile project
 */
export interface DockerfileMetadata {
  name: string;
  description?: string;
  author?: string;
  version?: string;
  createdAt: string; // ISO 8601 date string
  updatedAt: string; // ISO 8601 date string
  tags?: string[]; // User-defined tags for organization
  projectType?: string; // e.g., "node", "python", "java", "go"
  framework?: string; // e.g., "express", "django", "spring", "gin"
  notes?: string;
}

/**
 * Docker Compose service configuration (for future integration)
 */
export interface ComposeService {
  serviceName: string;
  build?: {
    context: string;
    dockerfile?: string;
    args?: BuildArgument[];
    target?: string;
  };
  image?: string;
  environment?: EnvironmentVariable[];
  ports?: PortMapping[];
  volumes?: VolumeMount[];
  dependsOn?: string[];
  networks?: string[];
  command?: string;
  entrypoint?: string;
}

/**
 * Complete Dockerfile configuration data structure
 * This is the root object that gets saved as JSON
 */
export interface DockerfileData {
  id: string;
  metadata: DockerfileMetadata;
  stages: DockerStage[];
  buildContext?: BuildContext;
  runtime?: RuntimeConfig;
  compose?: ComposeService[]; // For multi-container setups
}

/**
 * Storage format for tree items
 */
export interface StoredDockerfile {
  id: string;
  label: string;
  description?: string;
  data?: DockerfileData; // The complete Dockerfile configuration
  filePath?: string; // Optional: path to physical Dockerfile
}

/**
 * Type guard to check if data is valid DockerfileData
 */
export function isDockerfileData(obj: any): obj is DockerfileData {
  return (
    obj &&
    typeof obj === "object" &&
    typeof obj.id === "string" &&
    obj.metadata &&
    typeof obj.metadata === "object" &&
    Array.isArray(obj.stages)
  );
}

/**
 * Helper function to create a new empty Dockerfile data structure
 */
export function createEmptyDockerfileData(name: string): DockerfileData {
  const now = new Date().toISOString();
  return {
    id: `dockerfile-${Date.now()}`,
    metadata: {
      name,
      createdAt: now,
      updatedAt: now,
    },
    stages: [],
  };
}

/**
 * Helper function to create a default Dockerfile data structure with one stage
 */
export function createDefaultDockerfileData(name: string): DockerfileData {
  const now = new Date().toISOString();
  return {
    id: `dockerfile-${Date.now()}`,
    metadata: {
      name,
      createdAt: now,
      updatedAt: now,
    },
    stages: [
      {
        id: "stage-1",
        baseImage: "node:18-alpine",
        commands: [],
      },
    ],
    buildContext: {
      contextPath: ".",
      dockerfilePath: "Dockerfile",
      noCache: false,
      pull: false,
    },
    runtime: {
      imageName: name.toLowerCase().replace(/\s+/g, "-"),
      imageTag: "latest",
    },
  };
}
