import * as vscode from "vscode";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * Manages Docker Hub authentication using VS Code's SecretStorage API.
 * Credentials are stored securely in the OS keychain.
 */
export class DockerHubAuthManager {
  private static readonly secretUsername = "dockforge.dockerhub.username";
  private static readonly secretToken = "dockforge.dockerhub.token";

  private _onDidChangeAuth = new vscode.EventEmitter<boolean>();
  readonly onDidChangeAuth = this._onDidChangeAuth.event;

  constructor(private readonly secrets: vscode.SecretStorage) {}

  /**
   * Check if user has stored credentials
   */
  async isAuthenticated(): Promise<boolean> {
    const username = await this.secrets.get(DockerHubAuthManager.secretUsername);
    const token = await this.secrets.get(DockerHubAuthManager.secretToken);
    return !!(username && token);
  }

  /**
   * Get stored username
   */
  async getUsername(): Promise<string | undefined> {
    return this.secrets.get(DockerHubAuthManager.secretUsername);
  }

  /**
   * Login to Docker Hub via `docker login` and store credentials securely
   */
  async login(username: string, token: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Use stdin to pass password securely (avoids shell history exposure)
      await new Promise<void>((resolve, reject) => {
        const child = exec(
          `docker login -u ${username} --password-stdin`,
          { timeout: 30000 },
          (error, _stdout, stderr) => {
            if (error) {
              reject(new Error(stderr || error.message));
            } else {
              resolve();
            }
          }
        );
        child.stdin?.write(token);
        child.stdin?.end();
      });

      // Store credentials in VS Code SecretStorage
      await this.secrets.store(DockerHubAuthManager.secretUsername, username);
      await this.secrets.store(DockerHubAuthManager.secretToken, token);
      this._onDidChangeAuth.fire(true);

      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || "Login failed",
      };
    }
  }

  /**
   * Logout from Docker Hub and clear stored credentials
   */
  async logout(): Promise<void> {
    try {
      await execAsync("docker logout", { timeout: 10000 });
    } catch {
      // Ignore logout errors
    }

    await this.secrets.delete(DockerHubAuthManager.secretUsername);
    await this.secrets.delete(DockerHubAuthManager.secretToken);
    this._onDidChangeAuth.fire(false);
  }

  /**
   * Prompt user for Docker Hub credentials via VS Code QuickInput
   */
  async promptLogin(): Promise<boolean> {
    const username = await vscode.window.showInputBox({
      prompt: "Docker Hub Username",
      placeHolder: "Enter your Docker Hub username",
      ignoreFocusOut: true,
    });

    if (!username) {
      return false;
    }

    const token = await vscode.window.showInputBox({
      prompt: "Docker Hub Password or Personal Access Token",
      placeHolder: "Enter password or access token (recommended)",
      password: true,
      ignoreFocusOut: true,
    });

    if (!token) {
      return false;
    }

    const result = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Logging in to Docker Hub...",
        cancellable: false,
      },
      () => this.login(username, token)
    );

    if (result.success) {
      vscode.window.showInformationMessage(`Logged in to Docker Hub as ${username}`);
      return true;
    } else {
      vscode.window.showErrorMessage(`Docker Hub login failed: ${result.error}`);
      return false;
    }
  }

  /**
   * Ensure user is authenticated, prompting login if needed.
   * Returns true if authenticated.
   */
  async ensureAuthenticated(): Promise<boolean> {
    if (await this.isAuthenticated()) {
      return true;
    }
    return this.promptLogin();
  }

  dispose() {
    this._onDidChangeAuth.dispose();
  }
}
