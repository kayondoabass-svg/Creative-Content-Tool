import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  // Inject Google verification meta tag and AdSense script directly so they
  // are always present in production regardless of build caching.
  app.use("/{*path}", (_req, res) => {
    const indexPath = path.resolve(distPath, "index.html");
    let html = fs.readFileSync(indexPath, "utf-8");

    const injections = [
      `<meta name="google-site-verification" content="BeOsue0qwqud1SS6hHpRKnVPIcV0IfvHDuUXjLHLi_s" />`,
      `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8935590092792147" crossorigin="anonymous"></script>`,
    ]
      .filter((tag) => !html.includes(tag))
      .join("\n    ");

    if (injections) {
      html = html.replace("</head>", `    ${injections}\n  </head>`);
    }

    res.setHeader("Content-Type", "text/html");
    res.send(html);
  });
}
