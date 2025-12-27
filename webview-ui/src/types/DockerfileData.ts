/**
 * Webview-side copy of Dockerfile data types
 * Keep in sync with src/types/DockerfileData.ts
 */

export interface DockerCommand {
  id: string;
  type: DockerCommandType;
  value: string;
  comment?: string;
}

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

export interface DockerStage {
  id: string;
  baseImage: string;
  stageName?: string;
  platform?: string;
  commands: DockerCommand[];
}

export interface BuildArgument {
  key: string;
  value: string;
  description?: string;
}

export interface EnvironmentVariable {
  key: string;
  value: string;
  description?: string;
}

export interface PortMapping {
  containerPort: number;
  hostPort?: number;
  protocol?: "tcp" | "udp";
  description?: string;
}

export interface VolumeMount {
  containerPath: string;
  hostPath?: string;
  mode?: "rw" | "ro";
  description?: string;
}

export interface NetworkConfig {
  mode?: "bridge" | "host" | "none" | "container" | string;
  customNetwork?: string;
  aliases?: string[];
}

export interface ResourceLimits {
  cpus?: string;
  memory?: string;
  memorySwap?: string;
  memoryReservation?: string;
  cpuShares?: number;
  cpuPeriod?: number;
  cpuQuota?: number;
}

export interface HealthCheckConfig {
  test: string;
  interval?: string;
  timeout?: string;
  startPeriod?: string;
  retries?: number;
}

export interface RestartPolicy {
  condition: "no" | "on-failure" | "always" | "unless-stopped";
  maxRetries?: number;
}

export interface BuildContext {
  contextPath?: string;
  dockerfilePath?: string;
  buildArgs?: BuildArgument[];
  target?: string;
  noCache?: boolean;
  pull?: boolean;
  platform?: string;
  labels?: Record<string, string>;
  tags?: string[];
}

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
  interactive?: boolean;
  tty?: boolean;
  detached?: boolean;
  remove?: boolean;
  privileged?: boolean;
  readOnly?: boolean;
  securityOpts?: string[];
  capAdd?: string[];
  capDrop?: string[];
}

export interface DockerfileMetadata {
  name: string;
  description?: string;
  author?: string;
  version?: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  projectType?: string;
  framework?: string;
  notes?: string;
}

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

export interface DockerfileData {
  id: string;
  metadata: DockerfileMetadata;
  stages: DockerStage[];
  buildContext?: BuildContext;
  runtime?: RuntimeConfig;
  compose?: ComposeService[];
}
