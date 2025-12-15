import { commands, ExtensionContext, window, workspace } from "vscode";
import { DockForgePanel } from "./panels/DockForgePanel";
import { DockerHubViewProvider } from "./DockerHubViewProvider";
import { DockerHubPanel } from "./panels/DockerHubPanel";
import { DockerfileTreeDataProvider } from "./DockerfileTreeDataProvider";
import { checkDockerInstalled } from "./utilities/dockerCheck";
import { promptInstallDocker } from "./utilities/dockerCheck";

export async function activate(context: ExtensionContext) {
  console.log("DockForge extension is now active!");

  const dockerInstalled = await checkDockerInstalled();
  if (!dockerInstalled) {
    await promptInstallDocker();
    return; // Exit activation if Docker is not installed
  }

  // Get workspace root
  const workspaceRoot = workspace.workspaceFolders?.[0]?.uri.fsPath || "";

  const dockerHubViewProvider = new DockerHubViewProvider(context.extensionUri);
  

  // Create tree data provider for Dockerfiles
  const dockerfileTreeDataProvider = new DockerfileTreeDataProvider(workspaceRoot);

  // Register the tree view
  const dockerfilesView = window.createTreeView("dockforge-dockerfilesview", {
    treeDataProvider: dockerfileTreeDataProvider,
  });

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

      DockForgePanel.render(context.extensionUri);
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
      console.log("Opening Dockerfile Builder for:", treeItem?.label);
      DockForgePanel.render(context.extensionUri);
    }
  );

  // Add refresh command
  const refreshCommand = commands.registerCommand("dockforge.refreshDockerfiles", () => {
    dockerfileTreeDataProvider.refresh();
  });

  // Delete Dockerfile command
  const deleteDockerfileCommand = commands.registerCommand(
    "dockforge.deleteDockerfile",
    (treeItem: any) => {
      if (treeItem && treeItem.label) {
        try {
          dockerfileTreeDataProvider.removeDockerfile(treeItem.label);
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
      // Add the new Dockerfile to the tree view
      dockerfileTreeDataProvider.addDockerfile(dockerfileName.trim()); // Later can add description for custom or import files

      // Open the builder panel
      DockForgePanel.render(context.extensionUri);

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
    window.registerWebviewViewProvider(
      DockerHubViewProvider.viewType,
      dockerHubViewProvider
    )
  );
}

