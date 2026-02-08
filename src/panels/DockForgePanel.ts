import {
  Disposable,
  Webview,
  WebviewPanel,
  window,
  Uri,
  ViewColumn,
} from "vscode";
import { getUri } from "../utilities/getUri";
import { getNonce } from "../utilities/getNonce";
import { DockerfileData } from "../types/DockerfileData";
import { ensureDockerReady } from "../utilities/dockerCheck";
import { fetchDockerHubTags, searchDockerHubRepositories } from "../utilities/dockerHubApi";

import { 
  buildDockerImage, 
  runDockerContainer, 
  testBuild,
  buildAndRun,
  BuildOptions, 
  RunOptions 
} from "../utilities/dockerBuild";
import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

/**
 * This class manages the state and behavior of DockForge webview panels.
 */
export class DockForgePanel {
  public static panels: Map<string, DockForgePanel> = new Map();
  private readonly _panel: WebviewPanel;
  private readonly _disposables: Disposable[] = [];
  private readonly _dockerfileId: string;
  private readonly _dockerfileName: string;
  private _data?: DockerfileData;
  private _onDataUpdate?: (id: string, data: DockerfileData) => void;


  private constructor(
    panel: WebviewPanel, 
    extensionUri: Uri, 
    dockerfileId: string, 
    dockerfileName: string,
    data?: DockerfileData,
    onDataUpdate?: (id: string, data: DockerfileData) => void
  ) {
    this._panel = panel;
    this._dockerfileId = dockerfileId;
    this._dockerfileName = dockerfileName;
    this._data = data;
    this._onDataUpdate = onDataUpdate;

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    const htmlContent = this._getWebviewContent(
      this._panel.webview,
      extensionUri
    );
    
    // Debug: Log the HTML content
    console.log("[DockForge] Setting webview HTML for:", dockerfileName);
    console.log("[DockForge] HTML length:", htmlContent.length);
    
    this._panel.webview.html = htmlContent;

    // ✅ Correct place for all webview → extension logic
    this._setWebviewMessageListener(this._panel.webview);
  }

  /**
   * Renders the current webview panel if it exists otherwise a new webview panel
   * will be created and displayed.
   *
   * @param extensionUri The URI of the directory containing the extension.
   */
  public static render(
    extensionUri: Uri, 
    dockerfileId: string, 
    dockerfileName: string,
    data?: DockerfileData,
    onDataUpdate?: (id: string, data: DockerfileData) => void
  ) {
    const existingPanel = DockForgePanel.panels.get(dockerfileId);
    if (existingPanel) {
      // If panel already exists for Dockerfile, reveal and update data
      existingPanel._panel.reveal(ViewColumn.One);
      if (data) {
        existingPanel._data = data;
        existingPanel.sendDataToWebview();
      }
      return existingPanel;
    }

    const panel = window.createWebviewPanel(
      `dockforge-${dockerfileId}`,
      `DockForge - ${dockerfileName}`,
      ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [Uri.joinPath(extensionUri, "out"), Uri.joinPath(extensionUri, "webview-ui/build")],
        retainContextWhenHidden: true,
      }
    );

