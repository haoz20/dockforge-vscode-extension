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

/**
 * This class manages the state and behavior of DockForge webview panels.
 */
export class DockForgePanel {
  public static panels: Map<string, DockForgePanel> = new Map();
  private readonly _panel: WebviewPanel;
  private _disposables: Disposable[] = [];
  private readonly _dockerfileId: string;
  private readonly _dockerfileName: string;
  private _data?: DockerfileData;
  private _onDataUpdate?: (id: string, data: DockerfileData) => void;

  /**
   * The DockForgePanel class private constructor (called only from the render method).
   *
   * @param panel A reference to the webview panel
   * @param extensionUri The URI of the directory containing the extension
   */
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

    this._panel.webview.html = this._getWebviewContent(
      this._panel.webview,
      extensionUri
    );

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
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
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

    return /*html*/ `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <meta http-equiv="Content-Security-Policy"
            content="default-src 'none';
                     style-src ${webview.cspSource};
                     script-src 'nonce-${nonce}';">
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
   * ✅ THIS is where Docker checks belong
   */
  private _setWebviewMessageListener(webview: Webview) {
    webview.onDidReceiveMessage(
      async (message: { 
        command?: string; 
        type?: string; 
        payload?: any;
        data?: any;
        showNotification?: boolean;
      }) => {
        // Support both `command` and `type` to avoid breaking changes
        const action = message.type ?? message.command;

        switch (action) {
          case "hello":
              window.showInformationMessage("Hello from DockForge");
            return;

          case "TEST_BUILD": {
            if (!(await ensureDockerReady())) return;

            // TODO:
            // Implement docker test build logic here
            window.showInformationMessage(
              "Docker is ready. Test Build can proceed."
            );
            return;
          }

          case "BUILD_IMAGE": {
            if (!(await ensureDockerReady())) return;

            // TODO:
            // Implement docker build image logic here
            window.showInformationMessage(
              "Docker is ready. Build Image can proceed."
            );
            return;
          }

          case "RUN_CONTAINER": {
            if (!(await ensureDockerReady())) return;

            // TODO:
            // Implement docker run container logic here
            window.showInformationMessage(
              "Docker is ready. Run Container can proceed."
            );
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