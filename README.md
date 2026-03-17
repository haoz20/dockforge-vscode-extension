<div align="center">
  <img src="assets/logo.png" alt="DockForge Logo" width="128" height="128">
  
  # DockForge
  
  **A powerful, visual Dockerfile builder and management extension for Visual Studio Code.**

  [![GitHub stars](https://img.shields.io/github/stars/haoz20/dockforge-vscode-extension?style=flat-square)](https://github.com/haoz20/dockforge-vscode-extension/stargazers)
  [![Views](https://hits.seeyoufarm.com/api/count/incr/badge.svg?url=https%3A%2F%2Fgithub.com%2Fhaoz20%2Fdockforge-vscode-extension&count_bg=%230066CC&title_bg=%23555555&icon=&icon_color=%23E7E7E7&title=views&edge_flat=true)](https://github.com/haoz20/dockforge-vscode-extension)

</div>

---

**DockForge** bridges the gap between writing complex Dockerfiles and managing local containers. It provides a rich graphical interface (GUI) directly inside VS Code to build, validate, manage, and push Docker images—all without needing to memorize Docker CLI syntax.

## Key Features

* **Visual Dockerfile Builder:** Create multi-stage Dockerfiles using a modern React-based drag-and-drop interface.
* **Real-Time Validation & Linting:** Catch errors before you build. Get instant warnings for missing base images, misconfigured ports, and suggestions for best practices (e.g., merging `RUN` commands).
* **Docker Hub Integration:** Log in, search repositories, fetch tags, and push images directly to Docker Hub from the sidebar.
* **Local Image Management:** View, run, tag, and delete local Docker images through an intuitive Tree View.
* **One-Click Build & Run:** Build your custom image and spin up a container with a single click.

## Prerequisites

Before using DockForge, ensure you have the following installed:
* [Visual Studio Code](https://code.visualstudio.com/) (v1.75.0 or higher)
* [Docker Desktop](https://www.docker.com/products/docker-desktop/) (must be running to build and run images)

## Quick Start

### 1. Creating a New Dockerfile
1. Open the DockForge sidebar by clicking the **stack logo** in the VS Code Activity Bar.
2. Click **"+ Create New Dockerfile"** in the *Build Dockerfiles* panel.
3. Name your file and use the visual builder to add stages and commands (`FROM`, `RUN`, `COPY`, etc.).
4. Click **"Insert to Workspace"** to save the generated `Dockerfile` to your project.

### 2. Building & Running Images
1. Open an existing Dockerfile in the DockForge Builder.
2. In the "Build Image" section, configure your image name and tag.
3. Click **"Build Image"** to compile.
4. Navigate to the **"Docker Images"** tree view, right-click your new image, and select **"Run Container"**.

## Extension Commands

Access these commands via the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`):

| Command | Description |
| :--- | :--- |
| `DockForge: Create New Dockerfile` | Create a new Dockerfile using the visual builder. |
| `DockForge: Open Dockerfile Builder` | Open the visual builder for an existing Dockerfile. |
| `DockForge: Refresh Dockerfiles` | Refresh the workspace Dockerfiles tree view. |
| `DockForge: Docker Hub Login` | Authenticate securely with Docker Hub. |
| `Push to Docker Hub` | Push a local image to your Docker Hub repository. |
| `Run Container` | Spin up a container from a selected image. |
| `Tag / Rename Image` | Add a new tag or rename a local Docker image. |

## Validation Engine

DockForge features a custom linting engine that evaluates your Dockerfiles against industry best practices:

* **Warnings (Critical Issues):** Detects missing base images, empty commands, invalid port numbers in `EXPOSE`, multiple `CMD`/`ENTRYPOINT` instructions, and `COPY`/`ADD` calls before `WORKDIR`.
* **Suggestions (Optimizations):** Recommends naming intermediate stages, merging sequential `RUN` commands to reduce layer count, and using `COPY` over `ADD`.

## Development Setup

Want to contribute or hack on DockForge locally? 

### Project Architecture
DockForge is split into two main environments:
* `src/`: The VS Code Extension Host (TypeScript). Handles Docker CLI execution, file system operations, and tree views.
* `webview-ui/`: The Frontend UI (React 18, Vite, Tailwind CSS). Handles the visual builder and Docker Hub dashboard.

### Getting Started

1. **Clone the repository:**
   ```bash
   git clone https://github.com/haoz20/dockforge-vscode-extension.git
   cd dockforge-vscode-extension