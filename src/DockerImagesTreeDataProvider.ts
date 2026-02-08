import * as vscode from "vscode";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface DockerImage {
  repository: string;
  tag: string;
  imageId: string;
  created: string;
  size: string;
}

export interface RunningContainer {
  containerId: string;
  imageId: string;
  name: string;
  status: string;
  ports: string;
}

export class DockerImagesTreeDataProvider implements vscode.TreeDataProvider<DockerTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<DockerTreeItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private images: DockerImage[] = [];
  private containers: RunningContainer[] = [];
  private dockerRunning: boolean = true;

  constructor() {
    this.refresh();
  }

  refresh(): void {
    this.loadImages();
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: DockerTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: DockerTreeItem): Promise<DockerTreeItem[]> {
    if (!element) {
      // Root level - show all images
      await this.loadImages();
      
      if (!this.dockerRunning) {
        return [new DockerErrorTreeItem(
          "Docker Desktop is not running",
          "Open Docker Desktop to see images"
        )];
      }
      
      if (this.images.length === 0) {
        return [new DockerErrorTreeItem(
          "No Docker images found",
          "Build an image to see it here"
        )];
      }
      
      return this.images.map(img => new DockerImageTreeItem(img, this.containers));
    } else if (element instanceof DockerImageTreeItem) {
      return element.getChildren();
    } else if (element instanceof DockerContainerInfoItem) {
      return element.getChildren();
    }
    return [];
  }

  private async loadImages(): Promise<void> {
    try {
      // First, check if Docker daemon is running
      try {
        await execAsync('docker info', { timeout: 3000 });
        this.dockerRunning = true;
      } catch (error) {
        this.dockerRunning = false;
        this.images = [];
        this.containers = [];
        console.error("Docker daemon is not running:", error);
        return;
      }

      // Get all images
      const { stdout: imagesOutput } = await execAsync(
        'docker images --format "{{.Repository}}|||{{.Tag}}|||{{.ID}}|||{{.CreatedAt}}|||{{.Size}}"'
      );

      this.images = imagesOutput
        .trim()
        .split("\n")
        .filter(line => line && !line.includes("<none>"))
        .map(line => {
          const [repository, tag, imageId, created, size] = line.split("|||");
          return { repository, tag, imageId, created, size };
        });

      // Get running containers
      const { stdout: containersOutput } = await execAsync(
        'docker ps --format "{{.ID}}|||{{.Image}}|||{{.Names}}|||{{.Status}}|||{{.Ports}}"'
      );

      this.containers = containersOutput
        .trim()
        .split("\n")
        .filter(Boolean)
        .map(line => {
          const [containerId, imageId, name, status, ports] = line.split("|||");
          return { containerId, imageId, name, status, ports };
        });
    } catch (error) {
      console.error("Failed to load Docker images:", error);
      this.images = [];
      this.containers = [];
    }
  }

  async deleteImage(imageId: string): Promise<void> {
    try {
      const choice = await vscode.window.showWarningMessage(
        `Delete image ${imageId}?`,
        { modal: true },
        "Delete"
      );

      if (choice !== "Delete") {
        return;
      }

      await execAsync(`docker rmi ${imageId}`);
      vscode.window.showInformationMessage(`Image ${imageId} deleted`);
      this.refresh();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`Failed to delete image: ${errorMessage}`);
    }
  }

  async stopContainer(containerId: string): Promise<void> {
    try {
      await execAsync(`docker stop ${containerId}`);
      vscode.window.showInformationMessage(`Container ${containerId} stopped`);
      this.refresh();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`Failed to stop container: ${errorMessage}`);
    }
  }

  async runContainer(image: DockerImage): Promise<void> {
    // Show configuration quick picks
    const containerName = await vscode.window.showInputBox({
      prompt: "Container name (optional)",
      placeHolder: "my-container",
    });

    if (containerName === undefined) {
      return; // User cancelled
    }

    const portMapping = await vscode.window.showInputBox({
      prompt: "Port mapping (host:container, comma-separated)",
      placeHolder: "8080:80,3000:3000",
      validateInput: (value) => {
        if (!value) {
          return null; // Optional
        }
        const regex = /^\d+:\d+(,\s*\d+:\d+)*$/;
        return regex.test(value.trim()) ? null : "Invalid port format. Use: 8080:80,3000:3000";
      },
    });

    if (portMapping === undefined) {
      return; // User cancelled
    }

    const envVariables = await vscode.window.showInputBox({
      prompt: "Environment variables (KEY=value, comma-separated)",
      placeHolder: "NODE_ENV=production,PORT=3000",
    });

    if (envVariables === undefined) {
      return; // User cancelled
    }

    const runMode = await vscode.window.showQuickPick(
      [
        { 
          label: "$(server-process) Detached", 
          description: "Run in background (recommended)", 
          detail: "Container runs in background. View logs from tree view.",
          value: "detached" 
        },
        { 
          label: "$(output) Attached", 
          description: "Show output in terminal", 
          detail: "Runs container and shows output. No interactive input.",
          value: "attached" 
        },
        { 
          label: "$(terminal) Interactive Terminal", 
          description: "Run with interactive shell", 
          detail: "Opens VS Code terminal with interactive session. Use Ctrl+C to stop.",
          value: "terminal" 
        },
      ],
      { placeHolder: "How would you like to run the container?" }
    );

    if (runMode === undefined) {
      return; // User cancelled
    }

    // If interactive terminal mode, run in VS Code terminal instead
    if (runMode.value === "terminal") {
      const terminalName = `${image.repository}:${image.tag}`;
      const terminal = vscode.window.createTerminal(terminalName);
      terminal.show();

      // Build command for terminal
      let terminalCommand = "docker run -it --rm";
      
      if (containerName) {
        terminalCommand += ` --name ${containerName}`;
      }
      
      if (portMapping) {
        portMapping.split(",").forEach(port => {
          terminalCommand += ` -p ${port.trim()}`;
        });
      }
      
      if (envVariables) {
        envVariables.split(",").forEach(env => {
          terminalCommand += ` -e ${env.trim()}`;
        });
      }
      
      terminalCommand += ` ${image.repository}:${image.tag}`;
      
      terminal.sendText(terminalCommand);
      vscode.window.showInformationMessage(`Running ${image.repository}:${image.tag} in terminal`);
      return;
    }

    // If attached mode, run in terminal without -it
    if (runMode.value === "attached") {
      const terminalName = `${image.repository}:${image.tag}`;
      const terminal = vscode.window.createTerminal(terminalName);
      terminal.show();

      // Build command for terminal (no -it, just --rm)
      let terminalCommand = "docker run --rm";
      
      if (containerName) {
        terminalCommand += ` --name ${containerName}`;
      }
      
      if (portMapping) {
        portMapping.split(",").forEach(port => {
          terminalCommand += ` -p ${port.trim()}`;
        });
      }
      
      if (envVariables) {
        envVariables.split(",").forEach(env => {
          terminalCommand += ` -e ${env.trim()}`;
        });
      }
      
      terminalCommand += ` ${image.repository}:${image.tag}`;
      
      terminal.sendText(terminalCommand);
      vscode.window.showInformationMessage(`Running ${image.repository}:${image.tag} in attached mode`);
      return;
    }

    // Detached mode - run in background
    const args: string[] = ["run", "-d", "--rm"];

    if (containerName) {
      args.push("--name", containerName);
    }

    if (portMapping) {
      portMapping.split(",").forEach(port => {
        args.push("-p", port.trim());
      });
    }

    if (envVariables) {
      envVariables.split(",").forEach(env => {
        args.push("-e", env.trim());
      });
    }

    args.push(`${image.repository}:${image.tag}`);

    // Execute docker run
    try {
      const command = `docker ${args.join(" ")}`;
      console.log("Running:", command);

      const { stdout } = await execAsync(command);
      const containerId = stdout.trim();

      vscode.window.showInformationMessage(
        `✅ Container started: ${containerName || containerId.substring(0, 12)}`
      );

      this.refresh();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`Failed to run container: ${errorMessage}`);
    }
  }

  async revealImage(imageName: string, imageTag: string): Promise<void> {
    // Find the image in the tree
    const image = this.images.find(
      img => img.repository === imageName && img.tag === imageTag
    );

    if (image) {
      // Trigger refresh to ensure tree is up-to-date
      this.refresh();
    }
  }
}

