import * as vscode from "vscode";
import { dockerExec } from "./dockerPath";

/**
 * Check whether Docker CLI is installed
 */
export function checkDockerInstalled(): Promise<boolean> {
  return dockerExec("docker --version")
    .then(() => true)
    .catch(() => false);
}

/**
 * Prompt user to install Docker if not installed
 */
export async function promptInstallDocker() {
  const choice = await vscode.window.showWarningMessage(
    "Docker is not installed on your system. DockForge requires Docker to work properly.",
    { modal: true },
    "Download Docker"
  );

  if (choice === "Download Docker") {
    vscode.env.openExternal(
      vscode.Uri.parse("https://www.docker.com/products/docker-desktop/")
    );
  }
}

/**
 * Check whether Docker daemon (Docker Desktop) is running
 */
export function checkDockerRunning(): Promise<boolean> {
  return dockerExec("docker info")
    .then(() => true)
    .catch(() => false);
}

/**
 * Unified guard function to ensure Docker is ready before build/run
 */
export async function ensureDockerReady(): Promise<boolean> {
  const installed = await checkDockerInstalled();
  if (!installed) {
    await promptInstallDocker();
    return false;
  }

  const running = await checkDockerRunning();
  if (!running) {
    vscode.window.showErrorMessage(
      "Docker is installed but not running. Please start Docker Desktop and try again."
    );
    return false;
  }

  return true;
}