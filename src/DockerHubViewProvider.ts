import * as vscode from "vscode";

export class DockerHubViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "dockforge-dockerhubview";
  private _view?: vscode.WebviewView;
  

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    webviewView.webview.html = this._getHtml(webviewView.webview);

    webviewView.webview.onDidReceiveMessage((data) => {
      switch (data.command) {
        case "signin":
          vscode.commands.executeCommand("dockforge.showDockerHub");
          break;
      }
    });
  }

private _getHtml(webview: vscode.Webview) {
  return /* html */ `
    <!DOCTYPE html>
<html lang="en">
  <body style="
      font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);
      padding: 12px;
      color: var(--vscode-editor-foreground);
      font-size: 13px;
    "
  >

    <!-- Title -->
    <p style="
        margin: 0 0 4px 0;
        font-size: 13px;
        font-weight: 600;
    ">
      Welcome to Docker Hub!
    </p>

    <!-- Description -->
    <p style="
        margin: 0 0 16px 0;
        font-size: 13px;
        color: var(--vscode-descriptionForeground);
        line-height: 1.4;
    ">
      Login to pull and push private images from Docker Hub.
    </p>

    <!-- Sign In Button -->
    <button id="signin-btn" style="
        width: 100%;
        background: #0E639C;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        padding: 4px;
        margin-bottom: 12px;
        font-size: 13px;
        text-align: center;
        height: 28px;
    ">
      Sign In
    </button>

    <!-- Security Tip -->
    <div style="
        margin-top: 6px;
        padding: 12px;
        background: rgba(30, 80, 180, 0.15);
        border: 1px solid rgba(30, 80, 180, 0.4);
        border-radius: 6px;
    ">
      <p style="margin: 0 0 6px 0; font-size: 11px; color: #7db2ff;">
        📌 Security Tip
      </p>
      <p style="margin: 0; font-size: 11px; color: #999999; line-height: 1.4;">
        For better security, create a personal access token in your DockerHub account settings
        and use it instead of your password.
      </p>
    </div>

    <script>
      const vscode = acquireVsCodeApi();

      document.getElementById("signin-btn").addEventListener("click", () => {
        vscode.postMessage({ command: "signin" });
      });
    </script>
  </body>
</html>`;
}
}