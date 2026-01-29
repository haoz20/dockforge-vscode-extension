import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Debug logging
console.log("[DockForge] index.tsx loaded");
console.log("[DockForge] window.dockforgePage:", window.dockforgePage);
console.log("[DockForge] window.dockerfileId:", (window as any).dockerfileId);
console.log("[DockForge] window.dockerfileName:", (window as any).dockerfileName);

// Error boundary for debugging
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[DockForge] React Error:", error);
    console.error("[DockForge] Error Info:", errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "20px", color: "red" }}>
          <h2>Something went wrong!</h2>
          <pre>{this.state.error?.message}</pre>
          <pre>{this.state.error?.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById("root");
console.log("[DockForge] Root element:", rootElement);

if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
  console.log("[DockForge] React app rendered");
} else {
  console.error("[DockForge] Root element not found!");
}
