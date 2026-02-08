import { commands, ExtensionContext, window, workspace, Uri, env } from "vscode";
import * as vscode from "vscode";
import { DockForgePanel } from "./panels/DockForgePanel";
import { DockerHubViewProvider } from "./DockerHubViewProvider";
import { DockerHubPanel } from "./panels/DockerHubPanel";
import { DockerfileTreeDataProvider } from "./DockerfileTreeDataProvider";
import { DockerImagesTreeDataProvider } from "./DockerImagesTreeDataProvider";
import { checkDockerInstalled } from "./utilities/dockerCheck";
import { promptInstallDocker } from "./utilities/dockerCheck";

export function activate(context: ExtensionContext) {
  console.log("DockForge extension is now active!");

  checkDockerInstalled().then((installed) => {
    if (!installed) {
      promptInstallDocker(); // inform user on activation once 
    }
  });

  // Get workspace root
  const workspaceRoot = workspace.workspaceFolders?.[0]?.uri.fsPath || "";

  const dockerHubViewProvider = new DockerHubViewProvider(context.extensionUri);
  

  // Create tree data provider for Dockerfiles with global state memento for persistence
  const dockerfileTreeDataProvider = new DockerfileTreeDataProvider(
    workspaceRoot, 
    context.extensionUri,
    context.globalState
  );

  // Register the tree view
  const dockerfilesView = window.createTreeView("dockforge-dockerfilesview", {
    treeDataProvider: dockerfileTreeDataProvider,
  });

  // Create Docker Images tree data provider
  const dockerImagesTreeDataProvider = new DockerImagesTreeDataProvider();
  const dockerImagesView = window.createTreeView("dockforge-docker-images-view", {
    treeDataProvider: dockerImagesTreeDataProvider,
    showCollapseAll: true,
  });

  // Make the provider globally accessible for refresh after builds
  (global as any).dockerImagesTreeDataProvider = dockerImagesTreeDataProvider;

  // Create the show DockForge command (opens the main panel)
  const showDockForgeCommand = commands.registerCommand(
    "dockforge.showDockForge",
    async (projectName?: string) => {
      console.log("Opening DockForge panel for project:", projectName);

      const dockerInstalled = await checkDockerInstalled();

      if (!dockerInstalled) {
        await promptInstallDocker();
        return;
      }

      // Use a generic ID for command palette access
      DockForgePanel.render(context.extensionUri, "default", "Dockerfile");
    }
  );

  const showDockerHubCommand = commands.registerCommand("dockforge.showDockerHub", (projectName?: string) => {
    console.log('Opening Docker Hub Sign-in panel for project:', projectName);
    DockerHubPanel.render(context.extensionUri);
  });
  
  context.subscriptions.push(showDockForgeCommand);
  // Command to open Dockerfile Builder when clicking tree item
  const openDockerfileBuilderCommand = commands.registerCommand(
    "dockforge.openDockerfileBuilder",
    (treeItem?: any) => {
      if (treeItem) {
        console.log("Opening Dockerfile Builder for:", treeItem.label);
        dockerfileTreeDataProvider.openDockerfileBuilder(treeItem);
      }
    }
  );

  // Add refresh command
  const refreshCommand = commands.registerCommand("dockforge.refreshDockerfiles", () => {
    dockerfileTreeDataProvider.refresh();
  });

  // Delete Dockerfile command
  const deleteDockerfileCommand = commands.registerCommand(
    "dockforge.deleteDockerfile",
    async (treeItem: any) => {
      if (treeItem && treeItem.label) {
        try {
          await dockerfileTreeDataProvider.removeDockerfile(treeItem.id);
          window.showInformationMessage(`Deleted: ${treeItem.label}`);
        } catch (error) {
          window.showErrorMessage(
            `Failed to delete ${treeItem.label}: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }
    }
  );

  // Add Create New Dockerfile command
  const newDockerfileCommand = commands.registerCommand("dockforge.newDockerfile", async () => {
    // Show input box to get Dockerfile name
    const dockerfileName = await window.showInputBox({
      prompt: "Enter Dockerfile name",
      placeHolder: "e.g., Node.js App, Python Backend, etc.",
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return "Dockerfile name cannot be empty";
        }
        return null;
      },
    });

    if (dockerfileName) {
      // Add the new Dockerfile to the tree view and get the tree item
      const newItem = await dockerfileTreeDataProvider.addDockerfile(dockerfileName.trim());

      // Automatically open the builder for the new Dockerfile
      dockerfileTreeDataProvider.openDockerfileBuilder(newItem);

      window.showInformationMessage(`Created: ${dockerfileName}`);
    }
  });

  // Add subscriptions to context
  context.subscriptions.push(
    showDockerHubCommand,
    showDockForgeCommand,
    openDockerfileBuilderCommand,
    deleteDockerfileCommand,
    refreshCommand,
    newDockerfileCommand,
    dockerfilesView,
    dockerImagesView,
    window.registerWebviewViewProvider(
      DockerHubViewProvider.viewType,
      dockerHubViewProvider
    )
  );

  // Register Docker Images commands
  const refreshImagesCommand = commands.registerCommand(
    "dockforge.refreshDockerImages",
    () => dockerImagesTreeDataProvider.refresh()
  );

  const runImageCommand = commands.registerCommand(
    "dockforge.runImage",
    async (image: any) => {
      await dockerImagesTreeDataProvider.runContainer(image);
    }
  );

  const deleteImageCommand = commands.registerCommand(
    "dockforge.deleteImage",
    async (image: any) => {
      await dockerImagesTreeDataProvider.deleteImage(image.imageId);
    }
  );

  const stopContainerCommand = commands.registerCommand(
    "dockforge.stopContainer",
    async (containerId: string) => {
      await dockerImagesTreeDataProvider.stopContainer(containerId);
    }
  );

  const openInDockerDesktopCommand = commands.registerCommand(
    "dockforge.openInDockerDesktop",
    async (containerId: string) => {
      // Show quick pick with options
      const action = await window.showQuickPick(
        [
          { label: "$(terminal) View Container Logs", value: "logs" },
          { label: "$(info) Show Container Details", value: "inspect" },
          { label: "$(copy) Copy Container ID", value: "copy" },
          { label: "$(link-external) Try Open Docker Desktop", value: "desktop" }
        ],
        { placeHolder: `Container: ${containerId.substring(0, 12)}` }
      );

      if (!action) {
        return;
      }

      switch (action.value) {
        case "logs":
          // Open terminal showing container logs
          const terminal = window.createTerminal(`Container Logs: ${containerId.substring(0, 12)}`);
          terminal.show();
          terminal.sendText(`docker logs -f ${containerId}`);
          break;

        case "inspect":
          // Show container details in output channel
          const { exec } = require("child_process");
          const { promisify } = require("util");
          const execAsync = promisify(exec);
          
          try {
            const { stdout } = await execAsync(`docker inspect ${containerId}`);
            const details = JSON.parse(stdout)[0];
            
            const info = `
Container Details
=================
ID: ${details.Id.substring(0, 12)}
Name: ${details.Name.replace("/", "")}
Image: ${details.Config.Image}
Status: ${details.State.Status}
Created: ${details.Created}
Ports: ${JSON.stringify(details.NetworkSettings.Ports, null, 2)}
Networks: ${Object.keys(details.NetworkSettings.Networks).join(", ")}
            `.trim();
            
            const outputChannel = vscode.window.createOutputChannel("Docker Container Details");
            outputChannel.clear();
            outputChannel.appendLine(info);
            outputChannel.show();
          } catch (error) {
            window.showErrorMessage(`Failed to inspect container: ${error}`);
          }
          break;

        case "copy":
          // Copy container ID to clipboard
          await env.clipboard.writeText(containerId);
          window.showInformationMessage(`Container ID copied: ${containerId.substring(0, 12)}`);
          break;

        case "desktop":
          // Try to open Docker Desktop (may not work on all systems)
          try {
            const url = `docker-desktop://dashboard/containers/${containerId}`;
            const uri = Uri.parse(url);
            await env.openExternal(uri);
          } catch (error) {
            window.showWarningMessage(
              "Unable to open Docker Desktop. Use 'docker ps' in terminal to view containers.",
              "Open Terminal"
            ).then(selection => {
              if (selection === "Open Terminal") {
                const term = window.createTerminal("Docker");
                term.show();
                term.sendText("docker ps");
              }
            });
          }
          break;
      }
    }
  );

  context.subscriptions.push(
    refreshImagesCommand,
    runImageCommand,
    deleteImageCommand,
    stopContainerCommand,
    openInDockerDesktopCommand
  );
}

