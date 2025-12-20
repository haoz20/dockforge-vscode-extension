import { commands, ExtensionContext, window, workspace } from "vscode";
import { DockForgePanel } from "./panels/DockForgePanel";
import { DockerHubViewProvider } from "./DockerHubViewProvider";
import { DockerHubPanel } from "./panels/DockerHubPanel";
import { DockerfileTreeDataProvider } from "./DockerfileTreeDataProvider";


export function activate(context: ExtensionContext) {
  console.log("DockForge extension is now active!");

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

  // Create the show DockForge command (opens the main panel)
  const showDockForgeCommand = commands.registerCommand(
    "dockforge.showDockForge",
    (projectName?: string) => {
      console.log("Opening DockForge panel for project:", projectName);
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
          await dockerfileTreeDataProvider.removeDockerfile(treeItem.label);
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
    window.registerWebviewViewProvider(
      DockerHubViewProvider.viewType,
      dockerHubViewProvider
    )
  );
}
