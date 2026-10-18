import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./app.css";

// Older/self-hosted LAN contexts may not expose randomUUID. These IDs label
// local lesson records only; relay credentials always come from the server.
if (typeof crypto !== "undefined" && !crypto.randomUUID) {
  Object.defineProperty(crypto, "randomUUID", {
    configurable: true,
    value: () => {
      const bytes = new Uint8Array(16);
      if (crypto.getRandomValues) crypto.getRandomValues(bytes);
      else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      const hex = Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    },
  });
}

const root = document.getElementById("root");
if (root) createRoot(root).render(<React.StrictMode><App /></React.StrictMode>);
