import { commands, ExtensionContext, window } from "vscode";
import { DockForgePanel } from "./panels/DockForgePanel";
import { DockerHubPanel } from "./panels/DockerHubPanel";
import { DockerfilesViewProvider } from "./views/DockerfilesViewProvider";


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

  // Create the show DockForge command (opens the main panel)
  const showDockForgeCommand = commands.registerCommand("dockforge.showDockForge", (projectName?: string) => {
    console.log('Opening DockForge panel for project:', projectName);
    DockForgePanel.render(context.extensionUri);
  });

  
  const showDockerHubCommand = commands.registerCommand(
    "dockforge.showDockerHub",
    (projectName?: string) => {
      DockerHubPanel.render(context.extensionUri);
    }
  );
context
.subscriptions.push(showDockerHubCommand);



  // Add command to the extension context
  context.subscriptions.push(showDockForgeCommand);
}