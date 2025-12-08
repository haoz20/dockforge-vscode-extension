import React from "react";
import DockerfileBuilder from "./DockerfileBuilder";
import DockerHubBuilder from "./DockerHubBuilder";

declare global {
  interface Window {
    dockforgePage?: "dockforge-home" | "dockerhub-main";
  }
}

function App() {
  const page = window.dockforgePage ?? "dockforge-home";

  switch (page) {
    case "dockerhub-main":
      return <DockerHubBuilder />;

    case "dockforge-home":
    default:
      return <DockerfileBuilder />;
  }
}

export default App;