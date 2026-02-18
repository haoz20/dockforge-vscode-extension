import * as vscode from "vscode";
import { dockerExec, dockerSpawn } from "./dockerPath";

export interface PushResult {
  success: boolean;
  image: string;
  digest?: string;
  error?: string;
  logs: string[];
}

/**
 * Output channel shared with other Docker operations
 */
let dockerOutputChannel: vscode.OutputChannel | undefined;

function getDockerOutputChannel(): vscode.OutputChannel {
  dockerOutputChannel ??= vscode.window.createOutputChannel("DockForge - Docker");
  return dockerOutputChannel;
}

/**
 * Check whether an image name contains a Docker Hub namespace (username/).
 * Images like "myapp:latest" have no namespace and cannot be pushed.
 * Images like "username/myapp:latest" are properly namespaced.
 */
export function hasNamespace(imageName: string): boolean {
  // Strip tag if present
  const name = imageName.split(":")[0];
  return name.includes("/");
}

/**
 * Tag (rename) a local Docker image.
 *   docker tag <source> <target>
 */
export async function tagImage(
  sourceImage: string,
  targetImage: string
): Promise<void> {
  await dockerExec(`docker tag ${sourceImage} ${targetImage}`);
}

/**
 * Interactive docker tag flow — prompts user for new name + tag.
 * Returns the new full image reference, or undefined if cancelled.
 */
export async function interactiveTag(
  currentName: string,
  currentTag: string
): Promise<{ repository: string; tag: string } | undefined> {
  const newName = await vscode.window.showInputBox({
    prompt: "New image name (include username/ for Docker Hub push)",
    value: currentName,
    placeHolder: "e.g., username/my-app",
    ignoreFocusOut: true,
    validateInput: (v) => {
      if (!v || !v.trim()) {
        return "Image name is required";
      }
      if (!/^[a-z0-9][a-z0-9._/-]*$/.test(v.trim())) {
        return "Must be lowercase and contain only a-z, 0-9, ., -, _, /";
      }
      return null;
    },
  });

  if (!newName) {
    return undefined;
  }

  const newTag = await vscode.window.showInputBox({
    prompt: "Tag",
    value: currentTag,
    placeHolder: "e.g., latest, v1.0.0",
    ignoreFocusOut: true,
  });

  if (newTag === undefined) {
    return undefined;
  }

  const tag = newTag.trim() || "latest";
  const source = `${currentName}:${currentTag}`;
  const target = `${newName.trim()}:${tag}`;

  if (source === target) {
    vscode.window.showInformationMessage("Image already has that name and tag.");
    return undefined;
  }

  try {
    await tagImage(source, target);
    vscode.window.showInformationMessage(`Tagged ${source} → ${target}`);
    return { repository: newName.trim(), tag };
  } catch (err: any) {
    vscode.window.showErrorMessage(`Failed to tag image: ${err.message}`);
    return undefined;
  }
}

/**
 * Push a Docker image to Docker Hub with streaming progress output.
 * The image must already be properly namespaced (username/repo:tag).
 */
export async function pushImageToHub(
  fullImage: string,
  onOutput?: (line: string) => void
): Promise<PushResult> {
  const output = getDockerOutputChannel();
  const logs: string[] = [];

  output.appendLine(`\n🚀 Pushing ${fullImage}`);
  output.show(true);

  return new Promise<PushResult>((resolve) => {
    const child = dockerSpawn(["push", fullImage]);

    let digest: string | undefined;

    const handleLine = (line: string) => {
      if (!line.trim()) {
        return;
      }
      logs.push(line);
      output.appendLine(line);
      onOutput?.(line);

      const digestMatch = line.match(/digest:\s*(sha256:[a-f0-9]+)/i);
      if (digestMatch) {
        digest = digestMatch[1];
      }
    };

    child.stdout?.on("data", (data: Buffer) => {
      data.toString().split("\n").forEach(handleLine);
    });

    child.stderr?.on("data", (data: Buffer) => {
      data.toString().split("\n").forEach(handleLine);
    });

    child.on("close", (code) => {
      if (code === 0) {
        const msg = `✅ Successfully pushed ${fullImage}`;
        output.appendLine(msg);
        onOutput?.(msg);
        resolve({ success: true, image: fullImage, digest, logs });
      } else {
        const msg = `Push failed with exit code ${code}`;
        output.appendLine(`❌ ${msg}`);
        onOutput?.(msg);
        resolve({ success: false, image: fullImage, error: logs.join("\n") || msg, logs });
      }
    });

    child.on("error", (err) => {
      const msg = `Failed to start docker push: ${err.message}`;
      output.appendLine(`❌ ${msg}`);
      resolve({ success: false, image: fullImage, error: msg, logs });
    });
  });
}

/**
 * Interactive push flow.
 * Validates the image has a namespace (username/). If not, shows a warning
 * and offers to tag it first.
 */
export async function interactivePush(
  imageName: string,
  imageTag: string
): Promise<PushResult | undefined> {
  const fullImage = `${imageName}:${imageTag}`;

  // ── Guard: image must have a namespace (username/) ──
  if (!hasNamespace(imageName)) {
    const action = await vscode.window.showWarningMessage(
      `"${fullImage}" cannot be pushed to Docker Hub because it has no username namespace.\n\nUse "Tag / Rename Image" first to add your username (e.g., username/${imageName}:${imageTag}).`,
      { modal: true },
      "Tag Image Now"
    );

    if (action === "Tag Image Now") {
      const result = await interactiveTag(imageName, imageTag);
      if (!result) {
        return undefined;
      }
      // Re-check after tagging
      if (!hasNamespace(result.repository)) {
        vscode.window.showWarningMessage("Image still has no namespace. Push cancelled.");
        return undefined;
      }
      // Continue with the newly tagged image
      return interactivePush(result.repository, result.tag);
    }

    return undefined;
  }

  // ── Confirm push ──
  const confirm = await vscode.window.showInformationMessage(
    `Push ${fullImage} to Docker Hub?`,
    { modal: true },
    "Push"
  );

  if (confirm !== "Push") {
    return undefined;
  }

  // ── Push with progress ──
  const pushResult = await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Pushing ${fullImage}...`,
      cancellable: false,
    },
    () => pushImageToHub(fullImage)
  );

  if (pushResult.success) {
    const namespace = imageName.split("/")[0];
    const repo = imageName.split("/").slice(1).join("/");
    const viewAction = await vscode.window.showInformationMessage(
      `Successfully pushed ${fullImage}`,
      "View on Docker Hub"
    );
    if (viewAction === "View on Docker Hub") {
      vscode.env.openExternal(
        vscode.Uri.parse(`https://hub.docker.com/r/${namespace}/${repo}`)
      );
    }
  } else {
    vscode.window.showErrorMessage(`Push failed: ${pushResult.error}`);
  }

  return pushResult;
}
