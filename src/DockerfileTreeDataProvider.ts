import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { DockerfileTreeItem } from './DockerfileTreeItem';
import { DockForgePanel } from './panels/DockForgePanel';

const STORAGE_KEY = 'dockforge.dockerfiles';

interface StoredDockerfile {
  label: string;
  id: string;
  description?: string;
}

export class DockerfileTreeDataProvider implements vscode.TreeDataProvider<DockerfileTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<DockerfileTreeItem | undefined | null | void> = new vscode.EventEmitter<DockerfileTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<DockerfileTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

  private dockerfileItems: DockerfileTreeItem[] = [];
  private extensionUri: vscode.Uri;
  private memento: vscode.Memento;

  constructor(private workspaceRoot: string, extensionUri: vscode.Uri, memento: vscode.Memento) {
    this.extensionUri = extensionUri;
    this.memento = memento;
    this.loadFromMemento();
  }

  /**
   * Load Dockerfiles from global state storage
   */
  private loadFromMemento(): void {
    const stored = this.memento.get<StoredDockerfile[]>(STORAGE_KEY, []);
    this.dockerfileItems = stored.map(data => {
      const item = new DockerfileTreeItem(data.label, data.id);
      if (data.description) {
        item.description = data.description;
      }
      return item;
    });
  }

  /**
   * Save Dockerfiles to global state storage
   */
  private async saveToMemento(): Promise<void> {
    const data: StoredDockerfile[] = this.dockerfileItems.map(item => ({
      label: item.label,
      id: item.id,
      description: item.description as string | undefined
    }));
    await this.memento.update(STORAGE_KEY, data);
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: DockerfileTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: DockerfileTreeItem): Thenable<DockerfileTreeItem[]> {
    if (element) {
      // No children for Dockerfile items
      return Promise.resolve([]);
    } else {
      // Return the list of manually added Dockerfiles
      return Promise.resolve(this.dockerfileItems);
    }
  }

  /**
   * Add a new Dockerfile tree item
   */
  async addDockerfile(name: string, description?: string): Promise<DockerfileTreeItem> {
    const newItem = new DockerfileTreeItem(name, `${name}-${Date.now()}`);
    if (description) {
      newItem.description = description;
    }
    this.dockerfileItems.push(newItem);
    await this.saveToMemento();
    this.refresh();
    return newItem;
  }

  /**
   * Open the Dockerfile builder for a specific tree item
   */
  openDockerfileBuilder(treeItem: DockerfileTreeItem): void {
    // Create or reveal panel for this specific Dockerfile
    const panel = DockForgePanel.render(this.extensionUri, treeItem.id, treeItem.label);
    treeItem.webViewPanel = panel;
  }

  /**
   * Remove a Dockerfile tree item by label
   */
  async removeDockerfile(id: string): Promise<void> {
    const itemToRemove = this.dockerfileItems.find(item => item.id === id);
    
    if (itemToRemove) {
      // Close the associated webview panel
      DockForgePanel.closePanel(itemToRemove.id);
      
      // Remove from tree
      this.dockerfileItems = this.dockerfileItems.filter(item => item.id !== id);
      await this.saveToMemento();
      this.refresh();
    }
  }

  /**
   * Get all Dockerfile items
   */
  getDockerfiles(): DockerfileTreeItem[] {
    return this.dockerfileItems;
  }

  /**
   * Find all Dockerfiles in the workspace recursively
   */
  private getDockerfilesInWorkspace(): DockerfileTreeItem[] {
    const dockerfiles: DockerfileTreeItem[] = [];
    this.findDockerfiles(this.workspaceRoot, dockerfiles);
    return dockerfiles;
  }

  /**
   * Recursively find Dockerfiles in directories
   */
  private findDockerfiles(dir: string, dockerfiles: DockerfileTreeItem[], depth: number = 0): void {
    // Limit depth to avoid deep recursion
    if (depth > 5) {
      return;
    }

    try {
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        // Skip node_modules, .git, and other common directories
        if (file === 'node_modules' || file === '.git' || file === 'dist' || file === 'build' || file === 'out') {
          continue;
        }

        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          // Recursively search subdirectories
          this.findDockerfiles(fullPath, dockerfiles, depth + 1);
        } else if (file === 'Dockerfile' || file.startsWith('Dockerfile.')) {
          // Found a Dockerfile
          const relativePath = path.relative(this.workspaceRoot, fullPath);
          const label = relativePath === 'Dockerfile' ? 'Dockerfile' : relativePath;
        //   dockerfiles.push(new DockerfileTreeItem(label, fullPath));
        }
      }
    } catch (err) {
      // Ignore permission errors or other file system errors
      console.error(`Error reading directory ${dir}:`, err);
    }
  }
}