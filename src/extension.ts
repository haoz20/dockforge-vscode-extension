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

  // Add refresh command
  const refreshCommand = commands.registerCommand("dockforge.refreshDockerfiles", () => {
    dockerfileTreeDataProvider.refresh();
  });

  // Add Create New Dockerfile command
  const newDockerfileCommand = commands.registerCommand("dockforge.newDockerfile", () => {
    DockForgePanel.render(context.extensionUri);
  });

  // Add subscriptions to context
  context.subscriptions.push(
    showDockForgeCommand,
    refreshCommand,
    newDockerfileCommand,
    dockerfilesView
  );
}