import * as vscode from 'vscode';
import { DockForgePanel } from './panels/DockForgePanel';
import { DockerfileData } from './types/DockerfileData';

class DockerfileTreeItem extends vscode.TreeItem {
    public webViewPanel?: DockForgePanel;
    public data?: DockerfileData;

    constructor(
        public readonly label: string,
        public readonly id: string,
        data?: DockerfileData
    ) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.contextValue = 'dockerfileItem';
        this.iconPath = new vscode.ThemeIcon('package');
        this.tooltip = `Dockerfile: ${label}`;
        this.data = data;
        
        // Add command to open when clicked
        this.command = {
            command: 'dockforge.openDockerfileBuilder',
            title: 'Open Dockerfile',
            arguments: [this]
        };
    }
}

export { DockerfileTreeItem };