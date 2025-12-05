import * as vscode from 'vscode';


class DockerfileTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly id: string
    ) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.contextValue = 'dockerfileItem';
        this.iconPath = new vscode.ThemeIcon('whale');
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