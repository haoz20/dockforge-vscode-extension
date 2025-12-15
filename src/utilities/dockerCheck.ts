import * as vscode from "vscode";
import { exec } from "child_process";

export function checkDockerInstalled(): Promise<boolean> {
  return new Promise((resolve) => {
    exec("docker --version", (error) => {
      resolve(!error); // set to false to test in local and change to !error for production
    });
  });   
}

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
