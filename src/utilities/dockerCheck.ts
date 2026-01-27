import * as vscode from "vscode";
import { exec } from "child_process";

/**
 * Check whether Docker CLI is installed
 */
export function checkDockerInstalled(): Promise<boolean> {
  return new Promise((resolve) => {
    exec("docker --version", (error) => {
      resolve(!error); // use !error for production
    });
  });
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
  return new Promise((resolve) => {
    exec("docker info", (error) => {
      resolve(!error);
    });
  });
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