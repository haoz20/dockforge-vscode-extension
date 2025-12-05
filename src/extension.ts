import { commands, ExtensionContext, window, workspace } from "vscode";
import { DockForgePanel } from "./panels/DockForgePanel";
import { DockerfileTreeDataProvider } from "./DockerfileTreeDataProvider";

export function activate(context: ExtensionContext) {
  console.log('DockForge extension is now active!');

  // Get workspace root
  const workspaceRoot = workspace.workspaceFolders?.[0]?.uri.fsPath || '';

  // Create tree data provider for Dockerfiles
  const dockerfileTreeDataProvider = new DockerfileTreeDataProvider(workspaceRoot);
  
  // Register the tree view
  const dockerfilesView = window.createTreeView('dockforge-dockerfilesview', {
    treeDataProvider: dockerfileTreeDataProvider
  });

  // Create the show DockForge command (opens the main panel)
  const showDockForgeCommand = commands.registerCommand("dockforge.showDockForge", (projectName?: string) => {
    console.log('Opening DockForge panel for project:', projectName);
    DockForgePanel.render(context.extensionUri);
  });

  // Command to open Dockerfile Builder when clicking tree item
  const openDockerfileBuilderCommand = commands.registerCommand("dockforge.openDockerfileBuilder", (treeItem?: any) => {
    console.log('Opening Dockerfile Builder for:', treeItem?.label);
    DockForgePanel.render(context.extensionUri);
  });

  // Add refresh command
  const refreshCommand = commands.registerCommand("dockforge.refreshDockerfiles", () => {
    dockerfileTreeDataProvider.refresh();
  });

  // Delete Dockerfile command
  const deleteDockerfileCommand = commands.registerCommand("dockforge.deleteDockerfile", (treeItem: any) => {
    if (treeItem && treeItem.label) {
      try {
        dockerfileTreeDataProvider.removeDockerfile(treeItem.label);
        window.showInformationMessage(`Deleted: ${treeItem.label}`);
      } catch (error) {
        window.showErrorMessage(`Failed to delete: ${treeItem.label}. ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  });

  // Add Create New Dockerfile command
  const newDockerfileCommand = commands.registerCommand("dockforge.newDockerfile", async () => {
    // Show input box to get Dockerfile name
    const dockerfileName = await window.showInputBox({
      prompt: 'Enter Dockerfile name',
      placeHolder: 'e.g., Node.js App, Python Backend, etc.',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Dockerfile name cannot be empty';
        }
        return null;
      }
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
    showDockForgeCommand,
    openDockerfileBuilderCommand,
    deleteDockerfileCommand,
    refreshCommand,
    newDockerfileCommand,
    dockerfilesView
  );
}