// Tree item classes
class DockerTreeItem extends vscode.TreeItem {}

class DockerImageTreeItem extends DockerTreeItem {
  public readonly image: DockerImage;
  private containers: RunningContainer[];

  constructor(
    image: DockerImage,
    containers: RunningContainer[]
  ) {
    const runningContainer = containers.find(c => 
      c.imageId.startsWith(image.imageId) || 
      c.imageId === `${image.repository}:${image.tag}`
    );

    super(
      `${image.repository}:${image.tag}`,
      runningContainer 
        ? vscode.TreeItemCollapsibleState.Expanded 
        : vscode.TreeItemCollapsibleState.Collapsed
    );

    this.image = image;
    this.containers = containers;
    this.contextValue = "dockerImage";
    this.iconPath = new vscode.ThemeIcon(
      runningContainer ? "debug-start" : "package"
    );
    this.tooltip = `Image ID: ${image.imageId}\nSize: ${image.size}\nCreated: ${image.created}`;
    this.description = runningContainer ? "● Running" : "";
  }

  getChildren(): DockerTreeItem[] {
    const children: DockerTreeItem[] = [];

    // Add info section
    children.push(
      new DockerImageInfoItem("Image ID", this.image.imageId.substring(0, 12)),
      new DockerImageInfoItem("Size", this.image.size),
      new DockerImageInfoItem("Created", this.image.created)
    );

    // Check for running container
    const runningContainer = this.containers.find(c => 
      c.imageId.startsWith(this.image.imageId) || 
      c.imageId === `${this.image.repository}:${this.image.tag}`
    );

    if (runningContainer) {
      children.push(new DockerContainerInfoItem(runningContainer));
    } else {
      // Add run action if not running
      children.push(new DockerImageActionItem("Run Container", "run", this.image));
    }

    // Add delete action
    children.push(new DockerImageActionItem("Delete Image", "delete", this.image));

    return children;
  }
}

