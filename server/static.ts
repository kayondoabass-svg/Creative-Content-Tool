import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { injectSEOMeta } from "./seo-meta";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  app.use("/{*path}", (req, res) => {
    const indexPath = path.resolve(distPath, "index.html");
    let html = fs.readFileSync(indexPath, "utf-8");

    const extraInjections = [
      `<meta name="google-site-verification" content="BeOsue0qwqud1SS6hHpRKnVPIcV0IfvHDuUXjLHLi_s" />`,
      `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8935590092792147" crossorigin="anonymous"></script>`,
    ]
      .filter((tag) => !html.includes(tag))
      .join("\n    ");

    if (extraInjections) {
      html = html.replace("</head>", `    ${extraInjections}\n  </head>`);
    }

    html = injectSEOMeta(html, req.originalUrl);

    res.setHeader("Content-Type", "text/html");
    res.send(html);
  });
}
