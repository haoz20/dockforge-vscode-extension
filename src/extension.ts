import { commands, ExtensionContext, window } from "vscode";
import { DockForgePanel } from "./panels/DockForgePanel";
import { DockerfilesViewProvider } from "./DockerfilesViewProvider";
import { DockerHubViewProvider } from "./DockerHubViewProvider";
import { DockerHubPanel } from "./panels/DockerHubPanel";


export function activate(context: ExtensionContext) {
  console.log('DockForge extension is now active!');

  // Register the webview view provider for Build Dockerfiles sidebar
  const dockerfilesViewProvider = new DockerfilesViewProvider(context.extensionUri);
  context.subscriptions.push(
    window.registerWebviewViewProvider(
      DockerfilesViewProvider.viewType,
      dockerfilesViewProvider
    )
  );

  const dockerHubViewProvider = new DockerHubViewProvider(context.extensionUri);
  context.subscriptions.push(
    window.registerWebviewViewProvider(
      DockerHubViewProvider.viewType,
      dockerHubViewProvider
    )
  );

  // Create the show DockForge command (opens the main panel)
  const showDockForgeCommand = commands.registerCommand("dockforge.showDockForge", (projectName?: string) => {
    console.log('Opening DockForge panel for project:', projectName);
    DockForgePanel.render(context.extensionUri);
  });

  const showDockerHubCommand = commands.registerCommand("dockforge.showDockerHub", (projectName?: string) => {
    console.log('Opening Docker Hub Sign-in panel for project:', projectName);
    DockerHubPanel.render(context.extensionUri);
  });

  // Add command to the extension context
  context.subscriptions.push(showDockerHubCommand);
  context.subscriptions.push(showDockForgeCommand);
}