class DockerImageInfoItem extends DockerTreeItem {
  constructor(label: string, value: string) {
    super(`${label}: ${value}`, vscode.TreeItemCollapsibleState.None);
    this.contextValue = "dockerImageInfo";
    this.iconPath = new vscode.ThemeIcon("info");
  }
}

class DockerImageActionItem extends DockerTreeItem {
  constructor(
    label: string,
    public readonly action: "run" | "delete",
    public readonly image: DockerImage
  ) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.contextValue = `dockerImageAction-${action}`;
    this.iconPath = new vscode.ThemeIcon(action === "run" ? "play" : "trash");
    this.command = {
      command: `dockforge.${action}Image`,
      title: label,
      arguments: [image],
    };
  }
}

class DockerContainerInfoItem extends DockerTreeItem {
  constructor(public readonly container: RunningContainer) {
    super(
      `Container: ${container.name}`,
      vscode.TreeItemCollapsibleState.Expanded
    );
    this.contextValue = "dockerContainer";
    this.iconPath = new vscode.ThemeIcon("vm-running");
    this.tooltip = `Status: ${container.status}\nPorts: ${container.ports || "None"}`;
  }

  getChildren(): DockerTreeItem[] {
    return [
      new DockerContainerDetailItem("Status", this.container.status),
      new DockerContainerDetailItem("Ports", this.container.ports || "None"),
      new DockerContainerActionItem("View Container", this.container.containerId, "open"),
      new DockerContainerActionItem("Stop Container", this.container.containerId, "stop"),
    ];
  }
}

class DockerContainerDetailItem extends DockerTreeItem {
  constructor(label: string, value: string) {
    super(`${label}: ${value}`, vscode.TreeItemCollapsibleState.None);
    this.contextValue = "dockerContainerDetail";
    this.iconPath = new vscode.ThemeIcon("symbol-property");
  }
}

class DockerContainerActionItem extends DockerTreeItem {
  constructor(
    label: string,
    public readonly containerId: string,
    public readonly action: "stop" | "open"
  ) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.contextValue = `dockerContainerAction-${action}`;
    this.iconPath = new vscode.ThemeIcon(
      action === "stop" ? "debug-stop" : "link-external"
    );
    
    this.command = {
      command: action === "stop" ? "dockforge.stopContainer" : "dockforge.openInDockerDesktop",
      title: label,
      arguments: [containerId],
    };
  }
}

class DockerErrorTreeItem extends DockerTreeItem {
  constructor(label: string, description: string) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.contextValue = "dockerError";
    this.iconPath = new vscode.ThemeIcon("warning", new vscode.ThemeColor("problemsWarningIcon.foreground"));
    this.description = description;
    this.tooltip = `${label}\n${description}`;
  }
}
