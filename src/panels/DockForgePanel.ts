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
import { ensureDockerReady } from "../utilities/dockerCheck";

/**
 * This class manages the state and behavior of DockForge webview panels.
 */
export class DockForgePanel {
  public static currentPanel: DockForgePanel | undefined;
  private readonly _panel: WebviewPanel;
  private _disposables: Disposable[] = [];

  private constructor(panel: WebviewPanel, extensionUri: Uri) {
    this._panel = panel;

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    this._panel.webview.html = this._getWebviewContent(
      this._panel.webview,
      extensionUri
    );

    // ✅ Correct place for all webview → extension logic
    this._setWebviewMessageListener(this._panel.webview);
  }

  public static render(extensionUri: Uri) {
    if (DockForgePanel.currentPanel) {
      DockForgePanel.currentPanel._panel.reveal(ViewColumn.One);
    } else {
      const panel = window.createWebviewPanel(
        "showDockForge",
        "DockForge",
        ViewColumn.One,
        {
          enableScripts: true,
          localResourceRoots: [
            Uri.joinPath(extensionUri, "out"),
            Uri.joinPath(extensionUri, "webview-ui/build"),
          ],
        }
      );

      DockForgePanel.currentPanel = new DockForgePanel(panel, extensionUri);
    }
  }

  public dispose() {
    DockForgePanel.currentPanel = undefined;
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
          <title>DockForge</title>
        </head>
        <body>
          <div id="root"></div>

          <script nonce="${nonce}">
            window.dockforgePage = "dockforge-home";
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
      async (message: { command?: string; type?: string; payload?: any }) => {
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

          default:
            console.warn("Unknown webview message:", message);
        }
      },
      undefined,
      this._disposables
    );
  }
}