    const dockforgePanel = new DockForgePanel(panel, extensionUri, dockerfileId, dockerfileName, data, onDataUpdate);
    DockForgePanel.panels.set(dockerfileId, dockforgePanel);
    return dockforgePanel;
  }

  public static closePanel(dockerfileId: string) {
    const panel = DockForgePanel.panels.get(dockerfileId);
    if (panel) {
      panel.dispose();
    }
  }

  public static getPanel(dockerfileId: string): DockForgePanel | undefined {
    return DockForgePanel.panels.get(dockerfileId);
  }
  

  public dispose() {
    DockForgePanel.panels.delete(this._dockerfileId);

    // Dispose of the current webview panel
    this._panel.dispose();

    while (this._disposables.length) {
      this._disposables.pop()?.dispose();
    }
  }

  /**
   * Always generate:
   * Dockerfile, Dockerfile1, Dockerfile2, ...
   */
  private _getUniqueDockerfilePath(dir: string): string {
    let counter = 0;
    let filePath: string;

    do {
      const suffix = counter === 0 ? "" : counter.toString();
      filePath = path.join(dir, `Dockerfile${suffix}`);
      counter++;
    } while (fs.existsSync(filePath));

    return filePath;
  }

  /**
   * The webview must supply the exact Dockerfile text it previewed.
   * Return it if present; otherwise empty string so callers can warn.
   */
  private _resolveDockerfileContent(dockerfileText?: string): string {
    if (typeof dockerfileText === "string" && dockerfileText.trim().length > 0) {
      return dockerfileText;
    }
    return "";
  }



  private _getWebviewContent(webview: Webview, extensionUri: Uri) {
    const stylesUri = getUri(webview, extensionUri, [
      "webview-ui",
      "build",
      "assets",
      "index.css",
    ]);
    const scriptUri = getUri(webview, extensionUri, [
      "webview-ui",
      "build",
      "assets",
      "index.js",
    ]);
    const nonce = getNonce();
    
    // Debug logging
    console.log("[DockForge] Extension URI:", extensionUri.toString());
    console.log("[DockForge] Styles URI:", stylesUri.toString());
    console.log("[DockForge] Script URI:", scriptUri.toString());
    console.log("[DockForge] CSP Source:", webview.cspSource);

    return /*html*/ `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <meta http-equiv="Content-Security-Policy"
            content="default-src 'none';
                     style-src ${webview.cspSource} 'unsafe-inline';
                     script-src 'nonce-${nonce}' blob:;
                     worker-src ${webview.cspSource} blob:;
                     font-src ${webview.cspSource};
                     img-src ${webview.cspSource} https: data:;
                     connect-src https://hub.docker.com https://registry.hub.docker.com;">
          <link rel="stylesheet" type="text/css" href="${stylesUri}">
          <title>DockForge - ${this._dockerfileName}</title>
        </head>
        <body>
          <div id="root"></div>

          <script nonce="${nonce}">
            window.dockforgePage = "dockforge-home";
            window.dockerfileId = "${this._dockerfileId}";
            window.dockerfileName = "${this._dockerfileName}";
            window.dockerfileData = ${this._data ? JSON.stringify(this._data) : 'null'};
          </script>

          <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
        </body>
      </html>
    `;
  }

  /**
   * ✅ Webview → Extension message handling
   */
  private _setWebviewMessageListener(webview: Webview) {
    webview.onDidReceiveMessage(
      async (message: { 
        command?: string; 
        type?: string; 
        payload?: any;
        data?: any;
        showNotification?: boolean;
        query?: string;
        repository?: string;
      }) => {
        // Support both `command` and `type` to avoid breaking changes
        const action = message.type ?? message.command;

        switch (action) {
          case "hello":
            window.showInformationMessage("Hello from DockForge");
            return;

          case "INSERT_TO_WORKSPACE": {
            const warnings: string[] = message.payload?.warnings ?? [];
            const dockerfileTextFromWebview = message.payload?.dockerfileText;

            // Decide Dockerfile content: must match webview preview
            const dockerfileContent = this._resolveDockerfileContent(dockerfileTextFromWebview);

            // Extra safety: if content is still empty, abort
            if (!dockerfileContent || dockerfileContent.trim().length === 0) {
              window.showErrorMessage("Dockerfile content is empty. Nothing to insert.");
              return;
            }

            // 1️⃣ Validation decision
            if (warnings.length > 0) {
              const choice = await window.showWarningMessage(
                `There are ${warnings.length} validation warning(s).`,
                { modal: true },
                "Keep Editing",
                "Insert Anyway"
              );

              if (choice !== "Insert Anyway") {
                return;
              }
            }

            // 2️⃣ Select target folder
            const folders = await window.showOpenDialog({
              canSelectFiles: false,
              canSelectFolders: true,
              canSelectMany: false,
              openLabel: "Select folder to insert Dockerfile",
            });

            if (!folders || folders.length === 0) {
              return;
            }

            const targetDir = folders[0].fsPath;

            // 3️⃣ Resolve unique filename
            const dockerfilePath = this._getUniqueDockerfilePath(targetDir);

            // 4️⃣ Write Dockerfile
            try {
              fs.writeFileSync(dockerfilePath, dockerfileContent, "utf8");
              window.showInformationMessage(
                `Dockerfile created successfully:\n${dockerfilePath}`
              );
            } catch (error) {
              window.showErrorMessage(
                `Failed to create Dockerfile: ${
                  error instanceof Error ? error.message : String(error)
                }`
              );
            }

            return;
          }

          case "TEST_BUILD": {
            if (!(await ensureDockerReady())) {
              return;
            }

            const { imageName, imageTag, dockerfileText } = message.payload || {};
            
            if (!imageName) {
              window.showErrorMessage("Image name is required for test build");
              return;
            }

            if (!dockerfileText) {
              window.showErrorMessage("No Dockerfile content to build");
              return;
            }

            // Get workspace folder for build context
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
              window.showErrorMessage("No workspace folder open. Please open a folder first.");
              return;
            }

            const contextPath = workspaceFolders[0].uri.fsPath;

            const buildOptions: BuildOptions = {
              imageName: imageName || "dockforge-test",
              imageTag: imageTag || "latest",
              dockerfileContent: dockerfileText,
              contextPath,
              noCache: true, // Always fresh build for test
            };

            // Send progress to webview
            const onOutput = (line: string) => {
              this._panel.webview.postMessage({
                command: "buildOutput",
                line,
              });
            };

            try {
              const result = await testBuild(buildOptions, onOutput);
              
              this._panel.webview.postMessage({
                command: "buildComplete",
                success: result.success,
                imageId: result.imageId,
                error: result.error,
              });
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              this._panel.webview.postMessage({
                command: "buildComplete",
                success: false,
                error: errorMessage,
              });
            }
            return;
          }

          case "BUILD_IMAGE": {
            if (!(await ensureDockerReady())) return;

            const { imageName, imageTag, stages, dockerfileText, noCache, pull, target, platform, buildArgs } = 
              message.payload || {};

            if (!imageName) {
              window.showErrorMessage("Image name is required");
              return;
            }

            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
              window.showErrorMessage("No workspace folder open. Please open a folder first.");
              return;
            }

            const contextPath = workspaceFolders[0].uri.fsPath;

            const dockerfileContent = this._resolveDockerfileContent(dockerfileText);

            if (!dockerfileContent.trim()) {
              window.showErrorMessage("No Dockerfile content to build");
              return;
            }

            const buildOptions: BuildOptions = {
              imageName,
              imageTag: imageTag || "latest",
              dockerfileContent,
              contextPath,
              noCache: noCache ?? false,
              pull: pull ?? false,
              target,
              platform,
              buildArgs,
            };

            const onOutput = (line: string) => {
              this._panel.webview.postMessage({
                command: "buildOutput",
                line,
              });
            };

            const onProgress = (stage: string, progress: number) => {
              this._panel.webview.postMessage({
                command: "buildProgress",
                stage,
                progress,
              });
            };

            try {
              const result = await buildDockerImage(buildOptions, onOutput, onProgress);
              
              this._panel.webview.postMessage({
                command: "buildComplete",
                success: result.success,
                imageId: result.imageId,
                error: result.error,
              });
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              this._panel.webview.postMessage({
                command: "buildComplete",
                success: false,
                error: errorMessage,
              });
            }
            return;
          }

          case "RUN_CONTAINER": {
            if (!(await ensureDockerReady())) return;

            const { 
              imageName, 
              imageTag, 
              containerName, 
              portMapping, 
              envVariables,
              detached = true,
              remove = false,
            } = message.payload || {};

            if (!imageName) {
              window.showErrorMessage("Image name is required");
              return;
            }

            // Parse port mappings from string format "8080:80, 3000:3000"
            const portMappings = portMapping
              ? portMapping.split(",").map((p: string) => p.trim()).filter(Boolean)
              : undefined;

            // Parse environment variables from string format "KEY1=value1,KEY2=value2"
            const envVars: Record<string, string> = {};
            if (envVariables) {
              envVariables.split(",").forEach((e: string) => {
                const [key, value] = e.trim().split("=");
                if (key && value !== undefined) {
                  envVars[key.trim()] = value.trim();
                }
              });
            }

            const runOptions: RunOptions = {
              imageName,
              imageTag: imageTag || "latest",
              containerName: containerName || undefined,
              portMappings,
              envVariables: Object.keys(envVars).length > 0 ? envVars : undefined,
              detached,
              remove,
            };

            const onOutput = (line: string) => {
              this._panel.webview.postMessage({
                command: "runOutput",
                line,
              });
            };

            try {
              const result = await runDockerContainer(runOptions, onOutput);
              
              this._panel.webview.postMessage({
                command: "runComplete",
                success: result.success,
                containerId: result.containerId,
                containerName: result.containerName,
                error: result.error,
              });
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              this._panel.webview.postMessage({
                command: "runComplete",
                success: false,
                error: errorMessage,
              });
            }
            return;
          }

          case "BUILD_AND_RUN": {
            if (!(await ensureDockerReady())) return;

            const { 
              imageName, 
              imageTag, 
              stages,
              dockerfileText,
              containerName, 
              portMapping, 
              envVariables,
            } = message.payload || {};

            if (!imageName) {
              window.showErrorMessage("Image name is required");
              return;
            }

            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
              window.showErrorMessage("No workspace folder open");
              return;
            }

            const contextPath = workspaceFolders[0].uri.fsPath;

            const dockerfileContent = this._resolveDockerfileContent(dockerfileText);

            if (!dockerfileContent.trim()) {
              window.showErrorMessage("No Dockerfile content to build");
              return;
            }

            const portMappings = portMapping
              ? portMapping.split(",").map((p: string) => p.trim()).filter(Boolean)
              : undefined;

            const envVars: Record<string, string> = {};
            if (envVariables) {
              envVariables.split(",").forEach((e: string) => {
                const [key, value] = e.trim().split("=");
                if (key && value !== undefined) {
                  envVars[key.trim()] = value.trim();
                }
              });
            }

            const onOutput = (line: string) => {
              this._panel.webview.postMessage({
                command: "buildRunOutput",
                line,
              });
            };

            try {
              const result = await buildAndRun(
                {
                  imageName,
                  imageTag: imageTag || "latest",
                  dockerfileContent,
                  contextPath,
                },
                {
                  containerName,
                  portMappings,
                  envVariables: Object.keys(envVars).length > 0 ? envVars : undefined,
                  detached: true,
                },
                onOutput
              );
              
              this._panel.webview.postMessage({
                command: "buildRunComplete",
                buildSuccess: result.build.success,
                runSuccess: result.run?.success ?? false,
                imageId: result.build.imageId,
                containerId: result.run?.containerId,
                error: result.build.error || result.run?.error,
              });
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              this._panel.webview.postMessage({
                command: "buildRunComplete",
                buildSuccess: false,
                runSuccess: false,
                error: errorMessage,
              });
            }
            return;
          }
          
          case "saveDockerfileData":
            // Save Dockerfile data
            if (message.data && this._onDataUpdate) {
              this._data = message.data;
              try {
                this._onDataUpdate(this._dockerfileId, message.data);
                // Only show notification if explicitly requested (manual save)
                if (message.showNotification) {
                  window.showInformationMessage(`Saved: ${this._dockerfileName}`);
                }
              } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                window.showErrorMessage(`Failed to save ${this._dockerfileName}: ${errorMessage}`);
                console.error(`Error saving Dockerfile data for ${this._dockerfileId}:`, error);
              }
            }
            return;
          
          case "requestDockerfileData":
            // Send current data to webview
            this.sendDataToWebview();
            return;

          case "dockerHubSearch": {
            const query =
              message.payload?.query ??
              message.data?.query ??
              message.query ??
              "";

            if (!query || typeof query !== "string") {
              this._panel.webview.postMessage({
                command: "dockerHubSearchResults",
                results: [],
              });
              return;
            }

            try {
              const results = await searchDockerHubRepositories(query, 15);
              this._panel.webview.postMessage({
                command: "dockerHubSearchResults",
                query,
                results,
              });
            } catch (error) {
              const messageText =
                error instanceof Error ? error.message : String(error);
              this._panel.webview.postMessage({
                command: "dockerHubError",
                message: messageText,
              });
            }
            return;
          }

          case "dockerHubFetchTags": {
            const repository =
              message.payload?.repository ??
              message.data?.repository ??
              message.repository ??
              "";

            if (!repository || typeof repository !== "string") {
              return;
            }

            try {
              const tags = await fetchDockerHubTags(repository, 30);
              this._panel.webview.postMessage({
                command: "dockerHubTagsResult",
                repository,
                tags,
              });
            } catch (error) {
              const messageText =
                error instanceof Error ? error.message : String(error);
              this._panel.webview.postMessage({
                command: "dockerHubError",
                message: messageText,
              });
            }
            return;
          }

          default:
            console.warn("Unknown webview message:", message);
        }
      },
      undefined,
      this._disposables
    );
  }

  /**
   * Send data to webview
   */
  private sendDataToWebview() {
    if (this._data) {
      this._panel.webview.postMessage({
        command: "loadDockerfileData",
        data: this._data
      });
    }
  }
}
