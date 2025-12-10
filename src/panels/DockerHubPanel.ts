import { Disposable, Webview, WebviewPanel, window, Uri, ViewColumn } from "vscode";
import { getUri } from "../utilities/getUri";
import { getNonce } from "../utilities/getNonce";

/**
 * This class manages the Docker Hub webview panel.
 *
 * It follows the same structure and lifecycle as DockForgePanel:
 * - Renders a React UI from /webview-ui/build
 * - Handles cleanup
 * - Listens for messages from the webview
 */
export class DockerHubPanel {
  public static currentPanel: DockerHubPanel | undefined;
  private readonly _panel: WebviewPanel;
  private _disposables: Disposable[] = [];

  private constructor(panel: WebviewPanel, extensionUri: Uri) {
    this._panel = panel;

    // Panel disposal
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Set HTML content
    this._panel.webview.html = this._getWebviewContent(this._panel.webview, extensionUri);

    // Listen for messages from the webview UI
    this._setWebviewMessageListener(this._panel.webview);
  }

  /**
   * Create or reveal the Docker Hub webview panel.
   */
  public static render(extensionUri: Uri) {
    if (DockerHubPanel.currentPanel) {
      DockerHubPanel.currentPanel._panel.reveal(ViewColumn.One);
      return;
    }

    const panel = window.createWebviewPanel(
      "showDockerHub",     // internal id
      "Docker Hub",             // tab title
      ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [
          Uri.joinPath(extensionUri, "out"),
          Uri.joinPath(extensionUri, "webview-ui/build")
        ]
      }
    );

    DockerHubPanel.currentPanel = new DockerHubPanel(panel, extensionUri);
  }

  /**
   * Clean up when panel is closed.
   */
  public dispose() {
    DockerHubPanel.currentPanel = undefined;

    this._panel.dispose();

    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      disposable?.dispose();
    }
  }

  /**
   * Returns the HTML (links React CSS + JS).
   */
  private _getWebviewContent(webview: Webview, extensionUri: Uri) {
    const stylesUri = getUri(webview, extensionUri, ["webview-ui", "build", "assets", "index.css"]);
    const scriptUri = getUri(webview, extensionUri, ["webview-ui", "build", "assets", "index.js"]);
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
                     img-src ${webview.cspSource} https:;
                     script-src 'nonce-${nonce}';">
          <link rel="stylesheet" type="text/css" href="${stylesUri}">
          <title>Docker Hub</title>
        </head>
        <body>
          <div id="root"></div>

          <script nonce="${nonce}">
            // Let React know this is the Docker Hub UI
            window.dockforgePage = "dockerhub-main";
          </script>

          <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
        </body>
      </html>
    `;
  }

  /**
   * React → Extension message listener
   */
  private _setWebviewMessageListener(webview: Webview) {
    webview.onDidReceiveMessage(
      (message: any) => {
        switch (message.command) {
          case "hello":
            window.showInformationMessage("Docker Hub says: " + message.text);
            return;
        }
      },
      undefined,
      this._disposables
    );
  }
}