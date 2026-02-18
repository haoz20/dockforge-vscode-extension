import * as fs from "fs";
import * as path from "path";
import { exec, spawn, ExecOptions, SpawnOptions, ChildProcess } from "child_process";
import { promisify } from "util";

/**
 * Common Docker CLI installation paths on macOS, Linux, and Windows.
 * VS Code's child_process may not inherit the user's interactive shell PATH,
 * so we probe these well-known locations to find the Docker binary.
 */
const DOCKER_SEARCH_PATHS = [
  "/usr/local/bin",
  "/opt/homebrew/bin",
  "/usr/bin",
  "/usr/local/sbin",
  "/opt/local/bin",
  // Docker Desktop for Mac symlinks
  "/Applications/Docker.app/Contents/Resources/bin",
  // Rancher Desktop
  path.join(
    process.env.HOME || "~",
    ".rd",
    "bin"
  ),
  // Snap on Linux
  "/snap/bin",
];

/** Cached resolved docker binary path */
let resolvedDockerPath: string | undefined;

/**
 * Build a PATH string that includes common Docker install directories
 * prepended to the current process PATH.
 */
export function getEnrichedPath(): string {
  const currentPath = process.env.PATH || "";
  const extraDirs = DOCKER_SEARCH_PATHS.filter(
    (dir) => !currentPath.split(path.delimiter).includes(dir)
  );
  return [...extraDirs, currentPath].join(path.delimiter);
}

/**
 * Return enriched environment variables with Docker paths in PATH.
 * Spread this into exec / spawn options: `{ env: getDockerEnv() }`
 */
export function getDockerEnv(extra?: Record<string, string>): NodeJS.ProcessEnv {
  return {
    ...process.env,
    ...extra,
    PATH: getEnrichedPath(), // eslint-disable-line @typescript-eslint/naming-convention
  };
}

/**
 * Resolve the absolute path to the `docker` binary.
 * Returns `"docker"` as fallback (will rely on the enriched PATH).
 */
export function resolveDockerPath(): string {
  if (resolvedDockerPath) {
    return resolvedDockerPath;
  }

  // Check well-known paths first
  for (const dir of DOCKER_SEARCH_PATHS) {
    const candidate = path.join(dir, "docker");
    if (fs.existsSync(candidate)) {
      resolvedDockerPath = candidate;
      return resolvedDockerPath;
    }
  }

  // Fallback – rely on enriched PATH
  resolvedDockerPath = "docker";
  return resolvedDockerPath;
}

/**
 * Get ExecOptions that include Docker-enriched PATH and an optional timeout.
 */
export function dockerExecOptions(overrides?: ExecOptions): ExecOptions {
  return {
    ...overrides,
    env: getDockerEnv(),
  };
}

/**
 * Convenience wrapper around `exec` with Docker-enriched PATH.
 */
export function dockerExec(
  command: string,
  options?: ExecOptions
): Promise<{ stdout: string; stderr: string }> {
  const execAsync = promisify(exec);
  return execAsync(command, dockerExecOptions(options));
}

/**
 * Convenience wrapper around `spawn` with Docker-enriched PATH.
 */
export function dockerSpawn(
  args: string[],
  options?: SpawnOptions
): ChildProcess {
  return spawn(resolveDockerPath(), args, {
    ...options,
    env: getDockerEnv(
      (options?.env as Record<string, string>) || undefined
    ),
  });
}
