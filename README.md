# DockForge

A Visual Studio Code extension for building and managing Dockerfiles with a graphical interface.

## Installation

### From Source

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/dockforge-vscode-extension.git
   cd dockforge-vscode-extension
   ```

2. Install dependencies:
   ```bash
   npm run install:all
   ```

3. Build the webview UI:
   ```bash
   npm run build:webview
   ```

4. Compile the extension:
   ```bash
   npm run compile
   ```

5. Open in VS Code and press `F5` to run the extension in development mode

## Usage

### Creating a New Dockerfile

1. Open the DockForge sidebar by clicking the DockForge icon in the Activity Bar
2. Click the **"+ Create New Dockerfile"** button
3. Enter a name for your Dockerfile
4. Use the visual builder to add stages and commands
5. Click **"Insert to Workspace"** to save your Dockerfile

### Opening Existing Dockerfiles

- Click on any Dockerfile in the **"Build Dockerfiles"** tree view to open it in the builder
- The builder will automatically parse and display the Dockerfile structure

### Validation & Hints

The extension provides real-time validation as you build:

- **Warnings**: Critical issues that may prevent your Docker build from working
- **Suggestions**: Best practices and optimization tips

### Building Docker Images

1. Create or open a Dockerfile in the builder
2. Configure build settings (image name, tag, etc.)
3. Click **"Build Image"** to build the Docker image
4. Click **"Build & Run"** to build and run the container

## Commands

- **DockForge: Create New Dockerfile** - Create a new Dockerfile in the sidebar
- **DockForge: Open Dockerfile Builder** - Open the Dockerfile builder panel
- **DockForge: Refresh Dockerfiles** - Refresh the Dockerfile tree view
- **DockForge: Delete Dockerfile** - Delete a Dockerfile from the tree view

## Development

### Project Structure

```
dockforge-vscode-extension/
├── src/                          # Extension source code
│   ├── extension.ts              # Extension entry point
│   ├── panels/                   # Webview panel managers
│   │   ├── DockForgePanel.ts     # Main Dockerfile builder panel
│   │   └── DockerHubPanel.ts     # Docker Hub integration panel
│   ├── DockerfileTreeDataProvider.ts  # Tree view data provider
│   ├── DockerfileTreeItem.ts     # Tree view item model
│   └── utilities/                # Utility functions
└── webview-ui/                   # React frontend
    ├── src/
    │   ├── App.tsx               # Main app component
    │   ├── DockerfileBuilder.tsx # Builder UI
    │   ├── StageCard.tsx         # Stage editor component
    │   ├── CommandDropdown.tsx   # Command type selector
    │   ├── ValidationPanel.tsx   # Validation display
    │   └── utilities/
    │       ├── validations.ts    # Dockerfile validation logic
    │       └── vscode.ts         # VS Code API wrapper
    └── build/                    # Built webview assets
```

### Development Scripts

```bash
# Install all dependencies
npm run install:all

# Start webview development server
npm run start:webview

# Build webview for production
npm run build:webview

# Compile TypeScript extension code
npm run compile

# Watch for TypeScript changes
npm run watch

# Lint code
npm run lint
```

### Building the Extension

To create a `.vsix` package for distribution:

```bash
npm install -g @vscode/vsce
npm run build:webview
npm run compile
vsce package
```

## Technology Stack

- **Extension Host**: TypeScript + VS Code Extension API
- **Webview UI**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS 4
- **Validation**: Custom Dockerfile linting engine

## Validation Rules

DockForge validates Dockerfiles against common best practices:

### Warnings
- Missing base image
- Empty commands
- Invalid port numbers in EXPOSE
- Multiple CMD/ENTRYPOINT instructions
- Deprecated MAINTAINER instruction
- COPY/ADD before WORKDIR

### Suggestions
- Multi-stage build detection
- Naming intermediate stages
- Merging RUN commands to reduce layers
- Using .dockerignore for large COPY contexts
- Using COPY instead of ADD when appropriate

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request