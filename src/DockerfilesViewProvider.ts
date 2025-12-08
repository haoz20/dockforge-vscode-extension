import * as vscode from "vscode";
import { getNonce } from "./utilities/getNonce";

export class DockerfilesViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "dockforge-dockerfilesview";
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
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage((data) => {
      switch (data.command) {
        case "openDockerfile":
          vscode.commands.executeCommand("dockforge.showDockForge", data.project);
          break;
        case "newDockerfile":
          vscode.commands.executeCommand("dockforge.showDockForge");
          break;
      }
    });
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <title>Build Dockerfiles</title>
  <style>
    body {
      padding: 0;
      margin: 0;
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
    }

    .container {
      padding: 8px 0;
    }

    .project-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      cursor: pointer;
      transition: background-color 0.1s;
      user-select: none;
    }

    .project-item:hover {
      background-color: var(--vscode-list-hoverBackground);
    }

    .project-item:active {
      background-color: var(--vscode-list-activeSelectionBackground);
    }

    .icon {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
    }

    .file-icon {
      color: var(--vscode-symbolIcon-fileForeground);
    }

    .add-icon {
      color: var(--vscode-symbolIcon-keywordForeground);
    }

    .project-name {
      font-size: 13px;
    }

    .divider {
      border-top: 1px solid var(--vscode-panel-border);
      margin: 8px 0;
    }

    .new-item {
      margin-top: 4px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="project-item" data-project="web-app">
      <svg class="icon file-icon" viewBox="0 0 16 16" fill="currentColor">
        <path d="M13.5 1h-11l-1 1v12l1 1h11l1-1V2l-1-1zM13 13H3V3h10v10zM5 5h6v1H5V5zm0 2h6v1H5V7zm0 2h6v1H5V9z"/>
      </svg>
      <span class="project-name">web-app</span>
    </div>
    
    <div class="project-item" data-project="project-2">
      <svg class="icon file-icon" viewBox="0 0 16 16" fill="currentColor">
        <path d="M13.5 1h-11l-1 1v12l1 1h11l1-1V2l-1-1zM13 13H3V3h10v10zM5 5h6v1H5V5zm0 2h6v1H5V7zm0 2h6v1H5V9z"/>
      </svg>
      <span class="project-name">project-2</span>
    </div>

    <div class="divider"></div>
    
    <div class="project-item new-item" id="new-dockerfile">
      <svg class="icon add-icon" viewBox="0 0 16 16" fill="currentColor">
        <path d="M14 7v1H8v6H7V8H1V7h6V1h1v6h6z"/>
      </svg>
      <span class="project-name">New Dockerfile</span>
    </div>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    
    // Handle project item clicks
    document.querySelectorAll('.project-item[data-project]').forEach(item => {
      item.addEventListener('click', () => {
        const project = item.getAttribute('data-project');
        vscode.postMessage({
          command: 'openDockerfile',
          project: project
        });
      });
    });
    
    // Handle new Dockerfile click
    document.getElementById('new-dockerfile').addEventListener('click', () => {
      vscode.postMessage({
        command: 'newDockerfile'
      });
    });
  </script>
</body>
</html>`;
  }
}
