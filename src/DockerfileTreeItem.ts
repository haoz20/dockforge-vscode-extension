import * as vscode from 'vscode';


class DockerfileTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly filePath: string
    ) {
        super(label);
        this.contextValue = 'dockerfileItem';
        this.iconPath = new vscode.ThemeIcon('file-code');
    }
}

export { DockerfileTreeItem };