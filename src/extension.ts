import { commands, ExtensionContext } from "vscode";
import { DockForgePanel } from "./panels/DockForgePanel";

export function activate(context: ExtensionContext) {
  console.log('DockForge extension is now active!');

  // Create the show DockForge command (opens the main panel)
  const showDockForgeCommand = commands.registerCommand("dockforge.showDockForge", (projectName?: string) => {
    console.log('Opening DockForge panel for project:', projectName);
    DockForgePanel.render(context.extensionUri);
  });

  // Add command to the extension context
  context.subscriptions.push(showDockForgeCommand);
}