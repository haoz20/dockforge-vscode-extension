import { Disposable, Webview, WebviewPanel, window, Uri, ViewColumn } from "vscode";
import { getUri } from "../utilities/getUri";
import { getNonce } from "../utilities/getNonce";

/**
 * This class manages the state and behavior of DockForge webview panels.
 *
 * It contains all the data and methods for:
 *
 * - Creating and rendering DockForge webview panels
 * - Properly cleaning up and disposing of webview resources when the panel is closed
 * - Setting the HTML (and by proxy CSS/JavaScript) content of the webview panel
 * - Setting message listeners so data can be passed between the webview and extension
 */
export class DockForgePanel {
  public static panels: Map<string, DockForgePanel> = new Map();
  // public static currentPanel: DockForgePanel | undefined;
  private readonly _panel: WebviewPanel;
  private _disposables: Disposable[] = [];
  private readonly _dockerfileId: string;
  private readonly _dockerfileName: string;

  /**
   * The DockForgePanel class private constructor (called only from the render method).
   *
   * @param panel A reference to the webview panel
   * @param extensionUri The URI of the directory containing the extension
   */
  private constructor(panel: WebviewPanel, extensionUri: Uri, dockerfileID: string, dockerfileName: string) {
    this._panel = panel;
    this._dockerfileId = dockerfileID;
    this._dockerfileName = dockerfileName;

    // Set an event listener to listen for when the panel is disposed (i.e. when the user closes
    // the panel or when the panel is closed programmatically)
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Set the HTML content for the webview panel
    this._panel.webview.html = this._getWebviewContent(this._panel.webview, extensionUri);

    // Set an event listener to listen for messages passed from the webview context
    this._setWebviewMessageListener(this._panel.webview);
  }

  /**
   * Renders the current webview panel if it exists otherwise a new webview panel
   * will be created and displayed.
   *
   * @param extensionUri The URI of the directory containing the extension.
   */
  public static render(extensionUri: Uri, dockerfileId: string, dockerfileName: string) {
    const existingPanel = DockForgePanel.panels.get(dockerfileId);
    // if (DockForgePanel.currentPanel) {
    //   // If the webview panel already exists reveal it
    //   DockForgePanel.currentPanel._panel.reveal(ViewColumn.One);
    // } else {
    //   // If a webview panel does not already exist create and show a new one
    //   const panel = window.createWebviewPanel(
    //     // Panel view type
    //     "showDockForge",
    //     // Panel title
    //     "DockForge",
    //     // The editor column the panel should be displayed in
    //     ViewColumn.One,
    //     // Extra panel configurations
    //     {
    //       // Enable JavaScript in the webview
    //       enableScripts: true,
    //       // Restrict the webview to only load resources from the `out` and `webview-ui/build` directories
    //       localResourceRoots: [Uri.joinPath(extensionUri, "out"), Uri.joinPath(extensionUri, "webview-ui/build")],
    //     }
    //   );
    if (existingPanel) {
      // If panel already exists for Dockerfile, reveal
      existingPanel._panel.reveal(ViewColumn.One);
      return existingPanel;
    }

    const panel = window.createWebviewPanel(
      `dockforge-${dockerfileId}`,
      `DockForge - ${dockerfileName}`,
      ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [Uri.joinPath(extensionUri, "out"), Uri.joinPath(extensionUri, "webview-ui/build")],
      }
    );

    const dockforgePanel = new DockForgePanel(panel, extensionUri, dockerfileId, dockerfileName);
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
  

  /**
   * Cleans up and disposes of webview resources when the webview panel is closed.
   */
  public dispose() {
    DockForgePanel.panels.delete(this._dockerfileId);

    // Dispose of the current webview panel
    this._panel.dispose();

    // Dispose of all disposables (i.e. commands) for the current webview panel
    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }

  /**
   * Defines and returns the HTML that should be rendered within the webview panel.
   *
   * @remarks This is also the place where references to the React webview build files
   * are created and inserted into the webview HTML.
   *
   * @param webview A reference to the extension webview
   * @param extensionUri The URI of the directory containing the extension
   * @returns A template string literal containing the HTML that should be
   * rendered within the webview panel
   */
  private _getWebviewContent(webview: Webview, extensionUri: Uri) {
    // The CSS file from the React build output
    const stylesUri = getUri(webview, extensionUri, ["webview-ui", "build", "assets", "index.css"]);
    // The JS file from the React build output
    const scriptUri = getUri(webview, extensionUri, ["webview-ui", "build", "assets", "index.js"]);

    const nonce = getNonce();

    // Tip: Install the es6-string-html VS Code extension to enable code highlighting below
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

        <!-- IMPORTANT: App.tsx needs this -->
        <script nonce="${nonce}">
          window.dockforgePage = "dockforge-home";
          window.dockerfileId = "${this._dockerfileId}";
          window.dockerfileName = "${this._dockerfileName}";
        </script>

        <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
      </body>
    </html>
  `;
  }

  /**
   * Sets up an event listener to listen for messages passed from the webview context and
   * executes code based on the message that is recieved.
   *
   * @param webview A reference to the extension webview
   * @param context A reference to the extension context
   */
  private _setWebviewMessageListener(webview: Webview) {
    webview.onDidReceiveMessage(
      (message: any) => {
        const command = message.command;
        const text = message.text;

        switch (command) {
          case "hello":
            // Code that should run in response to the hello message command
            window.showInformationMessage(text);
            return;
          // Add more switch case statements here as more webview message commands
          // are created within the webview context (i.e. inside media/main.js)
        }
      },
      undefined,
      this._disposables
    );
  }
}