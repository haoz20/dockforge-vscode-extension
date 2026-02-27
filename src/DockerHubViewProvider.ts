import * as vscode from "vscode";
import { DockerHubAuthManager } from "./utilities/dockerHubAuth";

export class DockerHubViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "dockforge-dockerhubview";
  private _view?: vscode.WebviewView;
  private _authManager?: DockerHubAuthManager;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  /** Inject the auth manager so the sidebar can react to auth state */
  public setAuthManager(authManager: DockerHubAuthManager) {
    this._authManager = authManager;
    authManager.onDidChangeAuth(() => this._updateView());
  }

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

    this._updateView();

    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.command) {
        case "signin":
          vscode.commands.executeCommand("dockforge.dockerHubLogin");
          break;
        case "logout":
          vscode.commands.executeCommand("dockforge.dockerHubLogout");
          break;
        case "push":
          vscode.commands.executeCommand("dockforge.pushImage");
          break;
      }
    });
  }

  /** Re-render the sidebar based on current auth state */
  private async _updateView() {
    if (!this._view) {
      return;
    }
    const isLoggedIn = this._authManager ? await this._authManager.isAuthenticated() : false;
    const username = isLoggedIn ? await this._authManager!.getUsername() : undefined;
    this._view.webview.html = isLoggedIn
      ? this._getLoggedInHtml(username || "")
      : this._getLoggedOutHtml();
  }

private _getLoggedOutHtml() {
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

private _getLoggedInHtml(username: string) {
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

    <!-- Logged-in status -->
    <div style="
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0 0 12px 0;
    ">
      <span style="
          display: inline-block;
          width: 8px; height: 8px;
          border-radius: 50%;
          background: #3fb950;
      "></span>
      <span style="font-weight: 600; font-size: 13px;">
        Logged in as ${username}
      </span>
    </div>

    <!-- Push Image Button -->
    <button id="push-btn" style="
        width: 100%;
        background: #0E639C;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        padding: 4px;
        margin-bottom: 8px;
        font-size: 13px;
        text-align: center;
        height: 28px;
    ">
      Push Image to Docker Hub
    </button>

    <!-- Browse Docker Hub via panel -->
    <button id="browse-btn" style="
        width: 100%;
        background: transparent;
        color: var(--vscode-editor-foreground);
        border: 1px solid var(--vscode-input-border, #444);
        border-radius: 4px;
        cursor: pointer;
        padding: 4px;
        margin-bottom: 8px;
        font-size: 13px;
        text-align: center;
        height: 28px;
    ">
      Browse Docker Hub
    </button>

    <!-- Logout Button -->
    <button id="logout-btn" style="
        width: 100%;
        background: transparent;
        color: var(--vscode-descriptionForeground);
        border: 1px solid var(--vscode-input-border, #444);
        border-radius: 4px;
        cursor: pointer;
        padding: 4px;
        font-size: 12px;
        text-align: center;
        height: 28px;
    ">
      Logout
    </button>

    <script>
      const vscode = acquireVsCodeApi();

      document.getElementById("push-btn").addEventListener("click", () => {
        vscode.postMessage({ command: "push" });
      });
      document.getElementById("browse-btn").addEventListener("click", () => {
        vscode.postMessage({ command: "signin" });
      });
      document.getElementById("logout-btn").addEventListener("click", () => {
        vscode.postMessage({ command: "logout" });
      });
    </script>
  </body>
</html>`;
}
}