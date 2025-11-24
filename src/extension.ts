import { commands, ExtensionContext } from "vscode";
import { DockForgePanel } from "./panels/DockForgePanel";

export function activate(context: ExtensionContext) {
  // Create the show DockForge command
  const showDockForgeCommand = commands.registerCommand("dockforge.showDockForge", () => {
    DockForgePanel.render(context.extensionUri);
  });

  // Add command to the extension context
  context.subscriptions.push(showDockForgeCommand);
}