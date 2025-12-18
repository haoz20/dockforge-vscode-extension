import * as vscode from 'vscode';
import { DockForgePanel } from './panels/DockForgePanel';
class DockerfileTreeItem extends vscode.TreeItem {
    public webViewPanel?: DockForgePanel;

    constructor(
        public readonly label: string,
        public readonly id: string
    ) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.contextValue = 'dockerfileItem';
        this.iconPath = new vscode.ThemeIcon('package');
        this.tooltip = `Dockerfile: ${label}`;
        
        // Add command to open when clicked
        this.command = {
            command: 'dockforge.openDockerfileBuilder',
            title: 'Open Dockerfile',
            arguments: [this]
        };
    }
}

export { DockerfileTreeItem };