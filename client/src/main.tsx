import { createRoot } from "react-dom/client";
import { Component, type ReactNode } from "react";
import App from "./App";
import "./index.css";
import "./i18n";

class RootErrorBoundary extends Component<{ children: ReactNode }, { crashed: boolean; error: string }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { crashed: false, error: "" };
  }
  static getDerivedStateFromError(error: Error) {
    return { crashed: true, error: error?.message || "Unknown error" };
  }
  componentDidCatch(error: Error, info: any) {
    console.error("[RootErrorBoundary]", error, info);
  }
  render() {
    if (this.state.crashed) {
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "sans-serif", gap: "12px", padding: "24px", textAlign: "center" }}>
          <img src="/logo.png" alt="BrightBoard" style={{ width: 64, height: 64, borderRadius: 12 }} />
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Something went wrong</h2>
          <p style={{ color: "#666", margin: 0 }}>{this.state.error}</p>
          <button
            onClick={() => { window.location.href = "/"; }}
            style={{ marginTop: 8, padding: "10px 24px", background: "#7c3aed", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 15 }}
          >
            Reload BrightBoard
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <RootErrorBoundary>
    <App />
  </RootErrorBoundary>
);
